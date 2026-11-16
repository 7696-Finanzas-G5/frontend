import { Provider } from '@angular/core';
import { ClienteRepository } from '../domain/repositories/cliente.repository';
import { CondicionCreditoRepository } from '../domain/repositories/condicion-credito.repository';
import { LocalStorageClienteRepository } from './local-storage-cliente.repository';
import { LocalStorageCondicionCreditoRepository } from './local-storage-condicion-credito.repository';

export const provideCustomers = (): Provider[] => [
  { provide: ClienteRepository, useClass: LocalStorageClienteRepository },
  { provide: CondicionCreditoRepository, useClass: LocalStorageCondicionCreditoRepository },
];
