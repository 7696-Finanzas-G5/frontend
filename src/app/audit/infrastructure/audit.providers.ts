import { Provider } from '@angular/core';
import { BitacoraRepository } from '../domain/repositories/bitacora.repository';
import { LocalStorageBitacoraRepository } from './local-storage-bitacora.repository';

export const provideAudit = (): Provider[] => [{ provide: BitacoraRepository, useClass: LocalStorageBitacoraRepository }];
