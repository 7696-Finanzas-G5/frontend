/**
 * Servicio de dominio: listado de pago en la fecha de corte, mora e imputación del pago.
 */
import { compareIso } from '../../../shared/domain/finance/dates';
import {
  Imputacion,
  LiquidacionFinDeMes,
  ResultadoMora,
  calcularMora,
  fechaCorteDeCiclo,
  imputarPago,
  liquidarFinDeMes,
} from '../../../shared/domain/finance/financial-math';

export interface CompraLiquidable {
  id: number;
  descripcion: string;
  fechaCompra: string;
  capital: number;
  fechaPago: string;
}

export interface TasasCiclo {
  tedCompensatoria: number;
  tedMoratoria: number;
  diaCorte: number;
}

export interface EstadoCiclo {
  fechaCorte: string;
  fechaPago: string;
  fechaEfectiva: string;
  liquidacion: LiquidacionFinDeMes;
  mora: ResultadoMora;
}

/** Fechas de pago (ciclos) que tienen compras pendientes, en orden cronológico. */
export function ciclosPendientes(compras: Pick<CompraLiquidable, 'fechaPago'>[]): string[] {
  return [...new Set(compras.map((c) => c.fechaPago))].sort(compareIso);
}

export function construirEstadoCiclo(compras: CompraLiquidable[], tasas: TasasCiclo, fechaPago: string, fechaEfectiva: string): EstadoCiclo | null {
  const delCiclo = compras.filter((c) => c.fechaPago === fechaPago);
  if (!delCiclo.length) return null;
  const liquidacion = liquidarFinDeMes(delCiclo, tasas.tedCompensatoria, fechaPago);
  const mora = calcularMora(liquidacion.totalExigible, tasas.tedMoratoria, fechaPago, fechaEfectiva);
  return { fechaCorte: fechaCorteDeCiclo(fechaPago, tasas.diaCorte), fechaPago, fechaEfectiva, liquidacion, mora };
}

/** Prelación: mora → interés compensatorio → capital. Lanza error ante pagos parciales. */
export function imputarPagoCiclo(monto: number, estado: EstadoCiclo): Imputacion {
  return imputarPago(monto, estado.mora.interesMoratorio, estado.liquidacion.interesTotal, estado.mora.totalExigible);
}
