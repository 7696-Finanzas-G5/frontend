import { Injectable, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { AuthService } from '../../iam/application/auth.service';
import { DomainError } from '../../shared/domain/domain-error';
import { compareIso, nowIsoMinutes } from '../../shared/domain/finance/dates';
import { Compra, descripcionCompra } from '../domain/model/compra';
import { CondicionesFinancieras } from '../domain/model/condiciones-financieras';
import { Cuota, cuotasDesdeCronograma, estaPendiente } from '../domain/model/cuota';
import { CompraRepository } from '../domain/repositories/compra.repository';
import { CuotaRepository } from '../domain/repositories/cuota.repository';
import { SimulacionCompra, SolicitudCompra, calcularDeudaVigente, creditoDisponible, simularCompra } from '../domain/services/originacion-credito';
import { CreditContextAdapter } from './acl/credit-context.adapter';

export interface CuotaPendiente {
  cuota: Cuota;
  compra: Compra;
  descripcion: string;
  /** Solo la cuota más antigua de cada compra puede pagarse. */
  pagable: boolean;
}

/** Casos de uso: registro de compras al crédito, deuda vigente y crédito disponible. */
@Injectable({ providedIn: 'root' })
export class CreditosService {
  private readonly compras = inject(CompraRepository);
  private readonly cuotas = inject(CuotaRepository);
  private readonly acl = inject(CreditContextAdapter);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);

  readonly todasLasCompras = this.compras.all;
  readonly todasLasCuotas = this.cuotas.all;

  condicionesVigentes(idCliente: number): CondicionesFinancieras | undefined {
    return this.acl.condicionesVigentes(idCliente);
  }

  /** Condiciones con las que se pactó la compra (no necesariamente las vigentes). */
  condicionesDeCompra(compra: Compra): CondicionesFinancieras {
    const c = this.acl.condicionesPorId(compra.idCondicion) ?? this.acl.condicionesVigentes(compra.idCliente);
    if (!c) throw new DomainError('La compra no tiene condiciones de crédito asociadas.');
    return c;
  }

  deudaVigente(idCliente: number): number {
    const compras = this.compras.findByCliente(idCliente);
    return calcularDeudaVigente(compras, this.cuotas.all());
  }

  disponible(idCliente: number): number {
    const cond = this.acl.condicionesVigentes(idCliente);
    return cond ? creditoDisponible(cond.limiteCredito, this.deudaVigente(idCliente)) : 0;
  }

  simular(sol: SolicitudCompra): SimulacionCompra | null {
    const cond = this.acl.condicionesVigentes(sol.idCliente);
    const producto = this.acl.producto(sol.idProducto);
    if (!cond || !producto || !sol.fechaHoraCompra) return null;
    return simularCompra(sol, producto, cond, this.disponible(sol.idCliente));
  }

  registrarCompra(sol: SolicitudCompra): Compra {
    const sim = this.simular(sol);
    if (!sim) throw new DomainError('Datos de compra incompletos.');
    if (sim.errores.length) throw new DomainError(sim.errores.join(' '));
    const cond = this.acl.condicionesVigentes(sol.idCliente)!;
    const producto = this.acl.producto(sol.idProducto)!;

    const compra = this.compras.add({
      idCliente: sol.idCliente,
      idCondicion: cond.idCondicion,
      fechaHoraCompra: sol.fechaHoraCompra,
      modalidad: sol.modalidad,
      numeroCuotas: sol.modalidad === 'CUOTAS' ? sol.n : null,
      estado: 'REGISTRADA',
      fechaRegistro: nowIsoMinutes(),
      capital: sim.monto,
      fechaPago: sim.fechaPago,
      detalle: [{ idProducto: producto.id, descripcionItem: producto.descripcion, cantidad: sol.cantidad, precioUnitarioCredito: producto.precioCredito, subtotal: sim.monto }],
    });
    if (sim.cronograma) {
      for (const q of cuotasDesdeCronograma(compra.id, sim.cronograma)) this.cuotas.add(q);
    }
    this.audit.registrar(this.auth.userIdValue(), 'REGISTRAR_COMPRA', 'compra', compra.id, `${producto.descripcion} · ${sol.modalidad} · ${sim.monto.toFixed(2)}`);
    return compra;
  }

  // ---- Consultas y comandos usados por el contexto Billing ----

  comprasFinDeMesPendientes(idCliente: number): Compra[] {
    return this.compras.findByCliente(idCliente).filter((c) => c.modalidad === 'FIN_MES' && c.estado === 'REGISTRADA');
  }

  cuotasPendientes(idCliente: number): CuotaPendiente[] {
    this.cuotas.all();
    const result: CuotaPendiente[] = [];
    for (const compra of this.compras.findByCliente(idCliente).filter((c) => c.modalidad === 'CUOTAS' && c.estado === 'REGISTRADA')) {
      this.cuotas
        .findByCompra(compra.id)
        .filter(estaPendiente)
        .forEach((cuota, i) => result.push({ cuota, compra, descripcion: descripcionCompra(compra), pagable: i === 0 }));
    }
    return result.sort((a, b) => compareIso(a.cuota.fechaVencimiento, b.cuota.fechaVencimiento));
  }

  findCuota(id: number): Cuota | undefined {
    return this.cuotas.findById(id);
  }

  findCompra(id: number): Compra | undefined {
    return this.compras.findById(id);
  }

  cancelarCompras(ids: number[]): void {
    for (const id of ids) this.compras.update(id, { estado: 'CANCELADA' });
  }

  /** Marca la cuota como pagada; exige pagar en orden y cancela la compra al pagar la última. */
  marcarCuotaPagada(idCuota: number): void {
    const cuota = this.cuotas.findById(idCuota);
    if (!cuota || !estaPendiente(cuota)) throw new DomainError('La cuota no está pendiente.');
    const delaCompra = this.cuotas.findByCompra(cuota.idCompra);
    if (delaCompra.some((q) => q.numeroCuota < cuota.numeroCuota && estaPendiente(q))) {
      throw new DomainError('Debe pagar primero las cuotas anteriores.');
    }
    this.cuotas.update(cuota.id, { estado: 'PAGADA' });
    if (!delaCompra.some((q) => q.id !== cuota.id && estaPendiente(q))) {
      this.compras.update(cuota.idCompra, { estado: 'CANCELADA' });
    }
  }
}
