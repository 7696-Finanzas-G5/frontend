import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../iam/application/auth.service';
import { UsuariosService } from '../../iam/application/usuarios.service';
import { DatosTienda, GIROS_NEGOCIO, Tienda, validarDatosTienda } from '../domain/model/tienda';
import { TiendasApi } from '../infrastructure/tiendas.api';

export interface GuardarTiendaCommand {
  datos: DatosTienda;
  activa: boolean;
  adminUsername: string;
  /** Obligatoria al registrar; opcional al editar. */
  adminClave: string;
}

/** Casos de uso del Administrador del Sistema: alta y baja de tiendas multi-giro. */
@Injectable({ providedIn: 'root' })
export class TiendasService {
  private readonly api = inject(TiendasApi);
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly _tiendas = signal<Tienda[]>([]);

  /** Todas las tiendas (admin del sistema) o la tienda del usuario en sesión. */
  readonly tiendas = this._tiendas.asReadonly();

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => (user ? this.load().catch(() => undefined) : this._tiendas.set([])));
    });
  }

  async load(): Promise<void> {
    const user = this.auth.user();
    if (user?.rol === 'ADMIN_SISTEMA') this._tiendas.set(await this.api.listar());
    else if (user?.idTienda != null) this._tiendas.set([await this.api.obtener(user.idTienda)]);
    else this._tiendas.set([]);
  }

  /** Giros admitidos por el backend (público); si no responde, se usa la lista local. */
  async giros(): Promise<string[]> {
    try {
      const giros = await this.api.giros();
      return giros.length ? giros : GIROS_NEGOCIO;
    } catch {
      return GIROS_NEGOCIO;
    }
  }

  findById(id: number | null | undefined): Tienda | undefined {
    return id == null ? undefined : this._tiendas().find((t) => t.id === id);
  }

  nombreDe(id: number | null | undefined): string {
    return this.findById(id)?.nombreComercial ?? '—';
  }

  isRucTaken(ruc: string, exceptId?: number | null): boolean {
    return this._tiendas().some((t) => t.ruc === ruc && t.id !== exceptId);
  }

  async registrar(cmd: GuardarTiendaCommand): Promise<Tienda> {
    const t = await this.api.registrar(this.request(cmd));
    await Promise.all([this.load(), this.usuarios.load()]);
    return t;
  }

  async actualizar(id: number, cmd: GuardarTiendaCommand): Promise<Tienda> {
    const t = await this.api.actualizar(id, this.request(cmd));
    await Promise.all([this.load(), this.usuarios.load()]);
    return t;
  }

  async cambiarEstado(id: number, activa: boolean): Promise<void> {
    await this.api.cambiarEstado(id, activa);
    await Promise.all([this.load(), this.usuarios.load()]);
  }

  private request(cmd: GuardarTiendaCommand) {
    return { ...validarDatosTienda(cmd.datos), activa: cmd.activa, adminUsername: cmd.adminUsername.trim(), adminClave: cmd.adminClave };
  }
}
