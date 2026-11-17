import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../iam/application/auth.service';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { EstadoCuenta } from '../../components/estado-cuenta/estado-cuenta';

@Component({
  selector: 'app-mi-cuenta',
  imports: [PageHeader, EstadoCuenta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="receipt" title="Mi Estado de Cuenta" subtitle="Consulta de compras, cuotas, intereses y crédito disponible"
        help="Aquí puede revisar sus compras al crédito, el monto a pagar en cada fecha de pago y su cronograma de cuotas. Los pagos se registran en la tienda." />
      @if (auth.clienteId(); as id) {
        <div class="card field">
          <label for="mi-cuenta-apartado">Apartado</label>
          <select id="mi-cuenta-apartado" class="input" #selector
            [value]="apartado()" (change)="apartado.set(selector.value)">
            <option value="todo">Todo</option>
            <option value="resumen">Resumen al corte</option>
            <option value="liquidacion">Liquidación de pago</option>
            <option value="cuotas">Cuotas pendientes</option>
            <option value="historial">Historial de pagos</option>
          </select>
        </div>
        <div class="report-body" [attr.data-apartado]="apartado()">
          <app-estado-cuenta [clienteId]="id" [allowPayments]="false" />
        </div>
      }
    </div>
  `,
})
export class MiCuenta {
  protected readonly apartado = signal("todo");
  protected readonly auth = inject(AuthService);
}
