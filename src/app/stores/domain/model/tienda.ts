import { ensure } from '../../../shared/domain/domain-error';

export type EstadoTienda = 'ACTIVA' | 'INACTIVA';

export const GIROS_NEGOCIO = [
  'Bodega',
  'Supermercado de Barrio',
  'Frutería',
  'Carnicería',
  'Pollería',
  'Panadería',
  'Bazar',
  'Licorería',
  'Peluquería',
  'Spa',
  'Otro',
];

export interface Tienda {
  readonly id: number;
  readonly nombreComercial: string;
  readonly ruc: string;
  readonly direccion: string;
  readonly giroNegocio: string;
  readonly estado: EstadoTienda;
  readonly fechaRegistro: string;
}

export interface DatosTienda {
  nombreComercial: string;
  ruc: string;
  direccion: string;
  giroNegocio: string;
}

export const RUC_PATTERN = /^(10|15|17|20)\d{9}$/;

export function validarDatosTienda(d: DatosTienda): DatosTienda {
  const nombreComercial = d.nombreComercial.trim();
  const direccion = d.direccion.trim();
  ensure(nombreComercial.length > 0 && nombreComercial.length <= 120, 'El nombre comercial es obligatorio (máximo 120 caracteres).');
  ensure(RUC_PATTERN.test(d.ruc), 'El RUC debe tener 11 dígitos e iniciar con 10, 15, 17 o 20.');
  ensure(direccion.length > 0 && direccion.length <= 250, 'La dirección es obligatoria (máximo 250 caracteres).');
  ensure(GIROS_NEGOCIO.includes(d.giroNegocio), 'Giro de negocio no válido.');
  return { nombreComercial, ruc: d.ruc, direccion, giroNegocio: d.giroNegocio };
}
