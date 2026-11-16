import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Cliente } from '../domain/model/cliente';
import { ClienteRepository } from '../domain/repositories/cliente.repository';

@Injectable()
export class LocalStorageClienteRepository extends LocalStorageRepository<Cliente> implements ClienteRepository {
  constructor() {
    super('cliente');
  }

  findByTienda(idTienda: number): Cliente[] {
    return this.all().filter((c) => c.idTienda === idTienda);
  }

  findByDni(idTienda: number, dni: string): Cliente | undefined {
    return this.all().find((c) => c.idTienda === idTienda && c.dni === dni);
  }
}
