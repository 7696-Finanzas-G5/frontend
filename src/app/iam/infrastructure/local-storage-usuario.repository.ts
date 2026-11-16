import { Injectable } from '@angular/core';
import { LocalStorageRepository } from '../../shared/infrastructure/persistence/local-storage-repository';
import { Rol, Usuario } from '../domain/model/usuario';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';

@Injectable()
export class LocalStorageUsuarioRepository extends LocalStorageRepository<Usuario> implements UsuarioRepository {
  constructor() {
    super('usuario');
  }

  findByUsername(username: string, rol?: Rol): Usuario | undefined {
    const u = username.trim().toLowerCase();
    return this.all().find((x) => x.username.toLowerCase() === u && (!rol || x.rol === rol));
  }

  findAdminDeTienda(idTienda: number): Usuario | undefined {
    return this.all().find((x) => x.idTienda === idTienda && x.rol === 'ADMIN_NEGOCIO');
  }

  findByCliente(idCliente: number): Usuario | undefined {
    return this.all().find((x) => x.idCliente === idCliente);
  }
}
