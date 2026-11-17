import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
        <app-estado-cuenta [clienteId]="id" [allowPayments]="false" />
      }
    </div>
  `,
})
export class MiCuenta {
  protected readonly auth = inject(AuthService);
}
