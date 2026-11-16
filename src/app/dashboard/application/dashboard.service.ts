import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../iam/application/auth.service';
import { DashboardApi, RegistroBitacora, ResumenNegocio, ResumenSistema } from '../infrastructure/dashboard.api';

export type { RegistroBitacora, ResumenNegocio, ResumenSistema, Vencimiento } from '../infrastructure/dashboard.api';

const SISTEMA_VACIO: ResumenSistema = { tiendas: 0, tiendasActivas: 0, usuarios: 0, clientes: 0, compras: 0, bitacoraReciente: [] };
const NEGOCIO_VACIO: ResumenNegocio = { tienda: '', clientes: 0, productos: 0, deuda: 0, disponible: 0, proximosVencimientos: [], bitacoraReciente: [] };

/** Modelo de lectura (query side) del inicio, calculado por el backend. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(DashboardApi);
  private readonly auth = inject(AuthService);

  private readonly sistema = signal<ResumenSistema>(SISTEMA_VACIO);
  private readonly negocio = signal<ResumenNegocio>(NEGOCIO_VACIO);
  readonly error = signal<string | null>(null);

  readonly resumenSistema = this.sistema.asReadonly();
  readonly resumenNegocio = this.negocio.asReadonly();
  readonly proximosVencimientos = computed(() => this.negocio().proximosVencimientos);
  readonly bitacoraReciente = computed<RegistroBitacora[]>(() =>
    this.auth.rol() === 'ADMIN_SISTEMA' ? this.sistema().bitacoraReciente : this.negocio().bitacoraReciente,
  );

  /** Vuelve a consultar el resumen del rol en sesión. */
  async load(): Promise<void> {
    this.error.set(null);
    try {
      if (this.auth.rol() === 'ADMIN_SISTEMA') this.sistema.set(await this.api.sistema());
      else if (this.auth.rol() === 'ADMIN_NEGOCIO') this.negocio.set(await this.api.negocio());
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
