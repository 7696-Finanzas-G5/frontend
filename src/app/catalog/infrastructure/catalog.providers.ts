import { Provider } from '@angular/core';
import { ProductoRepository } from '../domain/repositories/producto.repository';
import { LocalStorageProductoRepository } from './local-storage-producto.repository';

export const provideCatalog = (): Provider[] => [{ provide: ProductoRepository, useClass: LocalStorageProductoRepository }];
