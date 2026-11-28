import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreditosService } from '../../../../credits/application/creditos.service';
import { Cuota } from '../../../../credits/domain/model/cuota';
import { ClientesService } from '../../../../customers/application/clientes.service';
import { nombreCompleto } from '../../../../customers/domain/model/cliente';
import { todayIso } from '../../../../shared/domain/finance/dates';
import { Imputacion, round2 } from '../../../../shared/domain/finance/financial-math';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { FechaPipe, MoneyPipe, PctPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { CuotaConMora, EstadoCicloView, EstadoCuentaService } from '../../../application/estado-cuenta.service';
import { Pago } from '../../../domain/model/pago';

/**
 * Estado de cuenta en fecha de corte y liquidación de pago (fin de mes y mora), más cuotas pendientes.
 * Los montos los calcula el backend; con `allowPayments` = false se muestra en modo consulta (rol Cliente).
 */
@Component({
  selector: 'app-estado-cuenta',
  imports: [FormsModule, HelpTip, Icon, MoneyPipe, PctPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estado-cuenta.html',
  styleUrl: './estado-cuenta.scss',
})
export class EstadoCuenta {
  readonly clienteId = input.required<number>();
  readonly allowPayments = input(true);

  private readonly estadoCuenta = inject(EstadoCuentaService);
  private readonly creditos = inject(CreditosService);
  private readonly clientes = inject(ClientesService);

  protected readonly ciclo = signal<string>('');
  protected readonly fechaEfectiva = signal<string>('');
  protected readonly montoPago = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<{ titulo: string; imp: Imputacion } | null>(null);
  protected readonly procesando = signal(false);

  /** Datos consultados al backend. */
  protected readonly ciclos = signal<string[]>([]);
  protected readonly estado = signal<EstadoCicloView | null>(null);
  protected readonly cuotasPend = signal<CuotaConMora[]>([]);
  protected readonly historial = signal<Pago[]>([]);
  /** Se incrementa tras cada pago para volver a consultar. */
  private readonly version = signal(0);
  private seq = 0;

  protected readonly nombre = computed(() => {
    const c = this.clientes.findById(this.clienteId());
    return c ? nombreCompleto(c) : '';
  });
  protected readonly cond = computed(() => this.creditos.condicionesVigentes(this.clienteId()));
  protected readonly moneda = computed(() => this.cond()?.moneda ?? 'PEN');

  protected readonly resumen = computed(() => {
    const id = this.clienteId();
    return { limite: this.cond()?.limiteCredito ?? 0, deuda: this.creditos.deudaVigente(id), disponible: this.creditos.disponible(id) };
  });

  constructor() {
    // Ciclos pendientes e historial: al cambiar de cliente o tras un pago
    effect(() => {
      const id = this.clienteId();
      this.version();
      untracked(() => this.cargarCliente(id));
    });
    // Liquidación del ciclo y cuotas con la mora a la fecha efectiva
    effect(() => {
      const id = this.clienteId();
      const ciclo = this.ciclo();
      const fe = this.fechaEfectiva();
      this.version();
      untracked(() => this.cargarDetalle(id, ciclo, fe));
    });
    // Precarga el monto exacto exigible
    effect(() => this.montoPago.set(this.estado()?.mora.totalExigible ?? null));
  }

  protected selectCiclo(c: string) {
    this.ciclo.set(c);
    this.fechaEfectiva.set(c);
    this.resultado.set(null);
    this.error.set(null);
  }

  protected async pagarCiclo() {
    const e = this.estado();
    if (!e || this.procesando()) return;
    this.error.set(null);
    const monto = round2(Number(this.montoPago()));
    if (monto !== e.mora.totalExigible) {
      this.error.set(`No se permiten pagos parciales: el pago debe ser exactamente ${e.mora.totalExigible.toFixed(2)}.`);
      return;
    }
    if (!confirm(`¿Registrar el pago total único de ${monto.toFixed(2)}?`)) return;
    this.procesando.set(true);
    try {
      const { imputacion } = await this.estadoCuenta.pagarCiclo(this.clienteId(), e.fechaPago, e.fechaEfectiva, monto);
      this.resultado.set({ titulo: `Pago del ciclo con vencimiento ${e.fechaPago.split('-').reverse().join('/')} registrado.`, imp: imputacion });
      // El ciclo pagado ya no existe: se deselecciona y se elige el siguiente pendiente al recargar
      this.ciclo.set('');
      this.estado.set(null);
      this.version.update((v) => v + 1);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.procesando.set(false);
    }
  }

  /** Genera ahora el listado del ciclo (el backend lo rechaza si aún no pasó la fecha y hora de corte). */
  protected async generarListado() {
    const e = this.estado();
    if (!e || this.procesando()) return;
    this.error.set(null);
    this.procesando.set(true);
    try {
      await this.estadoCuenta.generarListado(this.clienteId(), e.fechaPago);
      this.version.update((v) => v + 1);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.procesando.set(false);
    }
  }

  protected async pagarCuota(cuota: Cuota, total: number) {
    if (this.procesando()) return;
    this.error.set(null);
    const fe = this.fechaEfectiva() || todayIso();
    const fecha = fe > cuota.fechaVencimiento ? fe : cuota.fechaVencimiento;
    if (!confirm(`¿Registrar el pago de la cuota ${cuota.numeroCuota} por ${total.toFixed(2)} con fecha ${fecha.split('-').reverse().join('/')}?`)) return;
    this.procesando.set(true);
    try {
      const { imputacion } = await this.estadoCuenta.pagarCuota(this.clienteId(), cuota.id, fe, total);
      this.resultado.set({ titulo: `Cuota ${cuota.numeroCuota} pagada.`, imp: imputacion });
      this.version.update((v) => v + 1);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.procesando.set(false);
    }
  }

  private async cargarCliente(id: number) {
    try {
      const [ciclos, pagos] = await Promise.all([this.estadoCuenta.ciclosPendientes(id), this.estadoCuenta.pagosDe(id)]);
      if (id !== this.clienteId()) return;
      this.ciclos.set(ciclos);
      this.historial.set(pagos);
      // Selecciona el primer ciclo pendiente al cambiar de cliente o al pagar un ciclo
      if (!ciclos.includes(this.ciclo())) {
        this.ciclo.set(ciclos[0] ?? '');
        this.fechaEfectiva.set(ciclos[0] ?? '');
      }
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  private async cargarDetalle(id: number, ciclo: string, fechaEfectiva: string) {
    const req = ++this.seq;
    try {
      const [estado, cuotas] = await Promise.all([
        ciclo ? this.estadoCuenta.estadoCiclo(id, ciclo, fechaEfectiva || ciclo) : Promise.resolve(null),
        this.estadoCuenta.cuotasPendientes(id, fechaEfectiva || todayIso()),
      ]);
      if (req !== this.seq) return; // respuesta obsoleta
      this.estado.set(estado);
      this.cuotasPend.set(cuotas);
    } catch (e) {
      if (req === this.seq) this.error.set((e as Error).message);
    }
  }
}
