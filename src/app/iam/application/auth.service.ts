import { Injectable, computed, inject, signal } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { DomainError } from '../../shared/domain/domain-error';
import { nowIsoMinutes } from '../../shared/domain/finance/dates';
import { Rol, Usuario, validarClave } from '../domain/model/usuario';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { PasswordHasher } from '../domain/services/password-hasher';

const SESSION_KEY = 'credibarrio.session';

/** Caso de uso: autenticación y sesión del usuario actual. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarios = inject(UsuarioRepository);
  private readonly hasher = inject(PasswordHasher);
  private readonly audit = inject(AuditService);
  private readonly userId = signal<number | null>(this.readSession());

  readonly user = computed<Usuario | null>(() => this.usuarios.findById(this.userId()) ?? null);
  readonly userIdValue = computed(() => this.user()?.id ?? null);
  readonly rol = computed<Rol | null>(() => this.user()?.rol ?? null);
  readonly tiendaId = computed(() => this.user()?.idTienda ?? null);
  readonly clienteId = computed(() => this.user()?.idCliente ?? null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  async login(rol: Rol, username: string, clave: string): Promise<Usuario> {
    const user = this.usuarios.findByUsername(username, rol);
    if (!user || !(await this.hasher.matches(clave, user.claveHash))) {
      this.audit.registrar(null, 'LOGIN_FALLIDO', 'usuario', user?.id ?? null, `Intento con usuario "${username}"`);
      throw new DomainError('Usuario, contraseña o rol incorrectos.');
    }
    if (user.estado !== 'ACTIVO') throw new DomainError('El usuario se encuentra dado de baja.');
    this.usuarios.update(user.id, { ultimoAcceso: nowIsoMinutes() });
    this.audit.registrar(user.id, 'LOGIN', 'usuario', user.id);
    this.userId.set(user.id);
    sessionStorage.setItem(SESSION_KEY, String(user.id));
    return user;
  }

  logout(): void {
    this.userId.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  async cambiarClave(actual: string, nueva: string): Promise<void> {
    const user = this.user();
    if (!user) throw new DomainError('Sesión no iniciada.');
    if (!(await this.hasher.matches(actual, user.claveHash))) throw new DomainError('La contraseña actual no es correcta.');
    validarClave(nueva);
    this.usuarios.update(user.id, { claveHash: await this.hasher.hash(nueva) });
    this.audit.registrar(user.id, 'CAMBIAR_CLAVE', 'usuario', user.id);
  }

  homeFor(rol: Rol | null): string {
    return rol === 'CLIENTE' ? '/mi-cuenta' : '/inicio';
  }

  private readSession(): number | null {
    try {
      const v = sessionStorage.getItem(SESSION_KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }
}
