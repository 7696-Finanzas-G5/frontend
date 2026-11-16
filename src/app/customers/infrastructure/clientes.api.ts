import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../shared/infrastructure/http/api-client';
import { Cliente, DatosCliente } from '../domain/model/cliente';
import { CondicionCredito, TerminosCredito } from '../domain/model/condicion-credito';

/** Cliente tal como lo devuelve el backend: incluye su condición vigente, acceso, deuda y crédito disponible. */
export interface ClienteView extends Cliente {
  readonly idUsuario: number | null;
  readonly username: string | null;
  readonly condicionVigente: CondicionCredito | null;
  readonly deudaVigente: number;
  readonly disponible: number;
}

export interface ClienteRequest extends DatosCliente {
  terminos: TerminosCredito;
  activo: boolean;
  acceso: { username: string; clave: string } | null;
}

/** Adaptador HTTP de `/clientes`. */
@Injectable({ providedIn: 'root' })
export class ClientesApi {
  private readonly api = inject(ApiClient);

  listar(): Promise<ClienteView[]> {
    return this.api.get('/clientes');
  }

  obtener(id: number): Promise<ClienteView> {
    return this.api.get(`/clientes/${id}`);
  }

  registrar(req: ClienteRequest): Promise<ClienteView> {
    return this.api.post('/clientes', req);
  }

  actualizar(id: number, req: ClienteRequest): Promise<ClienteView> {
    return this.api.put(`/clientes/${id}`, req);
  }

  cambiarEstado(id: number, activo: boolean): Promise<ClienteView> {
    return this.api.patch(`/clientes/${id}/estado`, { activo });
  }

  condiciones(id: number): Promise<CondicionCredito[]> {
    return this.api.get(`/clientes/${id}/condiciones`);
  }
}
