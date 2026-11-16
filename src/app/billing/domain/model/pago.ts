/** Pago total único (no se admiten pagos parciales), imputado por prelación. */
export interface Pago {
  readonly id: number;
  readonly idCliente: number;
  readonly idLiquidacion: number | null;
  readonly idCuota: number | null;
  readonly idUsuarioRegistro: number | null;
  readonly fechaHoraPago: string;
  readonly diasMora: number;
  readonly capitalPagado: number;
  readonly interesCompensatorioPagado: number;
  readonly interesMoratorioPagado: number;
  readonly montoTotalPagado: number;
  readonly estado: 'REGISTRADO' | 'ANULADO';
  readonly fechaRegistro: string;
}
