import { Repository } from '../../../shared/domain/repository';
import { Cliente } from '../model/cliente';

export abstract class ClienteRepository extends Repository<Cliente> {
  abstract findByTienda(idTienda: number): Cliente[];
  abstract findByDni(idTienda: number, dni: string): Cliente | undefined;
}
