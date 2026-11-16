import { Provider } from '@angular/core';
import { TiendaRepository } from '../domain/repositories/tienda.repository';
import { LocalStorageTiendaRepository } from './local-storage-tienda.repository';

export const provideStores = (): Provider[] => [{ provide: TiendaRepository, useClass: LocalStorageTiendaRepository }];
