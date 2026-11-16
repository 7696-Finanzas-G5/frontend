import { Repository } from '../../../shared/domain/repository';
import { ProductoServicio } from '../model/producto-servicio';

export abstract class ProductoRepository extends Repository<ProductoServicio> {
  abstract findByTienda(idTienda: number): ProductoServicio[];
}
