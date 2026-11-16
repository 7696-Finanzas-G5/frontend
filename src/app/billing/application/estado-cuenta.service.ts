import { Injectable, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { CreditosService, CuotaPendiente } from '../../credits/application/creditos.service';
import { descripcionCompra } from '../../credits/domain/model/compra';
import { CondicionesFinancieras } from '../../credits/domain/model/condiciones-financieras';
import { AuthService } from '../../iam/application/auth.service';
import { DomainError } from '../../shared/domain/domain-error';
import { nowIsoMinutes } from '../../shared/domain/finance/dates';
import { Imputacion, ResultadoMora, calcularMora, imputarPago } from '../../shared/domain/finance/financial-math';
import { Pago } from '../domain/model/pago';
import { LiquidacionRepository } from '../domain/repositories/liquidacion.repository';
import { PagoRepository } from '../domain/repositories/pago.repository';
import { CompraLiquidable, EstadoCiclo, ciclosPendientes, construirEstadoCiclo, imputarPagoCiclo } from '../domain/services/liquidacion-ciclo';

export interface EstadoCicloView extends EstadoCiclo {
  condiciones: CondicionesFinancieras;
}

export interface CuotaConMora extends CuotaPendiente {
  mora: ResultadoMora;
}

export interface ResultadoPago {
  pago: Pago;
  imputacion: Imputacion;
}

/** Casos de uso: estado de cuenta al corte, liquidación con mora y registro de pagos. */
@Injectable({ providedIn: 'root' })
export class EstadoCuentaService {
  private readonly creditos = inject(CreditosService);
  private readonly liquidaciones = inject(LiquidacionRepository);
  private readonly pagos = inject(PagoRepository);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);

  readonly todosLosPagos = this.pagos.all;

  ciclosPendientes(idCliente: number): string[] {
    return ciclosPendientes(this.creditos.comprasFinDeMesPendientes(idCliente));
  }

  estadoCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string): EstadoCicloView | null {
    const compras = this.creditos.comprasFinDeMesPendientes(idCliente).filter((c) => c.fechaPago === fechaPago);
    if (!compras.length) return null;
    const condiciones = this.creditos.condicionesDeCompra(compras[0]);
    const liquidables: CompraLiquidable[] = compras.map((c) => ({
      id: c.id,
      descripcion: descripcionCompra(c),
      fechaCompra: c.fechaHoraCompra,
      capital: c.capital,
      fechaPago: c.fechaPago,
    }));
    const estado = construirEstadoCiclo(liquidables, condiciones, fechaPago, fechaEfectiva);
    return estado ? { ...estado, condiciones } : null;
  }

  pagarCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string, monto: number): ResultadoPago {
    const e = this.estadoCiclo(idCliente, fechaPago, fechaEfectiva);
    if (!e) throw new DomainError('No hay compras pendientes para este ciclo.');
    const imputacion = imputarPagoCiclo(monto, e);

    const liq = this.liquidaciones.add({
      idCliente,
      idCondicion: e.condiciones.idCondicion,
      fechaCorte: e.fechaCorte,
      fechaVencimiento: fechaPago,
      capitalTotal: e.liquidacion.capitalTotal,
      interesCompensatorioTotal: e.liquidacion.interesTotal,
      totalExigible: e.liquidacion.totalExigible,
      estado: 'PAGADA',
      fechaGeneracion: nowIsoMinutes(),
      detalle: e.liquidacion.lineas.map((l) => ({
        idCompra: l.id!,
        diasFinanciamiento: l.dias,
        capital: l.capital,
        interesCompensatorio: l.interes,
        totalLinea: l.total,
      })),
    });
    const pago = this.registrarPago(idCliente, liq.id, null, fechaEfectiva, e.mora.diasMora, imputacion);
    this.creditos.cancelarCompras(e.liquidacion.lineas.map((l) => l.id!));
    this.audit.registrar(this.auth.userIdValue(), 'REGISTRAR_PAGO', 'liquidacion', liq.id, `Total ${imputacion.total.toFixed(2)} (mora ${imputacion.mora.toFixed(2)})`);
    return { pago, imputacion };
  }

  /** Cuotas pendientes con la mora que tendrían si se pagan en `fechaEfectiva`. */
  cuotasPendientes(idCliente: number, fechaEfectiva: string): CuotaConMora[] {
    return this.creditos.cuotasPendientes(idCliente).map((p) => ({ ...p, mora: this.moraCuota(p, fechaEfectiva) }));
  }

  pagarCuota(idCuota: number, fechaEfectiva: string, monto: number): ResultadoPago {
    const cuota = this.creditos.findCuota(idCuota);
    const compra = cuota ? this.creditos.findCompra(cuota.idCompra) : undefined;
    const pendiente = compra ? this.creditos.cuotasPendientes(compra.idCliente).find((p) => p.cuota.id === idCuota) : undefined;
    if (!pendiente) throw new DomainError('La cuota no está pendiente.');
    const mora = this.moraCuota(pendiente, fechaEfectiva);
    const imputacion = imputarPago(monto, mora.interesMoratorio, pendiente.cuota.interesPeriodo, mora.totalExigible);
    this.creditos.marcarCuotaPagada(idCuota);
    const pago = this.registrarPago(pendiente.compra.idCliente, null, idCuota, this.fechaPagoCuota(pendiente, fechaEfectiva), mora.diasMora, imputacion);
    this.audit.registrar(this.auth.userIdValue(), 'REGISTRAR_PAGO', 'cuota', idCuota, `Cuota ${pendiente.cuota.numeroCuota} · ${imputacion.total.toFixed(2)}`);
    return { pago, imputacion };
  }

  pagosDe(idCliente: number): Pago[] {
    return this.pagos.findByCliente(idCliente);
  }

  /** Si se paga antes del vencimiento no hay mora: se toma la fecha de vencimiento. */
  fechaPagoCuota(p: CuotaPendiente, fechaEfectiva: string): string {
    return fechaEfectiva > p.cuota.fechaVencimiento ? fechaEfectiva : p.cuota.fechaVencimiento;
  }

  private moraCuota(p: CuotaPendiente, fechaEfectiva: string): ResultadoMora {
    const cond = this.creditos.condicionesDeCompra(p.compra);
    return calcularMora(p.cuota.montoCuota, cond.tedMoratoria, p.cuota.fechaVencimiento, this.fechaPagoCuota(p, fechaEfectiva));
  }

  private registrarPago(idCliente: number, idLiquidacion: number | null, idCuota: number | null, fecha: string, diasMora: number, imp: Imputacion): Pago {
    return this.pagos.add({
      idCliente,
      idLiquidacion,
      idCuota,
      idUsuarioRegistro: this.auth.userIdValue(),
      fechaHoraPago: fecha,
      diasMora,
      capitalPagado: imp.capital,
      interesCompensatorioPagado: imp.compensatorio,
      interesMoratorioPagado: imp.mora,
      montoTotalPagado: imp.total,
      estado: 'REGISTRADO',
      fechaRegistro: nowIsoMinutes(),
    });
  }
}
