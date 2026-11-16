import { Repository } from '../../../shared/domain/repository';
import { Cuota } from '../model/cuota';

export abstract class CuotaRepository extends Repository<Cuota> {
  abstract findByCompra(idCompra: number): Cuota[];
}
