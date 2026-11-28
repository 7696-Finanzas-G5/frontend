import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CreditosService } from '../../../../credits/application/creditos.service';
import { UsuariosService } from '../../../../iam/application/usuarios.service';
import { Moneda } from '../../../../shared/domain/common';
import {
  CAPITALIZACIONES,
  PERIODOS_TASA,
  TipoTasa,
  tasaEfectivaAnual,
  tasaEfectivaDiaria,
  tasaEfectivaMensual,
} from '../../../../shared/domain/finance/financial-math';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { MoneyPipe, PctPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { ClientesService, GuardarClienteCommand } from '../../../application/clientes.service';
import { Cliente, nombreCompleto } from '../../../domain/model/cliente';
import { CondicionCredito, LIMITE_MAX, LIMITE_MIN, PLAZO_MAX, TasaCondicion, tasaLabel } from '../../../domain/model/condicion-credito';

function condicionesValidator(g: AbstractControl): ValidationErrors | null {
  const errs: ValidationErrors = {};
  const corte = g.get('diaCorte')?.value;
  const pago = g.get('diaPago')?.value;
  if (corte && pago && pago <= corte) errs['pagoAntesDeCorte'] = true;
  if (g.get('tipoTasa')?.value === 'NOMINAL' && !g.get('capitalizacionDias')?.value) errs['sinCapitalizacion'] = true;
  const user = g.get('username')?.value?.trim();
  const clave = g.get('clave')?.value;
  if (user && !g.get('tieneUsuario')?.value && !clave) errs['claveRequerida'] = true;
  return Object.keys(errs).length ? errs : null;
}

@Component({
  selector: 'app-clientes',
  imports: [ReactiveFormsModule, HelpTip, Icon, PageHeader, MoneyPipe, PctPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="users" title="Gestión de Clientes" subtitle="Alta, Baja y Condiciones de Línea de Crédito"
        help="Configure las condiciones financieras pactadas con el vecino. El sistema validará que ninguna compra supere el límite máximo de crédito (VA) ni el número máximo de meses (N), realizando los cálculos internos con mínimo 7 decimales en base a un año de 360 días." />

      <form class="card" [formGroup]="form" (ngSubmit)="save()">
        <div class="card-title"><h2>{{ editingId() ? 'Editar Cliente y Parámetros Financieros' : 'Registro de Cliente y Parámetros Financieros' }}</h2></div>
        <div class="form-grid">
          <div class="field">
            <label for="nom">Nombres del Cliente <app-help title="Nombres" text="Nombres del vecino o residente. Obligatorio." /></label>
            <input id="nom" class="input" formControlName="nombres" placeholder="Ej. Juan" />
          </div>
          <div class="field">
            <label for="ape">Apellidos del Cliente <app-help title="Apellidos" text="Apellidos paterno y materno. Obligatorio." /></label>
            <input id="ape" class="input" formControlName="apellidos" placeholder="Ej. Pérez Gómez" />
          </div>
          <div class="field">
            <label for="dni">DNI / Documento <app-help title="DNI" text="Documento Nacional de Identidad: 8 dígitos. Se protege según la Ley N° 29733." /></label>
            <input id="dni" class="input" formControlName="dni" maxlength="8" inputmode="numeric" placeholder="Ej. 74859612" />
            @if (form.controls.dni.touched && form.controls.dni.invalid) { <span class="error">El DNI debe tener 8 dígitos.</span> }
            @if (dniDuplicado()) { <span class="error">Ya existe un cliente con este DNI en la tienda.</span> }
          </div>
          <div class="field">
            <label for="tel">Teléfono <app-help title="Teléfono" text="Número de contacto del cliente (opcional)." /></label>
            <input id="tel" class="input" formControlName="telefono" placeholder="Ej. 987654321" />
          </div>
          <div class="field full">
            <label for="dir">Dirección / Zona de Residencia <app-help title="Dirección" text="Dirección del cliente dentro de la zona de influencia del negocio." /></label>
            <input id="dir" class="input" formControlName="direccion" placeholder="Ej. Calle Los Cedros 240, San Miguel" />
          </div>

          <div class="field">
            <label for="mon">Moneda del Crédito <app-help title="Moneda" text="Moneda pactada para la cuenta corriente: Soles (PEN) o Dólares (USD)." /></label>
            <select id="mon" class="input" formControlName="moneda"><option value="PEN">Soles (S/ - PEN)</option><option value="USD">Dólares (US$ - USD)</option></select>
          </div>
          <div class="field">
            <label for="lim">Límite Máximo de Crédito (VA) <app-help title="Límite de crédito" text="Monto máximo de deuda acumulada permitido para el cliente: entre 50.00 y 50,000.00. Se rechazan compras que lo excedan." /></label>
            <input id="lim" class="input" type="number" step="0.01" formControlName="limiteCredito" />
            @if (form.controls.limiteCredito.invalid) { <span class="error">Debe estar entre 50.00 y 50,000.00.</span> }
          </div>
          <div class="field">
            <label for="nmax">Máximo Número de Meses (N) <app-help title="Plazo máximo" text="Número máximo de cuotas mensuales que puede elegir el cliente (1 a 24)." /></label>
            <select id="nmax" class="input" formControlName="plazoMaxMeses">
              @for (n of meses; track n) { <option [ngValue]="n">{{ n }} {{ n === 1 ? 'mes' : 'meses' }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="tt">Tipo de Tasa de Interés Pactada <app-help title="Tipo de tasa" text="Efectiva: ya incluye la capitalización (ej. TEA). Nominal: requiere indicar la frecuencia de capitalización (ej. TNA capitalizable mensualmente)." /></label>
            <select id="tt" class="input" formControlName="tipoTasa"><option value="EFECTIVA">Tasa Efectiva (TEA / TEM)</option><option value="NOMINAL">Tasa Nominal (TNA con capitalización)</option></select>
          </div>
          <div class="field">
            <label for="per">Período de la Tasa <app-help title="Período" text="Período al que corresponde la tasa ingresada, en días comerciales (360 = anual, 30 = mensual)." /></label>
            <select id="per" class="input" formControlName="periodoTasaDias">
              @for (p of periodos; track p.dias) { <option [ngValue]="p.dias">{{ p.label }}</option> }
            </select>
          </div>
          @if (v().tipoTasa === 'NOMINAL') {
            <div class="field">
              <label for="cap">Capitalización (m) <app-help title="Capitalización" text="Cada cuántos días se capitalizan los intereses de la tasa nominal. Obligatorio si la tasa es nominal." /></label>
              <select id="cap" class="input" formControlName="capitalizacionDias">
                @for (c of capitalizaciones; track c.dias) { <option [ngValue]="c.dias">{{ c.label }} ({{ c.dias }} días)</option> }
              </select>
            </div>
          }
          <div class="field">
            <label for="ic">Tasa de Interés Compensatoria (i) % <app-help title="Tasa compensatoria" text="Porcentaje pactado por el uso del dinero (0 % < i ≤ 100 %), con 4 decimales. No debe superar la tasa máxima fijada por el BCRP." /></label>
            <input id="ic" class="input" type="number" step="0.0001" formControlName="tasaCompensatoria" />
            @if (form.controls.tasaCompensatoria.invalid) { <span class="error">Debe ser mayor a 0 y como máximo 100.</span> }
          </div>
          <div class="field">
            <label for="im">Tasa de Interés Moratoria (I) % <app-help title="Tasa moratoria" text="Porcentaje que se aplica sobre el total exigible por cada día de atraso (0 % ≤ I ≤ 100 %). Se pacta la mora automática (art. 1333° del Código Civil)." /></label>
            <input id="im" class="input" type="number" step="0.0001" formControlName="tasaMoratoria" />
            @if (form.controls.tasaMoratoria.invalid) { <span class="error">Debe estar entre 0 y 100.</span> }
          </div>
          <div class="field">
            <label for="dc">Fecha de Corte Mensual <app-help title="Fecha de corte" text="Día del mes (1 a 28) en que se cierra el ciclo y se genera el listado de pago. Las compras posteriores pasan al mes siguiente." /></label>
            <select id="dc" class="input" formControlName="diaCorte">
              @for (d of diasCorte; track d) { <option [ngValue]="d">Día {{ d }} de cada mes</option> }
            </select>
          </div>
          <div class="field">
            <label for="hc">Hora de Corte <app-help title="Hora de corte" text="Hora de Lima en que se cierra el ciclo. Las compras anteriores entran al listado del mes; desde esa hora pasan al mes siguiente. Puede indicar segundos. Por defecto 23:59:00." /></label>
            <input id="hc" class="input" type="time" step="1" formControlName="horaCorte" />
            @if (form.controls.horaCorte.invalid) { <span class="error">Indique la hora de corte.</span> }
          </div>
          <div class="field">
            <label for="dp">Fecha de Pago Mensual Pactada <app-help title="Fecha de pago" text="Día del mes (1 a 30) en que el cliente debe pagar. Debe ser posterior al día de corte." /></label>
            <select id="dp" class="input" formControlName="diaPago">
              @for (d of diasPago; track d) { <option [ngValue]="d">Día {{ d }} de cada mes</option> }
            </select>
            @if (form.errors?.['pagoAntesDeCorte']) { <span class="error">El día de pago debe ser posterior al día de corte.</span> }
          </div>

          <div class="field full">
            <div class="alert alert-info"><app-icon name="percent" />
              <span>Tasas equivalentes (base 360 días): <strong>TED {{ preview().ted | pct: 7 }}</strong> · <strong>TEM {{ preview().tem | pct: 7 }}</strong> · <strong>TEA {{ preview().tea | pct: 4 }}</strong>
                · TED moratoria {{ preview().tedM | pct: 7 }}</span>
            </div>
          </div>

          <div class="field">
            <label for="usr">Usuario del Cliente (opcional) <app-help title="Acceso del cliente" text="Si se indica, el cliente podrá ingresar con el rol Cliente / Vecino para consultar su estado de cuenta." /></label>
            <input id="usr" class="input" formControlName="username" placeholder="Ej. juan.perez" autocomplete="off" />
            @if (usuarioDuplicado()) { <span class="error">Este nombre de usuario ya está en uso.</span> }
          </div>
          <div class="field">
            <label for="cl">Contraseña del Cliente <app-help title="Contraseña" text="8 a 64 caracteres; se almacena cifrada. Al editar, déjela vacía para mantener la actual." /></label>
            <input id="cl" class="input" type="password" formControlName="clave" autocomplete="new-password" />
            @if (form.errors?.['claveRequerida']) { <span class="error">Ingrese una contraseña para el nuevo usuario.</span> }
            @if (form.controls.clave.invalid) { <span class="error">Debe tener entre 8 y 64 caracteres.</span> }
          </div>
          <div class="field">
            <label>Alta / Baja <app-help title="Alta / Baja" text="Un cliente dado de baja no puede realizar nuevas compras al crédito." /></label>
            <label class="switch"><input type="checkbox" formControlName="activo" /> {{ v().activo ? 'Alta (Cliente habilitado)' : 'Baja (Cliente deshabilitado)' }}</label>
          </div>
        </div>
        @if (msg(); as m) { <div class="alert" [class.alert-ok]="m.ok" [class.alert-danger]="!m.ok" style="margin-top:14px"><app-icon [name]="m.ok ? 'check' : 'alert'" /> {{ m.text }}</div> }
        <div class="actions" style="margin-top:16px">
          <button type="button" class="btn btn-outline" (click)="reset()"><app-icon name="refresh" /> Limpiar</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || dniDuplicado() || usuarioDuplicado()">
            <app-icon [name]="editingId() ? 'check' : 'plus'" /> {{ editingId() ? 'Guardar cambios' : 'Registrar Cliente' }}
          </button>
        </div>
      </form>

      <section class="card">
        <div class="card-title">
          <h2>Clientes registrados en la tienda</h2>
          <div class="search"><app-icon name="search" [size]="16" /><input class="input" placeholder="Buscar por nombre o DNI..." (input)="q.set($any($event.target).value)" /></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th>DNI</th><th class="num">Límite (VA)</th><th class="num">Disponible</th><th>Plazo (N)</th><th>Tasa Compensatoria (i)</th><th>Tasa Moratoria (I)</th><th>Corte / Pago</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.cliente.id) {
                <tr>
                  <td><span class="cell-flex"><span class="avatar">{{ r.cliente.nombres[0] }}{{ r.cliente.apellidos[0] }}</span><strong>{{ nombre(r.cliente) }}</strong></span></td>
                  <td class="mono">{{ r.cliente.dni }}</td>
                  <td class="num">{{ r.cond?.limiteCredito | money: r.cond?.moneda ?? 'PEN' }}</td>
                  <td class="num">{{ r.disponible | money: r.cond?.moneda ?? 'PEN' }}</td>
                  <td>{{ r.cond?.plazoMaxMeses }} meses</td>
                  <td>{{ tasa(r.cond, 'COMPENSATORIA') }}</td>
                  <td>{{ tasa(r.cond, 'MORATORIA') }}</td>
                  <td>Día {{ r.cond?.diaCorte }} / Día {{ r.cond?.diaPago }}</td>
                  <td><span class="badge" [class.badge-ok]="r.cliente.estado === 'ACTIVO'" [class.badge-off]="r.cliente.estado !== 'ACTIVO'">{{ r.cliente.estado === 'ACTIVO' ? 'Alta' : 'Baja' }}</span></td>
                  <td><span class="cell-flex">
                    <button class="icon-btn" (click)="edit(r.cliente)" title="Editar" aria-label="Editar"><app-icon name="edit" [size]="15" /></button>
                    <button class="icon-btn danger" (click)="toggle(r.cliente)" [title]="r.cliente.estado === 'ACTIVO' ? 'Dar de baja' : 'Dar de alta'" [attr.aria-label]="r.cliente.estado === 'ACTIVO' ? 'Dar de baja' : 'Dar de alta'">
                      <app-icon [name]="r.cliente.estado === 'ACTIVO' ? 'trash' : 'refresh'" [size]="15" />
                    </button>
                  </span></td>
                </tr>
              } @empty {
                <tr><td colspan="10" class="empty">No hay clientes registrados.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Clientes {
  private readonly clientes = inject(ClientesService);
  private readonly creditos = inject(CreditosService);
  private readonly usuarios = inject(UsuariosService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly periodos = PERIODOS_TASA;
  protected readonly capitalizaciones = CAPITALIZACIONES;
  protected readonly meses = Array.from({ length: PLAZO_MAX }, (_, i) => i + 1);
  protected readonly diasCorte = Array.from({ length: 28 }, (_, i) => i + 1);
  protected readonly diasPago = Array.from({ length: 30 }, (_, i) => i + 1);
  protected readonly q = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly msg = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly form = this.fb.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      telefono: ['', Validators.maxLength(20)],
      direccion: ['', Validators.maxLength(250)],
      moneda: ['PEN' as Moneda],
      limiteCredito: [500, [Validators.required, Validators.min(LIMITE_MIN), Validators.max(LIMITE_MAX)]],
      plazoMaxMeses: [3, [Validators.required, Validators.min(1), Validators.max(PLAZO_MAX)]],
      tipoTasa: ['EFECTIVA' as TipoTasa],
      periodoTasaDias: [360],
      capitalizacionDias: [30 as number | null],
      tasaCompensatoria: [20, [Validators.required, Validators.min(0.0001), Validators.max(100)]],
      tasaMoratoria: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      diaCorte: [20, [Validators.required, Validators.min(1), Validators.max(28)]],
      horaCorte: ['23:59:00', [Validators.required, Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/)]],
      diaPago: [26, [Validators.required, Validators.min(1), Validators.max(30)]],
      username: ['', Validators.maxLength(80)],
      clave: ['', [Validators.minLength(8), Validators.maxLength(64)]],
      tieneUsuario: [false],
      activo: [true],
    },
    { validators: condicionesValidator },
  );
  protected readonly v = signal(this.form.getRawValue());

  /** Vista previa de tasas equivalentes (base 360 días). */
  protected readonly preview = computed(() => {
    const v = this.v();
    const cap = v.tipoTasa === 'NOMINAL' ? v.capitalizacionDias : null;
    try {
      const ted = tasaEfectivaDiaria({ tipo: v.tipoTasa, valor: (v.tasaCompensatoria || 0) / 100, periodoDias: v.periodoTasaDias, capitalizacionDias: cap });
      const tedM = tasaEfectivaDiaria({ tipo: v.tipoTasa, valor: (v.tasaMoratoria || 0) / 100, periodoDias: v.periodoTasaDias, capitalizacionDias: cap });
      return { ted, tem: tasaEfectivaMensual(ted), tea: tasaEfectivaAnual(ted), tedM };
    } catch {
      return { ted: NaN, tem: NaN, tea: NaN, tedM: NaN };
    }
  });

  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.clientes
      .deMiTienda()
      .filter((c) => !q || nombreCompleto(c).toLowerCase().includes(q) || c.dni.includes(q))
      .map((cliente) => ({
        cliente,
        cond: this.clientes.condicionVigente(cliente.id),
        disponible: cliente.disponible,
      }));
  });

  protected readonly dniDuplicado = computed(() => {
    this.clientes.todos();
    const dni = this.v().dni;
    return dni.length === 8 && this.clientes.isDniTaken(dni, this.editingId());
  });
  protected readonly usuarioDuplicado = computed(() => {
    this.usuarios.usuarios();
    const id = this.editingId();
    const own = id ? this.clientes.findById(id)?.idUsuario : null;
    return !!this.v().username.trim() && this.usuarios.isUsernameTaken(this.v().username, own);
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.v.set(this.form.getRawValue()));
  }

  protected readonly nombre = nombreCompleto;

  protected tasa(cond: CondicionCredito | undefined, finalidad: TasaCondicion['finalidad']) {
    return tasaLabel(cond, finalidad);
  }

  edit(c: Cliente) {
    const cond = this.clientes.condicionVigente(c.id);
    const comp = cond?.tasas.find((t) => t.finalidad === 'COMPENSATORIA');
    const mora = cond?.tasas.find((t) => t.finalidad === 'MORATORIA');
    const user = this.clientes.findById(c.id);
    const pct = (x: number) => Math.round(x * 1e6) / 1e4;
    this.editingId.set(c.id);
    this.msg.set(null);
    this.form.reset({
      nombres: c.nombres,
      apellidos: c.apellidos,
      dni: c.dni,
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      moneda: cond?.moneda ?? 'PEN',
      limiteCredito: cond?.limiteCredito ?? 500,
      plazoMaxMeses: cond?.plazoMaxMeses ?? 3,
      tipoTasa: comp?.tipoTasa ?? 'EFECTIVA',
      periodoTasaDias: comp?.periodoTasaDias ?? 360,
      capitalizacionDias: comp?.capitalizacionDias ?? 30,
      tasaCompensatoria: comp ? pct(comp.valorTasa) : 20,
      tasaMoratoria: mora ? pct(mora.valorTasa) : 10,
      diaCorte: cond?.diaCorte ?? 20,
      horaCorte: cond?.horaCorte ?? '23:59:00',
      diaPago: cond?.diaPago ?? 26,
      username: user?.username ?? '',
      clave: '',
      tieneUsuario: !!user?.username,
      activo: c.estado === 'ACTIVO',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.editingId.set(null);
    this.form.reset();
  }

  async save() {
    if (this.form.invalid || this.dniDuplicado() || this.usuarioDuplicado()) return;
    const v = this.form.getRawValue();
    const cap = v.tipoTasa === 'NOMINAL' ? v.capitalizacionDias : null;
    const tasa = (finalidad: TasaCondicion['finalidad'], valor: number): TasaCondicion => ({
      finalidad,
      tipoTasa: v.tipoTasa,
      valorTasa: valor / 100,
      periodoTasaDias: v.periodoTasaDias,
      capitalizacionDias: cap,
    });
    const cmd: GuardarClienteCommand = {
      datos: { nombres: v.nombres, apellidos: v.apellidos, dni: v.dni, telefono: v.telefono, direccion: v.direccion },
      terminos: {
        moneda: v.moneda,
        limiteCredito: v.limiteCredito,
        plazoMaxMeses: v.plazoMaxMeses,
        diaCorte: v.diaCorte,
        horaCorte: v.horaCorte.length === 5 ? `${v.horaCorte}:00` : v.horaCorte,
        diaPago: v.diaPago,
        tasas: [tasa('COMPENSATORIA', v.tasaCompensatoria), tasa('MORATORIA', v.tasaMoratoria)],
      },
      activo: v.activo,
      acceso: v.username.trim() ? { username: v.username, clave: v.clave } : null,
    };
    try {
      const id = this.editingId();
      const c = id ? await this.clientes.actualizar(id, cmd) : await this.clientes.registrar(cmd);
      this.reset();
      this.msg.set({ ok: true, text: id ? `Cliente ${nombreCompleto(c)} actualizado.` : `Cliente ${nombreCompleto(c)} registrado con su línea de crédito.` });
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }

  async toggle(c: Cliente) {
    const alta = c.estado !== 'ACTIVO';
    if (!confirm(`¿Desea dar de ${alta ? 'alta' : 'baja'} a ${nombreCompleto(c)}?`)) return;
    try {
      await this.clientes.cambiarEstado(c.id, alta);
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }
}
