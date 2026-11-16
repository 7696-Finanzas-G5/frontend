import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { RegistroAuditoria } from '../domain/model/registro-auditoria';
import { BitacoraRepository } from '../domain/repositories/bitacora.repository';

@Injectable()
export class LocalStorageBitacoraRepository extends LocalStorageRepository<RegistroAuditoria> implements BitacoraRepository {
  constructor() {
    super('bitacora_auditoria');
  }

  override update(): never {
    throw new Error('La bitácora de auditoría es inalterable.');
  }
}
