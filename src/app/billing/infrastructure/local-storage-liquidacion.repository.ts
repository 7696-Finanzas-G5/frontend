import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Liquidacion } from '../domain/model/liquidacion';
import { LiquidacionRepository } from '../domain/repositories/liquidacion.repository';

@Injectable()
export class LocalStorageLiquidacionRepository extends LocalStorageRepository<Liquidacion> implements LiquidacionRepository {
  constructor() {
    super('liquidacion');
  }
}
