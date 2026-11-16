import { Repository } from '../../../shared/domain/repository';
import { Rol, Usuario } from '../model/usuario';

export abstract class UsuarioRepository extends Repository<Usuario> {
  abstract findByUsername(username: string, rol?: Rol): Usuario | undefined;
  abstract findAdminDeTienda(idTienda: number): Usuario | undefined;
  abstract findByCliente(idCliente: number): Usuario | undefined;
}
