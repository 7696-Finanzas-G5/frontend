import { Repository } from '../../../shared/domain/repository';
import { Tienda } from '../model/tienda';

export abstract class TiendaRepository extends Repository<Tienda> {
  abstract findByRuc(ruc: string): Tienda | undefined;
}
