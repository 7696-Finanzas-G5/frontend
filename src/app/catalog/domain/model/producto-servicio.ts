import { EstadoActivo } from '../../../shared/domain/common';
import { ensure } from '../../../shared/domain/domain-error';
import { ModalidadCompra, ModalidadPermitida, round2 } from '../../../shared/domain/finance/financial-math';

export type TipoItem = 'PRODUCTO' | 'SERVICIO';

export const UNIDADES_MEDIDA = ['Unidad', 'Kg', 'Litro', 'Docena', 'Bolsa', 'Pack x 6 unidades', 'Pack x 12 unidades', 'Caja x 12', 'Pack', 'Servicio'];

export const MODALIDADES: { value: ModalidadPermitida; label: string }[] = [
  { value: 'FIN_MES', label: 'Un solo pago a fin de mes (Fecha de corte)' },
  { value: 'CUOTAS', label: 'Pago en meses (Método Francés)' },
  { value: 'AMBAS', label: 'Ambas modalidades' },
];

export const modalidadLabel = (m: ModalidadPermitida) => MODALIDADES.find((x) => x.value === m)?.label ?? m;

export interface ProductoServicio {
  readonly id: number;
  readonly idTienda: number;
  readonly codigo: string | null;
  readonly tipoItem: TipoItem;
  readonly proveedor: string | null;
  readonly marca: string | null;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly imagenUrl: string | null;
  readonly precioContado: number;
  /** Precio de lista o al crédito (VA). */
  readonly precioCredito: number;
  readonly modalidadPermitida: ModalidadPermitida;
  readonly estado: EstadoActivo;
}

export type DatosProducto = Omit<ProductoServicio, 'id' | 'idTienda' | 'codigo'>;

/** Invariantes del catálogo (Ley N° 29571: precio al contado y precio de lista diferenciados). */
export function validarProducto(d: DatosProducto, exigirImagen: boolean): DatosProducto {
  const descripcion = d.descripcion.trim();
  ensure(descripcion.length > 0 && descripcion.length <= 250, 'La descripción es obligatoria (máximo 250 caracteres).');
  ensure(!!d.unidadMedida, 'La unidad de medida es obligatoria.');
  ensure(!exigirImagen || !!d.imagenUrl, 'La imagen del producto es obligatoria.');
  ensure(d.precioContado > 0, 'El precio al contado debe ser mayor a cero.');
  ensure(d.precioCredito >= d.precioContado, 'El precio de lista debe ser mayor o igual al precio al contado.');
  return {
    ...d,
    descripcion,
    marca: d.marca?.trim() || null,
    proveedor: d.proveedor?.trim() || null,
    precioContado: round2(d.precioContado),
    precioCredito: round2(d.precioCredito),
  };
}

export function permiteModalidad(p: Pick<ProductoServicio, 'modalidadPermitida'>, m: ModalidadCompra): boolean {
  return p.modalidadPermitida === 'AMBAS' || p.modalidadPermitida === m;
}
