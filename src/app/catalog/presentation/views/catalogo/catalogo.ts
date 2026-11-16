import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ModalidadPermitida } from '../../../../shared/domain/finance/financial-math';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { MoneyPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { CatalogoService } from '../../../application/catalogo.service';
import { MODALIDADES, ProductoServicio, UNIDADES_MEDIDA, modalidadLabel } from '../../../domain/model/producto-servicio';

const MAX_IMG_BYTES = 400_000;

function precioListaValidator(g: AbstractControl): ValidationErrors | null {
  const contado = g.get('precioContado')?.value ?? 0;
  const lista = g.get('precioCredito')?.value ?? 0;
  return lista && contado && lista < contado ? { listaMenorContado: true } : null;
}

@Component({
  selector: 'app-catalogo',
  imports: [ReactiveFormsModule, HelpTip, Icon, PageHeader, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="tag" title="Gestión de Catálogo" subtitle="Alta y Baja de Productos y Servicios"
        help="Registre los productos o servicios indicando su precio al contado y su precio de lista al crédito (VA). Puede habilitar el pago único a fin de mes, el pago fraccionado en meses (Método Francés) o ambas modalidades." />

      <form class="card" [formGroup]="form" (ngSubmit)="save()">
        <div class="card-title"><h2>{{ editingId() ? 'Editar Producto o Servicio' : 'Registro de Producto o Servicio' }}</h2></div>
        <div class="form-grid">
          <div class="field">
            <label for="desc">Descripción del Producto <app-help title="Descripción" text="Nombre y detalle del producto o servicio. Obligatorio, máximo 250 caracteres." /></label>
            <input id="desc" class="input" formControlName="descripcion" placeholder="Ej. Canasta Familiar Mensual / Abarrotes" />
          </div>
          <div class="field">
            <label for="um">Unidad de Medida <app-help title="Unidad de Medida" text="Unidad en que se vende: unidad, kg, litro, pack, caja o servicio. Obligatoria." /></label>
            <select id="um" class="input" formControlName="unidadMedida">
              @for (u of unidades; track u) { <option [value]="u">{{ u }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="tipo">Tipo de ítem <app-help title="Tipo" text="Indique si se trata de un bien (producto) o una prestación (servicio)." /></label>
            <select id="tipo" class="input" formControlName="tipoItem">
              <option value="PRODUCTO">Producto</option><option value="SERVICIO">Servicio</option>
            </select>
          </div>
          <div class="field">
            <label for="pc">Precio Contado (S/) <app-help title="Precio Contado" text="Precio de venta sin financiamiento. Debe ser mayor a cero y se redondea a 2 decimales." /></label>
            <input id="pc" class="input" type="number" step="0.01" min="0.01" formControlName="precioContado" />
          </div>
          <div class="field">
            <label for="marca">Marca <app-help title="Marca" text="Marca comercial del producto (opcional)." /></label>
            <input id="marca" class="input" formControlName="marca" placeholder="Ej. Primor / Costeño" />
          </div>
          <div class="field">
            <label for="pl">Precio de Lista - Crédito (VA) <app-help title="Precio de Lista" text="Precio de venta al crédito sobre el cual se financia la operación (VA). Debe ser mayor o igual al precio al contado (Ley N° 29571)." /></label>
            <input id="pl" class="input" type="number" step="0.01" min="0.01" formControlName="precioCredito" />
            @if (form.errors?.['listaMenorContado']) { <span class="error">El precio de lista debe ser mayor o igual al precio al contado.</span> }
          </div>
          <div class="field">
            <label for="prov">Proveedor (Opcional) <app-help title="Proveedor" text="Distribuidor o proveedor del producto. Campo opcional." /></label>
            <input id="prov" class="input" formControlName="proveedor" placeholder="Ej. Distribuidora Alicorp S.A.A." />
          </div>
          <div class="field">
            <label for="mod">Modalidad de Crédito Permitida <app-help title="Modalidad" text="Fin de mes: pago único en la fecha de pago del ciclo. En meses: cuotas fijas con Método Francés. Ambas: el cliente elige al comprar." /></label>
            <select id="mod" class="input" formControlName="modalidadPermitida">
              @for (m of modalidades; track m.value) { <option [value]="m.value">{{ m.label }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Imagen del Producto <app-help title="Imagen" text="Fotografía del producto o servicio (JPG/PNG, máximo 400 KB). Obligatoria." /></label>
            <div class="img-row">
              <span class="preview">
                @if (imagen()) { <img [src]="imagen()" alt="Vista previa del producto" /> } @else { <app-icon name="cart" [size]="34" /> }
              </span>
              <label class="btn btn-outline btn-sm"><app-icon name="upload" [size]="16" /> Subir imagen
                <input type="file" accept="image/*" hidden (change)="onFile($event)" />
              </label>
            </div>
            @if (imgError()) { <span class="error">{{ imgError() }}</span> }
            @if (submitted() && !imagen()) { <span class="error">La imagen es obligatoria.</span> }
          </div>
          <div class="field">
            <label>Alta / Baja <app-help title="Alta / Baja" text="Los productos dados de baja no se pueden seleccionar en nuevas compras." /></label>
            <label class="switch"><input type="checkbox" formControlName="activo" /> {{ form.controls.activo.value ? 'Alta (Producto activo)' : 'Baja (Producto inactivo)' }}</label>
          </div>
        </div>
        @if (msg(); as m) { <div class="alert" [class.alert-ok]="m.ok" [class.alert-danger]="!m.ok" style="margin-top:14px"><app-icon [name]="m.ok ? 'check' : 'alert'" /> {{ m.text }}</div> }
        <div class="actions" style="margin-top:16px">
          <button type="button" class="btn btn-outline" (click)="reset()"><app-icon name="refresh" /> Limpiar</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid"><app-icon [name]="editingId() ? 'check' : 'plus'" /> {{ editingId() ? 'Guardar cambios' : 'Registrar Producto' }}</button>
        </div>
      </form>

      <section class="card">
        <div class="card-title">
          <h2>Productos y servicios registrados</h2>
          <div class="search"><app-icon name="search" [size]="16" /><input class="input" placeholder="Buscar por producto, marca o proveedor..." (input)="q.set($any($event.target).value)" /></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Producto</th><th>Marca / Proveedor</th><th>Unidad</th><th class="num">Precio Contado</th><th class="num">Precio Lista (VA)</th><th>Modalidad</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (p of rows(); track p.id) {
                <tr>
                  <td><span class="cell-flex">
                    @if (p.imagenUrl) { <img class="thumb" [src]="p.imagenUrl" alt="" /> } @else { <span class="thumb"><app-icon [name]="p.tipoItem === 'SERVICIO' ? 'clock' : 'cart'" [size]="16" /></span> }
                    <strong>{{ p.descripcion }}</strong></span></td>
                  <td>{{ p.marca || '—' }}<br /><small class="muted">{{ p.proveedor || 'Sin proveedor' }}</small></td>
                  <td>{{ p.unidadMedida }}</td>
                  <td class="num">{{ p.precioContado | money }}</td>
                  <td class="num">{{ p.precioCredito | money }}</td>
                  <td>{{ modalidadCorta(p.modalidadPermitida) }}</td>
                  <td><span class="badge" [class.badge-ok]="p.estado === 'ACTIVO'" [class.badge-off]="p.estado !== 'ACTIVO'">{{ p.estado === 'ACTIVO' ? 'Alta' : 'Baja' }}</span></td>
                  <td><span class="cell-flex">
                    <button class="icon-btn" (click)="edit(p)" title="Editar" aria-label="Editar"><app-icon name="edit" [size]="15" /></button>
                    <button class="icon-btn danger" (click)="toggle(p)" [title]="p.estado === 'ACTIVO' ? 'Dar de baja' : 'Dar de alta'" [attr.aria-label]="p.estado === 'ACTIVO' ? 'Dar de baja' : 'Dar de alta'">
                      <app-icon [name]="p.estado === 'ACTIVO' ? 'trash' : 'refresh'" [size]="15" />
                    </button>
                  </span></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">No hay productos registrados.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .img-row { display: flex; align-items: center; gap: 16px; }
    .preview { width: 96px; height: 76px; border-radius: 10px; border: 1px dashed var(--border); background: var(--surface-2); display: grid; place-items: center; overflow: hidden; color: var(--muted); }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
  `,
})
export class Catalogo {
  private readonly catalogo = inject(CatalogoService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly unidades = UNIDADES_MEDIDA;
  protected readonly modalidades = MODALIDADES;
  protected readonly q = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly imagen = signal<string | null>(null);
  protected readonly imgError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly msg = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly form = this.fb.group(
    {
      descripcion: ['', [Validators.required, Validators.maxLength(250)]],
      unidadMedida: ['Unidad', Validators.required],
      tipoItem: ['PRODUCTO' as 'PRODUCTO' | 'SERVICIO'],
      marca: ['', Validators.maxLength(100)],
      proveedor: ['', Validators.maxLength(150)],
      precioContado: [0, [Validators.required, Validators.min(0.01)]],
      precioCredito: [0, [Validators.required, Validators.min(0.01)]],
      modalidadPermitida: ['FIN_MES' as ModalidadPermitida, Validators.required],
      activo: [true],
    },
    { validators: precioListaValidator },
  );

  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.catalogo
      .productosDeMiTienda()
      .filter((p) => !q || [p.descripcion, p.marca ?? '', p.proveedor ?? ''].some((v) => v.toLowerCase().includes(q)));
  });

  modalidadCorta(m: ModalidadPermitida) {
    return modalidadLabel(m);
  }

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    this.imgError.set(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) return this.imgError.set('El archivo debe ser una imagen.');
    if (file.size > MAX_IMG_BYTES) return this.imgError.set('La imagen supera los 400 KB.');
    const reader = new FileReader();
    reader.onload = () => this.imagen.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  edit(p: ProductoServicio) {
    this.editingId.set(p.id);
    this.msg.set(null);
    this.imagen.set(p.imagenUrl);
    this.form.reset({
      descripcion: p.descripcion,
      unidadMedida: p.unidadMedida,
      tipoItem: p.tipoItem,
      marca: p.marca ?? '',
      proveedor: p.proveedor ?? '',
      precioContado: p.precioContado,
      precioCredito: p.precioCredito,
      modalidadPermitida: p.modalidadPermitida,
      activo: p.estado === 'ACTIVO',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.editingId.set(null);
    this.imagen.set(null);
    this.submitted.set(false);
    this.form.reset();
  }

  async save() {
    this.submitted.set(true);
    // Los productos de demostración no tienen imagen: se exige solo al registrar o si se edita uno que ya la tenía.
    const id = this.editingId();
    const requiereImagen = !id || !!this.catalogo.findById(id)?.imagenUrl;
    if (this.form.invalid || (requiereImagen && !this.imagen())) return;
    const v = this.form.getRawValue();
    const datos = {
      descripcion: v.descripcion,
      unidadMedida: v.unidadMedida,
      tipoItem: v.tipoItem,
      marca: v.marca,
      proveedor: v.proveedor,
      precioContado: v.precioContado,
      precioCredito: v.precioCredito,
      modalidadPermitida: v.modalidadPermitida,
      imagenUrl: this.imagen(),
      estado: v.activo ? 'ACTIVO' : 'INACTIVO',
    } as const;
    try {
      const p = id ? await this.catalogo.actualizar(id, datos) : await this.catalogo.registrar(datos);
      this.reset();
      this.msg.set({ ok: true, text: id ? `"${p.descripcion}" actualizado.` : `"${p.descripcion}" registrado en el catálogo.` });
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }

  async toggle(p: ProductoServicio) {
    const alta = p.estado !== 'ACTIVO';
    if (!confirm(`¿Desea dar de ${alta ? 'alta' : 'baja'} a "${p.descripcion}"?`)) return;
    try {
      await this.catalogo.cambiarEstado(p.id, alta);
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }
}
