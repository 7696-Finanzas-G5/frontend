import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoService } from '../../../../catalog/application/catalogo.service';
import { permiteModalidad } from '../../../../catalog/domain/model/producto-servicio';
import { ClientesService } from '../../../../customers/application/clientes.service';
import { nombreCompleto } from '../../../../customers/domain/model/cliente';
import { formatDate, nowIsoMinutes } from '../../../../shared/domain/finance/dates';
import { ModalidadCompra, tasaEfectivaAnual, tasaEfectivaMensual } from '../../../../shared/domain/finance/financial-math';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { FechaPipe, MoneyPipe, PctPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { CreditosService } from '../../../application/creditos.service';
import { descripcionCompra } from '../../../domain/model/compra';

@Component({
  selector: 'app-creditos',
  imports: [ReactiveFormsModule, HelpTip, Icon, PageHeader, MoneyPipe, PctPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="card" title="Registro de Compra al Crédito" subtitle="Venta a fin de mes o en cuotas (Método Francés)"
        help="Cuando la compra en cuotas se realiza antes de la fecha de corte, el sistema contabiliza los días hasta el próximo día de pago como un período de gracia total (dg), capitalizando los intereses antes de calcular las cuotas fijas mensuales (R) de 30 días." />

      <form class="card" [formGroup]="form" (ngSubmit)="confirmar()">
        <div class="card-title"><h2>Parámetros de la Operación al Crédito</h2></div>
        <div class="form-grid">
          <div class="field">
            <label for="cli">Cliente <app-help title="Cliente" text="Seleccione un cliente activo. Se muestra su límite máximo de crédito y el saldo disponible." /></label>
            <select id="cli" class="input" formControlName="idCliente">
              <option [ngValue]="0" disabled>Seleccione un cliente</option>
              @for (c of clientes(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }} (Límite máximo VA: {{ c.limite | money: c.moneda }})</option> }
            </select>
            @if (cond(); as k) { <span class="hint">Crédito disponible: <strong>{{ disponible() | money: k.moneda }}</strong> · Plazo máximo N = {{ k.plazoMaxMeses }} meses</span> }
          </div>
          <div class="field">
            <label for="prod">Producto / Servicio <app-help title="Producto" text="Solo se listan productos activos. El monto financiado es el precio de lista (VA) × cantidad." /></label>
            <select id="prod" class="input" formControlName="idProducto">
              <option [ngValue]="0" disabled>Seleccione un producto</option>
              @for (p of productos(); track p.id) { <option [ngValue]="p.id">{{ p.descripcion }} - Precio de Lista (VA): {{ p.precioCredito | money }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="fc">Fecha y Hora de Compra <app-help title="Fecha de compra" text="Fecha y hora exacta de la venta. Se compara contra la fecha de corte (hasta las 23:59 del día de corte entra al ciclo actual)." /></label>
            <input id="fc" class="input" type="datetime-local" formControlName="fechaHoraCompra" />
            @if (sim(); as s) { <span class="hint">@if (s.esAnteriorAlCorte) { Anterior a la Fecha de Corte: {{ s.fechaCorte | fecha }} } @else { Posterior al corte del mes: pasa al ciclo con corte {{ s.fechaCorte | fecha }} }</span> }
          </div>
          <div class="field">
            <label for="cant">Cantidad <app-help title="Cantidad" text="Número de unidades del producto o servicio. Debe ser mayor a cero." /></label>
            <input id="cant" class="input" type="number" min="1" step="1" formControlName="cantidad" />
          </div>
          <div class="field">
            <label>Modalidad de Compra <app-help title="Modalidad" text="Fin de mes: pago único en la fecha de pago. En meses: cuotas fijas mensuales por Método Francés vencido ordinario." /></label>
            <div class="seg">
              <label [class.on]="v().modalidad === 'FIN_MES'" [class.dis]="!permite('FIN_MES')"><input type="radio" value="FIN_MES" formControlName="modalidad" /> Fin de mes</label>
              <label [class.on]="v().modalidad === 'CUOTAS'" [class.dis]="!permite('CUOTAS')"><input type="radio" value="CUOTAS" formControlName="modalidad" /> En meses</label>
            </div>
          </div>
          @if (v().modalidad === 'CUOTAS') {
            <div class="field">
              <label for="n">Plazo Solicitado (n ≤ N) <app-help title="Plazo" text="Número de cuotas mensuales; no puede superar el máximo permitido al cliente." /></label>
              <select id="n" class="input" formControlName="n">
                @for (n of plazos(); track n) { <option [ngValue]="n">{{ n }} {{ n === 1 ? 'mes' : 'meses' }}{{ n === cond()?.plazoMaxMeses ? ' (Máximo permitido N = ' + n + ')' : '' }}</option> }
              </select>
            </div>
          }
          <div class="field">
            <label>Día de Pago Mensual Pactado <app-help title="Día de pago" text="Definido en la línea de crédito del cliente." /></label>
            <input class="input" readonly [value]="cond() ? 'Día ' + cond()!.diaPago + ' de cada mes (corte día ' + cond()!.diaCorte + ')' : '—'" />
          </div>
          <div class="field">
            <label>Tasa Compensatoria Pactada (i) <app-help title="Tasa" text="Tasa pactada y sus equivalentes diaria (TED) y mensual (TEM), con 7 decimales." /></label>
            <input class="input" readonly [value]="tasaTexto()" />
          </div>
        </div>

        @if (sim(); as s) {
          <div style="margin-top:16px" class="stack">
            @if (s.errores.length) {
              <div class="alert alert-danger"><app-icon name="alert" /><div><strong>Compra rechazada:</strong><ul>@for (e of s.errores; track e) { <li>{{ e }}</li> }</ul></div></div>
            }
            @if (s.finMes; as f) {
              <div class="alert alert-info"><app-icon name="info" />
                <span>Pago único el <strong>{{ s.fechaPago | fecha }}</strong>: capital {{ s.monto | money: moneda() }} + interés compensatorio por {{ f.dias }} días {{ f.interes | money: moneda() }} = <strong>{{ f.total | money: moneda() }}</strong> (si paga en la fecha pactada).</span>
              </div>
            }
            @if (s.cronograma; as c) {
              <div class="alert alert-info"><app-icon name="info" />
                <span><strong>Período de Gracia Total</strong> ({{ v().fechaHoraCompra | fecha }} al {{ c.fechaFinGracia | fecha }} = {{ c.diasGracia }} días): Interés de Gracia (I_g) = {{ c.interesGracia | money: moneda() }}
                  | Deuda Capitalizada al {{ c.fechaFinGracia | fecha }} (VA_cap) = <strong>{{ c.capitalizado | money: moneda() }}</strong> | FF = {{ c.factor.toFixed(7) }} | TEA {{ c.tea | pct }}</span>
              </div>
            }
          </div>
        }
        @if (ok()) { <div class="alert alert-ok" style="margin-top:14px"><app-icon name="check" /> {{ ok() }}</div> }
        @if (error()) { <div class="alert alert-danger" style="margin-top:14px"><app-icon name="alert" /> {{ error() }}</div> }
      </form>

      @if (sim()?.cronograma; as c) {
        <section class="card">
          <div class="card-title"><h2><app-icon name="calendar" /> Cronograma de Pagos - Método Francés Vencido Ordinario (Meses de 30 días)</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Cuota</th><th>Fecha Pago</th><th class="num">Saldo Inicial (SI)</th><th class="num">Interés (I)</th><th class="num">Cuota Fija (R)</th><th class="num">Amortización (A)</th><th class="num">Saldo Final (SF)</th></tr></thead>
              <tbody>
                @for (f of c.filas; track f.k) {
                  <tr><td>{{ f.k }}</td><td>{{ f.fecha | fecha }}</td><td class="num">{{ f.saldoInicial | money: moneda() }}</td><td class="num">{{ f.interes | money: moneda() }}</td>
                    <td class="num"><strong>{{ f.cuota | money: moneda() }}</strong></td><td class="num">{{ f.amortizacion | money: moneda() }}</td><td class="num">{{ f.saldoFinal | money: moneda() }}</td></tr>
                }
              </tbody>
              <tfoot><tr><td colspan="3">Total</td><td class="num">{{ c.totalInteres | money: moneda() }}</td><td class="num">{{ c.totalCuotas | money: moneda() }}</td><td class="num">{{ c.totalAmortizacion | money: moneda() }}</td><td></td></tr></tfoot>
            </table>
          </div>
          <p class="muted" style="font-size:12px;margin:10px 0 0">En la última cuota se aplica el ajuste de cierre (A_n = SI_n) para que el saldo final sea {{ 0 | money: moneda() }}.</p>
        </section>
      }

      <div class="actions">
        <button class="btn btn-primary btn-lg" (click)="confirmar()" [disabled]="!sim() || sim()!.errores.length > 0">
          <app-icon name="plus" /> Confirmar y Registrar Crédito
        </button>
      </div>

      <section class="card">
        <div class="card-title"><h2>Compras recientes al crédito</h2></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Descripción</th><th>Modalidad</th><th class="num">Capital (VA)</th><th>Fecha de pago</th><th>Estado</th></tr></thead>
            <tbody>
              @for (c of recientes(); track c.id) {
                <tr>
                  <td>{{ c.fechaHoraCompra | fecha: true }}</td>
                  <td>{{ c.cliente }}</td>
                  <td>{{ c.descripcion }}</td>
                  <td>{{ c.modalidad === 'FIN_MES' ? 'Fin de mes' : c.numeroCuotas + ' cuotas' }}</td>
                  <td class="num">{{ c.capital | money: c.moneda }}</td>
                  <td>{{ c.fechaPago | fecha }}</td>
                  <td><span class="badge" [class.badge-info]="c.estado === 'REGISTRADA'" [class.badge-ok]="c.estado === 'CANCELADA'" [class.badge-off]="c.estado === 'ANULADA'">{{ c.estado === 'REGISTRADA' ? 'Pendiente' : c.estado === 'CANCELADA' ? 'Cancelada' : 'Anulada' }}</span></td>
                </tr>
              } @empty { <tr><td colspan="7" class="empty">Aún no hay compras registradas.</td></tr> }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .seg { display: inline-flex; border: 1px solid var(--border); border-radius: 9px; overflow: hidden; width: fit-content; }
    .seg label { padding: 0 18px; height: 38px; display: flex; align-items: center; cursor: pointer; font-weight: 500; }
    .seg label + label { border-left: 1px solid var(--border); }
    .seg label.on { background: var(--primary); color: #fff; }
    .seg label.dis { opacity: .45; }
    .seg input { display: none; }
  `,
})
export class Creditos {
  private readonly creditos = inject(CreditosService);
  private readonly clientesService = inject(ClientesService);
  private readonly catalogo = inject(CatalogoService);

  protected readonly ok = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    idCliente: [0, Validators.min(1)],
    idProducto: [0, Validators.min(1)],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    fechaHoraCompra: [nowIsoMinutes(), Validators.required],
    modalidad: ['FIN_MES' as ModalidadCompra],
    n: [1],
  });
  protected readonly v = signal(this.form.getRawValue());

  protected readonly clientes = computed(() =>
    this.clientesService.activosDeMiTienda().map((c) => {
      const k = this.clientesService.condicionVigente(c.id);
      return { id: c.id, nombre: nombreCompleto(c), limite: k?.limiteCredito ?? 0, moneda: k?.moneda ?? 'PEN' };
    }),
  );
  protected readonly productos = this.catalogo.activosDeMiTienda;
  protected readonly producto = computed(() => this.catalogo.productosDeMiTienda().find((p) => p.id === this.v().idProducto));
  protected readonly cond = computed(() => (this.v().idCliente ? this.creditos.condicionesVigentes(this.v().idCliente) : undefined));
  protected readonly moneda = computed(() => this.cond()?.moneda ?? 'PEN');
  protected readonly plazos = computed(() => Array.from({ length: this.cond()?.plazoMaxMeses ?? 1 }, (_, i) => i + 1));
  protected readonly disponible = computed(() => this.creditos.disponible(this.v().idCliente));

  protected readonly tasaTexto = computed(() => {
    const k = this.cond();
    if (!k) return '—';
    const ted = k.tedCompensatoria;
    return `${k.tasaCompensatoriaLabel} (TED: ${(ted * 100).toFixed(7)}% | TEM: ${(tasaEfectivaMensual(ted) * 100).toFixed(7)}% | TEA: ${(tasaEfectivaAnual(ted) * 100).toFixed(4)}%)`;
  });

  protected readonly sim = computed(() => {
    const v = this.v();
    if (!v.idCliente || !v.idProducto || !v.fechaHoraCompra) return null;
    try {
      return this.creditos.simular({ ...v, n: v.modalidad === 'CUOTAS' ? v.n : null });
    } catch {
      return null;
    }
  });

  protected readonly recientes = computed(() => {
    const clientes = new Map(this.clientesService.deMiTienda().map((c) => [c.id, c]));
    return this.creditos
      .todasLasCompras()
      .filter((c) => clientes.has(c.idCliente))
      .sort((a, b) => b.fechaHoraCompra.localeCompare(a.fechaHoraCompra))
      .slice(0, 10)
      .map((c) => ({
        ...c,
        cliente: nombreCompleto(clientes.get(c.idCliente)!),
        descripcion: descripcionCompra(c),
        moneda: this.clientesService.condicionById(c.idCondicion)?.moneda ?? 'PEN',
      }));
  });

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.v.set(this.form.getRawValue());
      this.ok.set(null);
      this.error.set(null);
    });
    // Ajusta la modalidad a la permitida por el producto
    this.form.controls.idProducto.valueChanges.subscribe(() => {
      const p = this.producto();
      if (p && p.modalidadPermitida !== 'AMBAS') this.form.controls.modalidad.setValue(p.modalidadPermitida);
    });
    this.form.controls.idCliente.valueChanges.subscribe(() => {
      const max = this.cond()?.plazoMaxMeses ?? 1;
      if (this.form.controls.n.value > max) this.form.controls.n.setValue(max);
    });
  }

  permite(m: ModalidadCompra): boolean {
    const p = this.producto();
    return !p || permiteModalidad(p, m);
  }

  confirmar() {
    const s = this.sim();
    if (!s || s.errores.length) return;
    const v = this.v();
    try {
      const compra = this.creditos.registrarCompra({ ...v, n: v.modalidad === 'CUOTAS' ? v.n : null });
      const cliente = this.clientes().find((c) => c.id === v.idCliente)?.nombre;
      this.form.reset({ idCliente: v.idCliente, idProducto: 0, cantidad: 1, fechaHoraCompra: nowIsoMinutes(), modalidad: 'FIN_MES', n: 1 });
      this.ok.set(`Crédito #${compra.id} registrado para ${cliente}: ${compra.modalidad === 'FIN_MES' ? 'pago único el ' + formatDate(compra.fechaPago) : compra.numeroCuotas + ' cuotas mensuales'}.`);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
