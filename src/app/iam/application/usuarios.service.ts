import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { EstadoActivo } from '../../shared/domain/common';
import { DomainError } from '../../shared/domain/domain-error';
import { Usuario, validarClave } from '../domain/model/usuario';
import { IamApi } from '../infrastructure/iam.api';
import { AuthService } from './auth.service';

/** Casos de uso de administración de usuarios (Administrador del Sistema). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(IamApi);
  private readonly auth = inject(AuthService);
  private readonly _usuarios = signal<Usuario[]>([]);

  /** Solo se cargan para el Administrador del Sistema. */
  readonly usuarios = this._usuarios.asReadonly();

  constructor() {
    effect(() => {
      const rol = this.auth.rol();
      untracked(() => (rol === 'ADMIN_SISTEMA' ? this.load().catch(() => undefined) : this._usuarios.set([])));
    });
  }

  async load(): Promise<void> {
    this._usuarios.set(await this.api.listarUsuarios());
  }

  adminDeTienda(idTienda: number): Usuario | undefined {
    return this._usuarios().find((u) => u.idTienda === idTienda && u.rol === 'ADMIN_NEGOCIO');
  }

  usuarioDeCliente(idCliente: number): Usuario | undefined {
    return this._usuarios().find((u) => u.idCliente === idCliente);
  }

  /** Verificación local con los usuarios cargados; el backend valida siempre la unicidad. */
  isUsernameTaken(username: string, exceptId?: number | null): boolean {
    const u = username.trim().toLowerCase();
    return this._usuarios().some((x) => x.username.toLowerCase() === u && x.id !== exceptId);
  }

  async cambiarEstado(id: number, estado: EstadoActivo): Promise<void> {
    if (id === this.auth.userIdValue()) throw new DomainError('No puede desactivar su propio usuario.');
    await this.api.cambiarEstado(id, estado);
    await this.load();
  }

  async restablecerClave(id: number, nueva: string): Promise<void> {
    validarClave(nueva);
    await this.api.restablecerClave(id, nueva);
  }
}
