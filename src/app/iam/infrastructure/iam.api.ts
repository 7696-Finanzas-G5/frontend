import { Injectable, inject } from '@angular/core';
import { EstadoActivo } from '../../shared/domain/common';
import { ApiClient } from '../../shared/infrastructure/http/api-client';
import { Rol, Usuario } from '../domain/model/usuario';

export interface LoginResponse {
  token: string;
  tokenType: string;
  usuario: Usuario;
}

export interface RegistroRequest {
  nombreComercial: string;
  ruc: string;
  direccion: string;
  giroNegocio: string;
  username: string;
  clave: string;
}

/** Adaptador HTTP de IAM: `/auth` y `/usuarios`. */
@Injectable({ providedIn: 'root' })
export class IamApi {
  private readonly api = inject(ApiClient);

  login(rol: Rol, username: string, clave: string): Promise<LoginResponse> {
    return this.api.post('/auth/login', { rol, username, clave });
  }

  /** Registro público de un negocio: crea la tienda y su Administrador del Negocio; devuelve la sesión. */
  registro(req: RegistroRequest): Promise<LoginResponse> {
    return this.api.post('/auth/registro', req);
  }

  me(): Promise<Usuario> {
    return this.api.get('/auth/me');
  }

  cambiarClave(actual: string, nueva: string): Promise<void> {
    return this.api.post('/auth/cambiar-clave', { actual, nueva });
  }

  listarUsuarios(): Promise<Usuario[]> {
    return this.api.get('/usuarios');
  }

  cambiarEstado(id: number, estado: EstadoActivo): Promise<Usuario> {
    return this.api.patch(`/usuarios/${id}/estado`, { estado });
  }

  restablecerClave(id: number, nueva: string): Promise<void> {
    return this.api.post(`/usuarios/${id}/restablecer-clave`, { nueva });
  }
}
