import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../shared/infrastructure/http/api-client';
import { Tienda } from '../domain/model/tienda';

export interface TiendaRequest {
  nombreComercial: string;
  ruc: string;
  direccion: string;
  giroNegocio: string;
  activa: boolean;
  adminUsername: string;
  adminClave: string;
}

/** Adaptador HTTP de `/tiendas`. */
@Injectable({ providedIn: 'root' })
export class TiendasApi {
  private readonly api = inject(ApiClient);

  listar(): Promise<Tienda[]> {
    return this.api.get('/tiendas');
  }

  /** Giros de negocio admitidos (público, sin token). */
  giros(): Promise<string[]> {
    return this.api.get('/tiendas/giros');
  }

  obtener(id: number): Promise<Tienda> {
    return this.api.get(`/tiendas/${id}`);
  }

  registrar(req: TiendaRequest): Promise<Tienda> {
    return this.api.post('/tiendas', req);
  }

  actualizar(id: number, req: TiendaRequest): Promise<Tienda> {
    return this.api.put(`/tiendas/${id}`, req);
  }

  cambiarEstado(id: number, activa: boolean): Promise<Tienda> {
    return this.api.patch(`/tiendas/${id}/estado`, { activa });
  }
}
