import { NewEntity } from '../../../shared/domain/repository';
import { CronogramaFrances } from '../../../shared/domain/finance/financial-math';

export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

/** Cuota del cronograma francés (pertenece al agregado Compra). */
export interface Cuota {
  readonly id: number;
  readonly idCompra: number;
  readonly numeroCuota: number;
  readonly fechaVencimiento: string;
  readonly saldoInicial: number;
  readonly interesPeriodo: number;
  readonly amortizacion: number;
  readonly montoCuota: number;
  readonly saldoFinal: number;
  readonly estado: EstadoCuota;
}

export const estaPendiente = (q: Pick<Cuota, 'estado'>) => q.estado === 'PENDIENTE' || q.estado === 'VENCIDA';

export function cuotasDesdeCronograma(idCompra: number, c: CronogramaFrances): NewEntity<Cuota>[] {
  return c.filas.map((f) => ({
    idCompra,
    numeroCuota: f.k,
    fechaVencimiento: f.fecha,
    saldoInicial: f.saldoInicial,
    interesPeriodo: f.interes,
    amortizacion: f.amortizacion,
    montoCuota: f.cuota,
    saldoFinal: f.saldoFinal,
    estado: 'PENDIENTE',
  }));
}
