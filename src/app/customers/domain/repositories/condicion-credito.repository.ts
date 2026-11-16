import { Repository } from '../../../shared/domain/repository';
import { CondicionCredito } from '../model/condicion-credito';

export abstract class CondicionCreditoRepository extends Repository<CondicionCredito> {
  abstract findVigente(idCliente: number): CondicionCredito | undefined;
}
