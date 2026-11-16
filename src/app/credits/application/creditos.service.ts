import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../iam/application/auth.service';
import { ClientesService } from '../../customers/application/clientes.service';
import { DomainError } from '../../shared/domain/domain-error';
import { Compra } from '../domain/model/compra';
import { CondicionesFinancieras } from '../domain/model/condiciones-financieras';
import { SimulacionCompra, SolicitudCompra, simularCompra } from '../domain/services/originacion-credito';
import { CreditosApi } from '../infrastructure/creditos.api';
import { CreditContextAdapter } from './acl/credit-context.adapter';

/**
 * Casos de uso: simulación y registro de compras al crédito, deuda vigente y crédito disponible.
 *
 * La simulación se calcula en el navegador con el mismo modelo matemático del backend (vista previa
 * inmediata); el registro lo valida y persiste el backend, que es la fuente de verdad.
 */
@Injectable({ providedIn: 'root' })
export class CreditosService {
  private readonly api = inject(CreditosApi);
  private readonly acl = inject(CreditContextAdapter);
  private readonly clientes = inject(ClientesService);
  private readonly auth = inject(AuthService);
  private readonly _compras = signal<Compra[]>([]);

  /** Compras recientes de la tienda en sesión. */
  readonly todasLasCompras = this._compras.asReadonly();

  constructor() {
    effect(() => {
      const rol = this.auth.rol();
      untracked(() => (rol === 'ADMIN_NEGOCIO' ? this.load().catch(() => undefined) : this._compras.set([])));
    });
  }

  async load(): Promise<void> {
    this._compras.set(await this.api.recientes(20));
  }

  condicionesVigentes(idCliente: number): CondicionesFinancieras | undefined {
    return this.acl.condicionesVigentes(idCliente);
  }

  /** Deuda vigente calculada por el backend. */
  deudaVigente(idCliente: number): number {
    return this.clientes.findById(idCliente)?.deudaVigente ?? 0;
  }

  /** Crédito disponible calculado por el backend. */
  disponible(idCliente: number): number {
    return this.clientes.findById(idCliente)?.disponible ?? 0;
  }

  simular(sol: SolicitudCompra): SimulacionCompra | null {
    const cond = this.acl.condicionesVigentes(sol.idCliente);
    const producto = this.acl.producto(sol.idProducto);
    if (!cond || !producto || !sol.fechaHoraCompra) return null;
    return simularCompra(sol, producto, cond, this.disponible(sol.idCliente));
  }

  async registrarCompra(sol: SolicitudCompra): Promise<Compra> {
    const sim = this.simular(sol);
    if (!sim) throw new DomainError('Datos de compra incompletos.');
    if (sim.errores.length) throw new DomainError(sim.errores.join(' '));
    const compra = await this.api.registrar({
      idCliente: sol.idCliente,
      idProducto: sol.idProducto,
      cantidad: sol.cantidad,
      fechaHoraCompra: sol.fechaHoraCompra,
      modalidad: sol.modalidad,
      n: sol.modalidad === 'CUOTAS' ? sol.n : null,
    });
    await Promise.all([this.clientes.refresh(sol.idCliente), this.load()]);
    return compra;
  }
}
