import { Rol } from '../iam/domain/model/usuario';

/** Credenciales de los usuarios de demostración. */
export const DEMO_CREDENCIALES: { rol: Rol; label: string; username: string; clave: string }[] = [
  { rol: 'ADMIN_SISTEMA', label: 'Administrador del Sistema', username: 'admin', clave: 'Admin2026' },
  { rol: 'ADMIN_NEGOCIO', label: 'Administrador del Negocio', username: 'bodega.sanpedro', clave: 'Negocio2026' },
  { rol: 'CLIENTE', label: 'Cliente / Vecino', username: 'juan.perez', clave: 'Cliente2026' },
];
