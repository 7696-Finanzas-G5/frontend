import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Cuota } from '../domain/model/cuota';
import { CuotaRepository } from '../domain/repositories/cuota.repository';

@Injectable()
export class LocalStorageCuotaRepository extends LocalStorageRepository<Cuota> implements CuotaRepository {
  constructor() {
    super('cuota');
  }

  findByCompra(idCompra: number): Cuota[] {
    return this.all()
      .filter((q) => q.idCompra === idCompra)
      .sort((a, b) => a.numeroCuota - b.numeroCuota);
  }
}
