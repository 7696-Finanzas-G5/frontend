import { EstadoActivo } from '../../../shared/domain/common';
import { ensure } from '../../../shared/domain/domain-error';

export interface Cliente {
  readonly id: number;
  readonly idTienda: number;
  readonly dni: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly estado: EstadoActivo;
  readonly fechaRegistro: string;
}

export interface DatosCliente {
  nombres: string;
  apellidos: string;
  dni: string;
  direccion: string | null;
  telefono: string | null;
}

export const nombreCompleto = (c: Pick<Cliente, 'nombres' | 'apellidos'>) => `${c.nombres} ${c.apellidos}`.trim();

export function validarDatosCliente(d: DatosCliente): DatosCliente {
  const nombres = d.nombres.trim();
  const apellidos = d.apellidos.trim();
  ensure(nombres.length > 0 && nombres.length <= 100, 'Los nombres son obligatorios (máximo 100 caracteres).');
  ensure(apellidos.length > 0 && apellidos.length <= 120, 'Los apellidos son obligatorios (máximo 120 caracteres).');
  ensure(/^\d{8}$/.test(d.dni), 'El DNI debe tener 8 dígitos.');
  return { nombres, apellidos, dni: d.dni, direccion: d.direccion?.trim() || null, telefono: d.telefono?.trim() || null };
}
