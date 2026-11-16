import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Pago } from '../domain/model/pago';
import { PagoRepository } from '../domain/repositories/pago.repository';

@Injectable()
export class LocalStoragePagoRepository extends LocalStorageRepository<Pago> implements PagoRepository {
  constructor() {
    super('pago');
  }

  findByCliente(idCliente: number): Pago[] {
    return this.all()
      .filter((p) => p.idCliente === idCliente)
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro) || b.id - a.id);
  }
}
