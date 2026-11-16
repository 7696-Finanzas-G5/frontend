import { Repository } from '../../../shared/domain/repository';
import { Pago } from '../model/pago';

export abstract class PagoRepository extends Repository<Pago> {
  abstract findByCliente(idCliente: number): Pago[];
}
