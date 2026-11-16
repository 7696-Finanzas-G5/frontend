import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../iam/application/auth.service';
import { DatosCliente, validarDatosCliente } from '../domain/model/cliente';
import { CondicionCredito, TerminosCredito, validarTerminos } from '../domain/model/condicion-credito';
import { ClienteView, ClientesApi } from '../infrastructure/clientes.api';

export interface GuardarClienteCommand {
  datos: DatosCliente;
  terminos: TerminosCredito;
  activo: boolean;
  /** Acceso opcional del cliente con el rol Cliente / Vecino. */
  acceso?: { username: string; clave: string } | null;
}

/** Casos de uso: alta/baja de clientes y configuración de su línea de crédito. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly api = inject(ClientesApi);
  private readonly auth = inject(AuthService);
  private readonly _clientes = signal<ClienteView[]>([]);
  /** Versiones históricas de condiciones consultadas (las compras conservan la condición pactada). */
  private readonly _historicas = signal<CondicionCredito[]>([]);

  readonly todos = this._clientes.asReadonly();
  readonly todasLasCondiciones = computed(() => [
    ...this._clientes().flatMap((c) => (c.condicionVigente ? [c.condicionVigente] : [])),
    ...this._historicas(),
  ]);
  readonly deMiTienda = computed(() => this._clientes().filter((c) => c.idTienda === this.auth.tiendaId()));
  readonly activosDeMiTienda = computed(() => this.deMiTienda().filter((c) => c.estado === 'ACTIVO'));

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => (user ? this.load().catch(() => undefined) : this._clientes.set([])));
    });
  }

  /** Clientes de la tienda (negocio), todos (sistema) o el propio cliente (vecino). */
  async load(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    if (user.rol === 'CLIENTE') {
      this._clientes.set(user.idCliente != null ? [await this.api.obtener(user.idCliente)] : []);
    } else {
      this._clientes.set(await this.api.listar());
    }
  }

  /** Vuelve a leer un cliente (p. ej. tras una compra o un pago, para actualizar deuda y disponible). */
  async refresh(id: number): Promise<void> {
    const c = await this.api.obtener(id);
    this._clientes.update((rows) => (rows.some((r) => r.id === id) ? rows.map((r) => (r.id === id ? c : r)) : [...rows, c]));
  }

  findById(id: number | null | undefined): ClienteView | undefined {
    return id == null ? undefined : this._clientes().find((c) => c.id === id);
  }

  condicionVigente(idCliente: number): CondicionCredito | undefined {
    return this.findById(idCliente)?.condicionVigente ?? undefined;
  }

  condicionById(id: number): CondicionCredito | undefined {
    return this.todasLasCondiciones().find((c) => c.id === id);
  }

  /** Carga el historial de condiciones del cliente (para compras pactadas con versiones anteriores). */
  async cargarHistorial(idCliente: number): Promise<void> {
    const versiones = await this.api.condiciones(idCliente);
    const historicas = versiones.filter((v) => v.estado === 'HISTORICA');
    this._historicas.update((prev) => [...prev.filter((p) => p.idCliente !== idCliente), ...historicas]);
  }

  isDniTaken(dni: string, exceptId?: number | null): boolean {
    return this.deMiTienda().some((c) => c.dni === dni && c.id !== exceptId);
  }

  async registrar(cmd: GuardarClienteCommand): Promise<ClienteView> {
    const c = await this.api.registrar(this.request(cmd));
    await this.load();
    return c;
  }

  async actualizar(id: number, cmd: GuardarClienteCommand): Promise<ClienteView> {
    const c = await this.api.actualizar(id, this.request(cmd));
    await this.load();
    return c;
  }

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    await this.api.cambiarEstado(id, activo);
    await this.refresh(id);
  }

  private request(cmd: GuardarClienteCommand) {
    const acceso = cmd.acceso?.username?.trim() ? { username: cmd.acceso.username.trim(), clave: cmd.acceso.clave } : null;
    return { ...validarDatosCliente(cmd.datos), terminos: validarTerminos(cmd.terminos), activo: cmd.activo, acceso };
  }
}
