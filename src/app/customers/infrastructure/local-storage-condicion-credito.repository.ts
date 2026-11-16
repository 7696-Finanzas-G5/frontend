import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { CondicionCredito } from '../domain/model/condicion-credito';
import { CondicionCreditoRepository } from '../domain/repositories/condicion-credito.repository';

@Injectable()
export class LocalStorageCondicionCreditoRepository extends LocalStorageRepository<CondicionCredito> implements CondicionCreditoRepository {
  constructor() {
    super('condicion_credito');
  }

  findVigente(idCliente: number): CondicionCredito | undefined {
    return this.all().find((c) => c.idCliente === idCliente && c.estado === 'VIGENTE');
  }
}
