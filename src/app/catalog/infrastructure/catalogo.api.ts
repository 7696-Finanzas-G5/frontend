import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../shared/infrastructure/http/api-client';
import { DatosProducto, ProductoServicio } from '../domain/model/producto-servicio';

/** Adaptador HTTP de `/productos` (catálogo de la tienda en sesión). */
@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly api = inject(ApiClient);

  listar(): Promise<ProductoServicio[]> {
    return this.api.get('/productos');
  }

  registrar(datos: DatosProducto): Promise<ProductoServicio> {
    return this.api.post('/productos', datos);
  }

  actualizar(id: number, datos: DatosProducto): Promise<ProductoServicio> {
    return this.api.put(`/productos/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Promise<ProductoServicio> {
    return this.api.patch(`/productos/${id}/estado`, { activo });
  }
}
