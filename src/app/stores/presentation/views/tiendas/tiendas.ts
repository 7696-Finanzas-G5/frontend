import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../../../iam/application/usuarios.service';
import { CLAVE_MAX, CLAVE_MIN } from '../../../../iam/domain/model/usuario';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { TiendasService } from '../../../application/tiendas.service';
import { GIROS_NEGOCIO, RUC_PATTERN, Tienda } from '../../../domain/model/tienda';

@Component({
  selector: 'app-tiendas',
  imports: [ReactiveFormsModule, HelpTip, Icon, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="store" title="Administrador del Sistema" subtitle="Alta y Baja de Tiendas Multi-giro"
        help="Complete los datos del establecimiento. El administrador del sistema puede dar de alta o baja tiendas, asignar usuarios responsables y clasificar cada negocio por giro." />

      <form class="card" [formGroup]="form" (ngSubmit)="save()">
        <div class="card-title"><h2>{{ editingId() ? 'Editar establecimiento' : 'Registro de establecimiento' }}</h2></div>
        <div class="form-grid">
          <div class="field">
            <label for="nc">Nombre Comercial <app-help title="Nombre Comercial" text="Nombre con el que el negocio es conocido en el barrio. Obligatorio, máximo 120 caracteres." /></label>
            <div class="input-icon"><app-icon name="store" /><input id="nc" class="input" formControlName="nombreComercial" placeholder="Ej. Bodega San Pedro" /></div>
          </div>
          <div class="field">
            <label for="ruc">RUC <app-help title="RUC" text="Registro Único de Contribuyentes: 11 dígitos, inicia con 10 (persona natural) o 20 (persona jurídica)." /></label>
            <div class="input-icon"><app-icon name="doc" /><input id="ruc" class="input" formControlName="ruc" placeholder="Ej. 20123456789" maxlength="11" inputmode="numeric" /></div>
            @if (form.controls.ruc.touched && form.controls.ruc.invalid) { <span class="error">Ingrese un RUC válido de 11 dígitos (10… o 20…).</span> }
            @if (rucDuplicado()) { <span class="error">Ya existe una tienda con este RUC.</span> }
          </div>
          <div class="field">
            <label for="giro">Giro del Negocio <app-help title="Giro" text="Rubro del establecimiento: bodega, frutería, carnicería, panadería, peluquería, spa, entre otros." /></label>
            <select id="giro" class="input" formControlName="giroNegocio">
              @for (g of giros; track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="dir">Dirección / Zona de Influencia <app-help title="Dirección" text="Dirección del local y zona del barrio donde opera. Máximo 250 caracteres." /></label>
            <div class="input-icon"><app-icon name="home" /><input id="dir" class="input" formControlName="direccion" placeholder="Ej. Av. Los Olivos 123, Urb. San Martín" /></div>
          </div>
          <div class="field">
            <label for="au">Usuario Administrador <app-help title="Usuario Administrador" text="Credencial de acceso del Administrador del Negocio responsable de la tienda (4 a 80 caracteres)." /></label>
            <div class="input-icon"><app-icon name="user" /><input id="au" class="input" formControlName="adminUsername" placeholder="Ej. bodega.sanpedro" autocomplete="off" /></div>
            @if (usuarioDuplicado()) { <span class="error">Este nombre de usuario ya está en uso.</span> }
          </div>
          <div class="field">
            <label for="ac">Contraseña del Administrador <app-help title="Contraseña" text="De 8 a 64 caracteres. Se almacena cifrada. Al editar, déjela vacía para mantener la actual." /></label>
            <div class="input-icon"><app-icon name="lock" /><input id="ac" class="input" type="password" formControlName="adminClave" [placeholder]="editingId() ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'" autocomplete="new-password" /></div>
            @if (form.controls.adminClave.touched && form.controls.adminClave.invalid) { <span class="error">Debe tener entre 8 y 64 caracteres.</span> }
          </div>
          <div class="field">
            <label>Alta / Baja <app-help title="Alta / Baja" text="Una tienda dada de baja no puede iniciar sesión ni registrar créditos; su información se conserva." /></label>
            <label class="switch"><input type="checkbox" formControlName="activa" /> {{ form.controls.activa.value ? 'Alta (Tienda activa)' : 'Baja (Tienda inactiva)' }}</label>
          </div>
        </div>
        @if (msg(); as m) { <div class="alert" [class.alert-ok]="m.ok" [class.alert-danger]="!m.ok" style="margin-top:14px"><app-icon [name]="m.ok ? 'check' : 'alert'" /> {{ m.text }}</div> }
        <div class="actions" style="margin-top:16px">
          <button type="button" class="btn btn-outline" (click)="reset()"><app-icon name="refresh" /> Limpiar</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || rucDuplicado() || usuarioDuplicado()">
            <app-icon [name]="editingId() ? 'check' : 'plus'" /> {{ editingId() ? 'Guardar cambios' : 'Registrar Tienda' }}
          </button>
        </div>
      </form>

      <section class="card">
        <div class="card-title">
          <h2>Tiendas registradas</h2>
          <div class="search"><app-icon name="search" [size]="16" /><input class="input" placeholder="Buscar por nombre, RUC o zona..." (input)="q.set($any($event.target).value)" /></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nombre Comercial</th><th>RUC</th><th>Giro</th><th>Zona</th><th>Usuario Administrador</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.t.id) {
                <tr>
                  <td><span class="cell-flex"><span class="thumb"><app-icon name="store" [size]="16" /></span><strong>{{ r.t.nombreComercial }}</strong></span></td>
                  <td class="mono">{{ r.t.ruc }}</td>
                  <td>{{ r.t.giroNegocio }}</td>
                  <td>{{ r.t.direccion }}</td>
                  <td>{{ r.admin }}</td>
                  <td><span class="badge" [class.badge-ok]="r.t.estado === 'ACTIVA'" [class.badge-off]="r.t.estado !== 'ACTIVA'">{{ r.t.estado === 'ACTIVA' ? 'Alta' : 'Baja' }}</span></td>
                  <td><span class="cell-flex">
                    <button class="icon-btn" (click)="edit(r.t)" title="Editar" aria-label="Editar"><app-icon name="edit" [size]="15" /></button>
                    <button class="icon-btn danger" (click)="toggle(r.t)" [title]="r.t.estado === 'ACTIVA' ? 'Dar de baja' : 'Dar de alta'" [attr.aria-label]="r.t.estado === 'ACTIVA' ? 'Dar de baja' : 'Dar de alta'">
                      <app-icon [name]="r.t.estado === 'ACTIVA' ? 'trash' : 'refresh'" [size]="15" />
                    </button>
                  </span></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">No se encontraron tiendas.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Tiendas {
  private readonly tiendas = inject(TiendasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly giros = GIROS_NEGOCIO;
  protected readonly q = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly msg = signal<{ ok: boolean; text: string } | null>(null);
  private readonly claveValidators = [Validators.minLength(CLAVE_MIN), Validators.maxLength(CLAVE_MAX)];

  protected readonly form = this.fb.group({
    nombreComercial: ['', [Validators.required, Validators.maxLength(120)]],
    ruc: ['', [Validators.required, Validators.pattern(RUC_PATTERN)]],
    giroNegocio: ['Bodega', Validators.required],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
    adminUsername: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(80)]],
    adminClave: ['', [Validators.required, ...this.claveValidators]],
    activa: [true],
  });
  private readonly value = signal(this.form.getRawValue());

  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    this.usuarios.usuarios();
    return this.tiendas
      .tiendas()
      .filter((t) => !q || [t.nombreComercial, t.ruc, t.direccion, t.giroNegocio].some((v) => v.toLowerCase().includes(q)))
      .map((t) => ({ t, admin: t.adminUsername ?? this.usuarios.adminDeTienda(t.id)?.username ?? '—' }));
  });
  protected readonly rucDuplicado = computed(() => !!this.value().ruc && this.tiendas.isRucTaken(this.value().ruc, this.editingId()));
  protected readonly usuarioDuplicado = computed(() => {
    this.usuarios.usuarios();
    const id = this.editingId();
    const own = id ? this.usuarios.adminDeTienda(id)?.id : null;
    return !!this.value().adminUsername.trim() && this.usuarios.isUsernameTaken(this.value().adminUsername, own);
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.value.set(this.form.getRawValue()));
  }

  edit(t: Tienda) {
    this.editingId.set(t.id);
    this.msg.set(null);
    this.form.controls.adminClave.setValidators(this.claveValidators);
    this.form.reset({
      nombreComercial: t.nombreComercial,
      ruc: t.ruc,
      giroNegocio: t.giroNegocio,
      direccion: t.direccion,
      adminUsername: t.adminUsername ?? this.usuarios.adminDeTienda(t.id)?.username ?? '',
      adminClave: '',
      activa: t.estado === 'ACTIVA',
    });
    this.form.controls.adminClave.updateValueAndValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.editingId.set(null);
    this.form.controls.adminClave.setValidators([Validators.required, ...this.claveValidators]);
    this.form.reset();
  }

  async save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const cmd = {
      datos: { nombreComercial: v.nombreComercial, ruc: v.ruc, giroNegocio: v.giroNegocio, direccion: v.direccion },
      activa: v.activa,
      adminUsername: v.adminUsername,
      adminClave: v.adminClave,
    };
    try {
      const id = this.editingId();
      const t = id ? await this.tiendas.actualizar(id, cmd) : await this.tiendas.registrar(cmd);
      this.reset();
      this.msg.set({ ok: true, text: id ? `Tienda "${t.nombreComercial}" actualizada.` : `Tienda "${t.nombreComercial}" registrada con su administrador "${v.adminUsername}".` });
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }

  async toggle(t: Tienda) {
    const alta = t.estado !== 'ACTIVA';
    if (!confirm(`¿Desea dar de ${alta ? 'alta' : 'baja'} a "${t.nombreComercial}"?`)) return;
    try {
      await this.tiendas.cambiarEstado(t.id, alta);
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }
}
