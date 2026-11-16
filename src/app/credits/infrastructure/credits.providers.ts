import { Provider } from '@angular/core';
import { CompraRepository } from '../domain/repositories/compra.repository';
import { CuotaRepository } from '../domain/repositories/cuota.repository';
import { LocalStorageCompraRepository } from './local-storage-compra.repository';
import { LocalStorageCuotaRepository } from './local-storage-cuota.repository';

export const provideCredits = (): Provider[] => [
  { provide: CompraRepository, useClass: LocalStorageCompraRepository },
  { provide: CuotaRepository, useClass: LocalStorageCuotaRepository },
];
