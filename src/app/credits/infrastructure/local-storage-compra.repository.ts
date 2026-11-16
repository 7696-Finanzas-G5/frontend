import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Compra } from '../domain/model/compra';
import { CompraRepository } from '../domain/repositories/compra.repository';

@Injectable()
export class LocalStorageCompraRepository extends LocalStorageRepository<Compra> implements CompraRepository {
  constructor() {
    super('compra');
  }

  findByCliente(idCliente: number): Compra[] {
    return this.all().filter((c) => c.idCliente === idCliente);
  }
}
