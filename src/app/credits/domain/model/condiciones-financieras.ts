import { Moneda } from '../../../shared/domain/common';
import { ModalidadPermitida } from '../../../shared/domain/finance/financial-math';

/**
 * Vista que el contexto de Créditos necesita de la línea de crédito del cliente.
 * Se construye desde el contexto Customers mediante la capa anticorrupción.
 */
export interface CondicionesFinancieras {
  readonly idCondicion: number;
  readonly moneda: Moneda;
  readonly limiteCredito: number;
  readonly plazoMaxMeses: number;
  readonly diaCorte: number;
  readonly diaPago: number;
  readonly tedCompensatoria: number;
  readonly tedMoratoria: number;
  readonly tasaCompensatoriaLabel: string;
  readonly tasaMoratoriaLabel: string;
}

/** Vista del producto que se ofrece al crédito (traducida desde el contexto Catalog). */
export interface ProductoOfertado {
  readonly id: number;
  readonly descripcion: string;
  readonly precioCredito: number;
  readonly modalidadPermitida: ModalidadPermitida;
  readonly activo: boolean;
}
