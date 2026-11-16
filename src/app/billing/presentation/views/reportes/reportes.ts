import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ClientesService } from '../../../../customers/application/clientes.service';
import { nombreCompleto } from '../../../../customers/domain/model/cliente';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { EstadoCuenta } from '../../components/estado-cuenta/estado-cuenta';

@Component({
  selector: 'app-reportes',
  imports: [PageHeader, EstadoCuenta, HelpTip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="chart" title="Listado de Pago en Fecha de Corte y Liquidación de Mora" subtitle="Detalle de compras, intereses acumulados y monto total a pagar."
        help="El listado muestra las compras realizadas antes del corte ordenadas por fecha. Si el pago se realiza después de la fecha de pago pactada, se añade un ítem de intereses por mora calculado con la tasa moratoria (I). No se permiten pagos parciales." />
      <section class="card">
        <div class="field" style="max-width:420px">
          <label for="cli">Cliente <app-help title="Cliente" text="Seleccione el cliente cuyo estado de cuenta desea consultar o liquidar." /></label>
          <select id="cli" class="input" [value]="clienteId()" (change)="clienteId.set(+$any($event.target).value)">
            @for (c of clientes(); track c.id) { <option [value]="c.id">{{ c.nombre }} · DNI {{ c.dni }}</option> }
          </select>
        </div>
      </section>
      @if (clienteId()) {
        <app-estado-cuenta [clienteId]="clienteId()" />
      }
    </div>
  `,
})
export class Reportes {
  private readonly clientesService = inject(ClientesService);
  protected readonly clienteId = signal(0);
  protected readonly clientes = computed(() => this.clientesService.deMiTienda().map((c) => ({ id: c.id, dni: c.dni, nombre: nombreCompleto(c) })));

  constructor() {
    effect(() => {
      if (!this.clienteId() && this.clientes().length) this.clienteId.set(this.clientes()[0].id);
    });
  }
}
