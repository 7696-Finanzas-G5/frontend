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
