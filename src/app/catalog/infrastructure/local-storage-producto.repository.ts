import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { ProductoServicio } from '../domain/model/producto-servicio';
import { ProductoRepository } from '../domain/repositories/producto.repository';

@Injectable()
export class LocalStorageProductoRepository extends LocalStorageRepository<ProductoServicio> implements ProductoRepository {
  constructor() {
    super('producto_servicio');
  }

  findByTienda(idTienda: number): ProductoServicio[] {
    return this.all().filter((p) => p.idTienda === idTienda);
  }
}
