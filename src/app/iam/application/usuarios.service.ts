import { Injectable, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { EstadoActivo } from '../../shared/domain/common';
import { DomainError } from '../../shared/domain/domain-error';
import { nowIsoMinutes } from '../../shared/domain/finance/dates';
import { Rol, Usuario, validarAsociacion, validarClave, validarUsername } from '../domain/model/usuario';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { PasswordHasher } from '../domain/services/password-hasher';
import { AuthService } from './auth.service';

export interface RegistrarUsuarioCommand {
  username: string;
  clave: string;
  rol: Rol;
  idTienda: number | null;
  idCliente: number | null;
  estado: EstadoActivo;
}

export interface ActualizarCredencialesCommand {
  username: string;
  /** Vacío para conservar la contraseña actual. */
  clave?: string;
  estado: EstadoActivo;
}

/** Casos de uso de administración de usuarios (también usados por otros contextos). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly repo = inject(UsuarioRepository);
  private readonly hasher = inject(PasswordHasher);
  private readonly audit = inject(AuditService);
  private readonly auth = inject(AuthService);

  readonly usuarios = this.repo.all;

  adminDeTienda(idTienda: number): Usuario | undefined {
    return this.repo.findAdminDeTienda(idTienda);
  }

  usuarioDeCliente(idCliente: number): Usuario | undefined {
    return this.repo.findByCliente(idCliente);
  }

  isUsernameTaken(username: string, exceptId?: number | null): boolean {
    const u = this.repo.findByUsername(username);
    return !!u && u.id !== exceptId;
  }

  async registrar(cmd: RegistrarUsuarioCommand): Promise<Usuario> {
    const username = validarUsername(cmd.username);
    validarClave(cmd.clave);
    validarAsociacion(cmd.rol, cmd.idTienda, cmd.idCliente);
    if (this.isUsernameTaken(username)) throw new DomainError(`El usuario "${username}" ya está en uso.`);
    const user = this.repo.add({
      idTienda: cmd.idTienda,
      idCliente: cmd.idCliente,
      username,
      claveHash: await this.hasher.hash(cmd.clave),
      rol: cmd.rol,
      estado: cmd.estado,
      ultimoAcceso: null,
      fechaRegistro: nowIsoMinutes(),
    });
    this.audit.registrar(this.auth.userIdValue(), 'ALTA', 'usuario', user.id, `${username} (${cmd.rol})`);
    return user;
  }

  async actualizarCredenciales(id: number, cmd: ActualizarCredencialesCommand): Promise<Usuario> {
    const username = validarUsername(cmd.username);
    if (this.isUsernameTaken(username, id)) throw new DomainError(`El usuario "${username}" ya está en uso.`);
    const changes: Partial<Usuario> = { username, estado: cmd.estado };
    if (cmd.clave) {
      validarClave(cmd.clave);
      Object.assign(changes, { claveHash: await this.hasher.hash(cmd.clave) });
    }
    const user = this.repo.update(id, changes);
    this.audit.registrar(this.auth.userIdValue(), 'EDITAR', 'usuario', id, username);
    return user;
  }

  cambiarEstado(id: number, estado: EstadoActivo): void {
    if (id === this.auth.userIdValue()) throw new DomainError('No puede desactivar su propio usuario.');
    const u = this.repo.update(id, { estado });
    this.audit.registrar(this.auth.userIdValue(), estado === 'ACTIVO' ? 'ACTIVAR' : 'DESACTIVAR', 'usuario', id, u.username);
  }

  /** Mantiene el acceso del administrador de una tienda alineado con el estado de la tienda. */
  sincronizarEstadoAdminTienda(idTienda: number, estado: EstadoActivo): void {
    const admin = this.repo.findAdminDeTienda(idTienda);
    if (admin && admin.estado !== estado) this.repo.update(admin.id, { estado });
  }

  /** Mantiene el acceso del cliente alineado con su estado de alta/baja. */
  sincronizarEstadoCliente(idCliente: number, estado: EstadoActivo): void {
    const u = this.repo.findByCliente(idCliente);
    if (u && u.estado !== estado) this.repo.update(u.id, { estado });
  }

  async restablecerClave(id: number, nueva: string): Promise<void> {
    validarClave(nueva);
    const u = this.repo.update(id, { claveHash: await this.hasher.hash(nueva) });
    this.audit.registrar(this.auth.userIdValue(), 'RESTABLECER_CLAVE', 'usuario', id, u.username);
  }
}
