import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DomainError } from '../../shared/domain/domain-error';
import { TokenStorage } from '../../shared/infrastructure/http/token-storage';
import { Rol, Usuario, validarClave, validarUsername } from '../domain/model/usuario';
import { IamApi, RegistroRequest } from '../infrastructure/iam.api';

/** Caso de uso: autenticación (JWT emitido por el backend) y sesión del usuario actual. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(IamApi);
  private readonly tokens = inject(TokenStorage);
  private readonly _user = signal<Usuario | null>(null);

  readonly user = computed<Usuario | null>(() => (this.tokens.token() ? this._user() : null));
  readonly userIdValue = computed(() => this.user()?.id ?? null);
  readonly rol = computed<Rol | null>(() => this.user()?.rol ?? null);
  readonly tiendaId = computed(() => this.user()?.idTienda ?? null);
  readonly clienteId = computed(() => this.user()?.idCliente ?? null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  constructor() {
    // Si el token se descarta (p. ej. sesión expirada: HTTP 401) se limpia el usuario
    effect(() => {
      if (!this.tokens.token()) this._user.set(null);
    });
  }

  /** Recupera la sesión guardada al recargar la página. */
  async restore(): Promise<void> {
    if (!this.tokens.token()) return;
    try {
      this._user.set(await this.api.me());
    } catch {
      this.tokens.clear();
    }
  }

  async login(rol: Rol, username: string, clave: string): Promise<Usuario> {
    const r = await this.api.login(rol, username.trim(), clave);
    this.tokens.set(r.token);
    this._user.set(r.usuario);
    return r.usuario;
  }

  /** Auto-registro público de un negocio: el backend crea la tienda y su administrador y devuelve la sesión. */
  async registrarNegocio(cmd: RegistroRequest): Promise<Usuario> {
    const username = validarUsername(cmd.username);
    validarClave(cmd.clave);
    const r = await this.api.registro({ ...cmd, username });
    this.tokens.set(r.token);
    this._user.set(r.usuario);
    return r.usuario;
  }

  logout(): void {
    this.tokens.clear();
    this._user.set(null);
  }

  async cambiarClave(actual: string, nueva: string): Promise<void> {
    if (!this.user()) throw new DomainError('Sesión no iniciada.');
    validarClave(nueva);
    await this.api.cambiarClave(actual, nueva);
  }

  homeFor(rol: Rol | null): string {
    return rol === 'CLIENTE' ? '/mi-cuenta' : '/inicio';
  }
}
