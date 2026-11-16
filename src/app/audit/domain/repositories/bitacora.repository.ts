import { Repository } from '../../../shared/domain/repository';
import { RegistroAuditoria } from '../model/registro-auditoria';

export abstract class BitacoraRepository extends Repository<RegistroAuditoria> {}
