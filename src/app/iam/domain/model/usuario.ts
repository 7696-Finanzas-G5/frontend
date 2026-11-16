import { EstadoActivo } from '../../../shared/domain/common';
import { ensure } from '../../../shared/domain/domain-error';

export type Rol = 'ADMIN_SISTEMA' | 'ADMIN_NEGOCIO' | 'CLIENTE';

export const ROLES: { value: Rol; label: string }[] = [
  { value: 'ADMIN_SISTEMA', label: 'Administrador del Sistema' },
  { value: 'ADMIN_NEGOCIO', label: 'Administrador del Negocio' },
  { value: 'CLIENTE', label: 'Cliente / Vecino' },
];

export const rolLabel = (rol: Rol | null | undefined) => ROLES.find((r) => r.value === rol)?.label ?? '';

export interface Usuario {
  readonly id: number;
  readonly idTienda: number | null;
  readonly idCliente: number | null;
  readonly username: string;
  readonly claveHash: string;
  readonly rol: Rol;
  readonly estado: EstadoActivo;
  readonly ultimoAcceso: string | null;
  readonly fechaRegistro: string;
}

export const CLAVE_MIN = 8;
export const CLAVE_MAX = 64;

export function validarUsername(username: string): string {
  const u = username.trim();
  ensure(u.length >= 4 && u.length <= 80, 'El usuario debe tener entre 4 y 80 caracteres.');
  return u;
}

export function validarClave(clave: string): void {
  ensure(clave.length >= CLAVE_MIN && clave.length <= CLAVE_MAX, `La contraseña debe tener entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`);
}

/** Invariantes de asociación según el rol. */
export function validarAsociacion(rol: Rol, idTienda: number | null, idCliente: number | null): void {
  if (rol === 'ADMIN_SISTEMA') ensure(idTienda == null && idCliente == null, 'El administrador del sistema no pertenece a una tienda.');
  if (rol === 'ADMIN_NEGOCIO') ensure(idTienda != null && idCliente == null, 'El administrador del negocio debe estar asociado a una tienda.');
  if (rol === 'CLIENTE') ensure(idTienda != null && idCliente != null, 'El usuario cliente debe estar asociado a un cliente.');
}
