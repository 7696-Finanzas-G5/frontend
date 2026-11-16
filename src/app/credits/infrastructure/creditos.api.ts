import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../shared/infrastructure/http/api-client';
import { ModalidadCompra } from '../../shared/domain/finance/financial-math';
import { Compra } from '../domain/model/compra';
import { Cuota } from '../domain/model/cuota';

export interface CompraRequest {
  idCliente: number;
  idProducto: number;
  cantidad: number;
  fechaHoraCompra: string;
  modalidad: ModalidadCompra;
  n: number | null;
}

/** Adaptador HTTP de `/compras`. */
@Injectable({ providedIn: 'root' })
export class CreditosApi {
  private readonly api = inject(ApiClient);

  /** Compras más recientes de los clientes de la tienda en sesión. */
  recientes(limite = 20): Promise<Compra[]> {
    return this.api.get('/compras', { limite });
  }

  comprasDe(idCliente: number): Promise<Compra[]> {
    return this.api.get(`/clientes/${idCliente}/compras`);
  }

  registrar(req: CompraRequest): Promise<Compra> {
    return this.api.post('/compras', req);
  }

  cuotas(idCompra: number): Promise<Cuota[]> {
    return this.api.get(`/compras/${idCompra}/cuotas`);
  }
}
