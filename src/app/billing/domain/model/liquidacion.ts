export interface LiquidacionDetalle {
  readonly idCompra: number;
  readonly diasFinanciamiento: number;
  readonly capital: number;
  readonly interesCompensatorio: number;
  readonly totalLinea: number;
}

/** Listado de pago generado en la fecha de corte (modalidad fin de mes). */
export interface Liquidacion {
  readonly id: number;
  readonly idCliente: number;
  readonly idCondicion: number;
  readonly fechaCorte: string;
  readonly fechaVencimiento: string;
  readonly capitalTotal: number;
  readonly interesCompensatorioTotal: number;
  readonly totalExigible: number;
  readonly estado: 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA';
  readonly fechaGeneracion: string;
  readonly detalle: LiquidacionDetalle[];
}
