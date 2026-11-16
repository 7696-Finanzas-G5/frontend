import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
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
import { EstadoCuentaService } from '../../../application/estado-cuenta.service';

/**
 * Estado de cuenta en fecha de corte y liquidación de pago (fin de mes y mora), más cuotas pendientes.
 * Con `allowPayments` = false se muestra en modo consulta (rol Cliente).
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

  protected readonly nombre = computed(() => {
    const c = this.clientes.todos().find((x) => x.id === this.clienteId());
    return c ? nombreCompleto(c) : '';
  });
  protected readonly cond = computed(() => this.creditos.condicionesVigentes(this.clienteId()));
  protected readonly moneda = computed(() => this.cond()?.moneda ?? 'PEN');

  protected readonly resumen = computed(() => {
    const id = this.clienteId();
    return { limite: this.cond()?.limiteCredito ?? 0, deuda: this.creditos.deudaVigente(id), disponible: this.creditos.disponible(id) };
  });

  protected readonly ciclos = computed(() => this.estadoCuenta.ciclosPendientes(this.clienteId()));

  protected readonly estado = computed(() => {
    const ciclo = this.ciclo();
    return ciclo ? this.estadoCuenta.estadoCiclo(this.clienteId(), ciclo, this.fechaEfectiva() || ciclo) : null;
  });

  protected readonly cuotasPend = computed(() => this.estadoCuenta.cuotasPendientes(this.clienteId(), this.fechaEfectiva() || todayIso()));

  protected readonly historial = computed(() => {
    this.estadoCuenta.todosLosPagos();
    return this.estadoCuenta.pagosDe(this.clienteId());
  });

  constructor() {
    // Selecciona el primer ciclo pendiente al cambiar de cliente o al pagar un ciclo
    effect(() => {
      const ciclos = this.ciclos();
      if (!ciclos.includes(this.ciclo())) {
        this.ciclo.set(ciclos[0] ?? '');
        this.fechaEfectiva.set(ciclos[0] ?? '');
      }
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

  protected pagarCiclo() {
    const e = this.estado();
    if (!e) return;
    this.error.set(null);
    const monto = round2(Number(this.montoPago()));
    if (monto !== e.mora.totalExigible) {
      this.error.set(`No se permiten pagos parciales: el pago debe ser exactamente ${e.mora.totalExigible.toFixed(2)}.`);
      return;
    }
    if (!confirm(`¿Registrar el pago total único de ${monto.toFixed(2)}?`)) return;
    try {
      const { imputacion } = this.estadoCuenta.pagarCiclo(this.clienteId(), e.fechaPago, e.fechaEfectiva, monto);
      this.resultado.set({ titulo: `Pago del ciclo con vencimiento ${e.fechaPago.split('-').reverse().join('/')} registrado.`, imp: imputacion });
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  protected pagarCuota(cuota: Cuota, total: number) {
    this.error.set(null);
    const fe = this.fechaEfectiva() || todayIso();
    const fecha = fe > cuota.fechaVencimiento ? fe : cuota.fechaVencimiento;
    if (!confirm(`¿Registrar el pago de la cuota ${cuota.numeroCuota} por ${total.toFixed(2)} con fecha ${fecha.split('-').reverse().join('/')}?`)) return;
    try {
      const { imputacion } = this.estadoCuenta.pagarCuota(cuota.id, fe, total);
      this.resultado.set({ titulo: `Cuota ${cuota.numeroCuota} pagada.`, imp: imputacion });
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }
}
