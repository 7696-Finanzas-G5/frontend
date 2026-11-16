import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Tienda } from '../domain/model/tienda';
import { TiendaRepository } from '../domain/repositories/tienda.repository';

@Injectable()
export class LocalStorageTiendaRepository extends LocalStorageRepository<Tienda> implements TiendaRepository {
  constructor() {
    super('tienda');
  }

  findByRuc(ruc: string): Tienda | undefined {
    return this.all().find((t) => t.ruc === ruc);
  }
}
