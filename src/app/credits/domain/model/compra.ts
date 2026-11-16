import { ModalidadCompra } from '../../../shared/domain/finance/financial-math';

export type EstadoCompra = 'REGISTRADA' | 'CANCELADA' | 'ANULADA';

export interface DetalleCompra {
  readonly idProducto: number;
  readonly descripcionItem: string;
  readonly cantidad: number;
  readonly precioUnitarioCredito: number;
  readonly subtotal: number;
}

/** Aggregate root: operación de venta al crédito. */
export interface Compra {
  readonly id: number;
  readonly idCliente: number;
  /** Versión de la condición de crédito con la que se pactó la compra. */
  readonly idCondicion: number;
  readonly fechaHoraCompra: string;
  readonly modalidad: ModalidadCompra;
  readonly numeroCuotas: number | null;
  readonly estado: EstadoCompra;
  readonly fechaRegistro: string;
  readonly detalle: DetalleCompra[];
  /** Capital financiado (VA = Σ subtotales a precio de lista). */
  readonly capital: number;
  /** Fin de mes: fecha de pago del ciclo. Cuotas: fin del período de gracia total. */
  readonly fechaPago: string;
}

export const descripcionCompra = (c: Pick<Compra, 'detalle'>) =>
  c.detalle.map((d) => `${d.descripcionItem}${d.cantidad > 1 ? ' x' + d.cantidad : ''}`).join(', ');
