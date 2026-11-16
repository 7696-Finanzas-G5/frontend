import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../iam/application/auth.service';
import { DatosProducto, ProductoServicio, validarProducto } from '../domain/model/producto-servicio';
import { CatalogoApi } from '../infrastructure/catalogo.api';

/** Casos de uso del Administrador del Negocio: alta y baja de productos y servicios. */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly api = inject(CatalogoApi);
  private readonly auth = inject(AuthService);
  private readonly _productos = signal<ProductoServicio[]>([]);

  /** Catálogo de la tienda del usuario en sesión. */
  readonly productosDeMiTienda = this._productos.asReadonly();
  readonly activosDeMiTienda = computed(() => this._productos().filter((p) => p.estado === 'ACTIVO'));

  constructor() {
    effect(() => {
      const rol = this.auth.rol();
      untracked(() => (rol === 'ADMIN_NEGOCIO' ? this.load().catch(() => undefined) : this._productos.set([])));
    });
  }

  async load(): Promise<void> {
    this._productos.set(await this.api.listar());
  }

  findById(id: number | null | undefined): ProductoServicio | undefined {
    return id == null ? undefined : this._productos().find((p) => p.id === id);
  }

  async registrar(datos: DatosProducto): Promise<ProductoServicio> {
    const p = await this.api.registrar(validarProducto(datos, true));
    await this.load();
    return p;
  }

  async actualizar(id: number, datos: DatosProducto): Promise<ProductoServicio> {
    // Se exige imagen si el producto ya la tenía (los datos de demostración no tienen imagen)
    const p = await this.api.actualizar(id, validarProducto(datos, !!this.findById(id)?.imagenUrl));
    await this.load();
    return p;
  }

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    await this.api.cambiarEstado(id, activo);
    await this.load();
  }
}
