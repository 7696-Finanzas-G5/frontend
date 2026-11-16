import { Injectable, computed, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { AuthService } from '../../iam/application/auth.service';
import { DomainError } from '../../shared/domain/domain-error';
import { DatosProducto, ProductoServicio, validarProducto } from '../domain/model/producto-servicio';
import { ProductoRepository } from '../domain/repositories/producto.repository';

/** Casos de uso del Administrador del Negocio: alta y baja de productos y servicios. */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly repo = inject(ProductoRepository);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);

  /** Catálogo de la tienda del usuario en sesión. */
  readonly productosDeMiTienda = computed(() => this.repo.all().filter((p) => p.idTienda === this.auth.tiendaId()));
  readonly activosDeMiTienda = computed(() => this.productosDeMiTienda().filter((p) => p.estado === 'ACTIVO'));

  findById(id: number | null | undefined): ProductoServicio | undefined {
    return this.repo.findById(id);
  }

  registrar(datos: DatosProducto): ProductoServicio {
    const idTienda = this.auth.tiendaId();
    if (idTienda == null) throw new DomainError('El usuario no pertenece a una tienda.');
    const d = validarProducto(datos, true);
    const n = this.repo.findByTienda(idTienda).filter((p) => p.tipoItem === d.tipoItem).length + 1;
    const codigo = `${d.tipoItem === 'SERVICIO' ? 'S' : 'P'}-${String(n).padStart(3, '0')}`;
    const p = this.repo.add({ ...d, idTienda, codigo });
    this.audit.registrar(this.auth.userIdValue(), 'ALTA', 'producto_servicio', p.id, d.descripcion);
    return p;
  }

  actualizar(id: number, datos: DatosProducto): ProductoServicio {
    const actual = this.repo.findById(id);
    if (!actual) throw new DomainError('Producto no encontrado.');
    // Se exige imagen si el producto ya la tenía (los datos de demostración no tienen imagen)
    const p = this.repo.update(id, validarProducto(datos, !!actual.imagenUrl));
    this.audit.registrar(this.auth.userIdValue(), 'EDITAR', 'producto_servicio', id, p.descripcion);
    return p;
  }

  cambiarEstado(id: number, activo: boolean): void {
    const p = this.repo.update(id, { estado: activo ? 'ACTIVO' : 'INACTIVO' });
    this.audit.registrar(this.auth.userIdValue(), activo ? 'ALTA' : 'BAJA', 'producto_servicio', id, p.descripcion);
  }
}
