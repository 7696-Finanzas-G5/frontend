import { Repository } from '../../../shared/domain/repository';
import { Compra } from '../model/compra';

export abstract class CompraRepository extends Repository<Compra> {
  abstract findByCliente(idCliente: number): Compra[];
}
