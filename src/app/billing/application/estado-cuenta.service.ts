import { Injectable, inject } from '@angular/core';
import { CreditosService } from '../../credits/application/creditos.service';
import { ClientesService } from '../../customers/application/clientes.service';
import { Liquidacion } from '../domain/model/liquidacion';
import { Pago } from '../domain/model/pago';
import { CuotaConMora, EstadoCicloView, EstadoCuentaApi, ResultadoPago } from '../infrastructure/estado-cuenta.api';

export type { CuotaConMora, EstadoCicloView, ResultadoPago } from '../infrastructure/estado-cuenta.api';

/**
 * Casos de uso: estado de cuenta al corte, liquidación con mora y registro de pagos.
 * Los cálculos (intereses, mora, prelación) los realiza el backend.
 */
@Injectable({ providedIn: 'root' })
export class EstadoCuentaService {
  private readonly api = inject(EstadoCuentaApi);
  private readonly clientes = inject(ClientesService);
  private readonly creditos = inject(CreditosService);

  ciclosPendientes(idCliente: number): Promise<string[]> {
    return this.api.ciclos(idCliente);
  }

  estadoCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string): Promise<EstadoCicloView | null> {
    return this.api.estadoCiclo(idCliente, fechaPago, fechaEfectiva);
  }

  /** Genera el listado de pago del ciclo (normalmente lo hace el proceso automático al llegar la fecha de corte). */
  generarListado(idCliente: number, fechaPago: string): Promise<Liquidacion> {
    return this.api.generarListado(idCliente, fechaPago);
  }

  cuotasPendientes(idCliente: number, fechaEfectiva: string): Promise<CuotaConMora[]> {
    return this.api.cuotasPendientes(idCliente, fechaEfectiva);
  }

  pagosDe(idCliente: number): Promise<Pago[]> {
    return this.api.pagos(idCliente);
  }

  async pagarCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string, monto: number): Promise<ResultadoPago> {
    const r = await this.api.pagarCiclo(idCliente, fechaPago, fechaEfectiva, monto);
    await this.afterPago(idCliente);
    return r;
  }

  async pagarCuota(idCliente: number, idCuota: number, fechaEfectiva: string, monto: number): Promise<ResultadoPago> {
    const r = await this.api.pagarCuota(idCuota, fechaEfectiva, monto);
    await this.afterPago(idCliente);
    return r;
  }

  /** El pago libera crédito disponible y puede cancelar compras: se refrescan los datos afectados. */
  private async afterPago(idCliente: number): Promise<void> {
    await Promise.all([this.clientes.refresh(idCliente), this.creditos.load().catch(() => undefined)]);
  }
}
