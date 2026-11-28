import { Injectable, inject } from '@angular/core';
import { Compra } from '../../credits/domain/model/compra';
import { CondicionesFinancieras } from '../../credits/domain/model/condiciones-financieras';
import { Cuota } from '../../credits/domain/model/cuota';
import { Imputacion, LiquidacionFinDeMes, ResultadoMora } from '../../shared/domain/finance/financial-math';
import { ApiClient, ApiError } from '../../shared/infrastructure/http/api-client';
import { Liquidacion } from '../domain/model/liquidacion';
import { Pago } from '../domain/model/pago';

/** Liquidación del ciclo (fin de mes) con la mora a la fecha efectiva. */
export interface EstadoCicloView {
  fechaCorte: string;
  fechaPago: string;
  fechaEfectiva: string;
  liquidacion: LiquidacionFinDeMes;
  mora: ResultadoMora;
  condiciones: CondicionesFinancieras;
  condicionesMixtas: boolean;
  /** Listado de pago persistido al corte (proceso automático o manual); null si aún no se generó. */
  listado: Liquidacion | null;
}

/** Cuota pendiente con la mora que tendría a la fecha efectiva. Solo la más antigua de cada compra es pagable. */
export interface CuotaConMora {
  cuota: Cuota;
  compra: Compra;
  descripcion: string;
  pagable: boolean;
  mora: ResultadoMora;
}

export interface ResultadoPago {
  pago: Pago;
  imputacion: Imputacion;
}

/** Adaptador HTTP del estado de cuenta, liquidaciones y pagos. */
@Injectable({ providedIn: 'root' })
export class EstadoCuentaApi {
  private readonly api = inject(ApiClient);

  ciclos(idCliente: number): Promise<string[]> {
    return this.api.get(`/clientes/${idCliente}/estado-cuenta/ciclos`);
  }

  async estadoCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string): Promise<EstadoCicloView | null> {
    try {
      return await this.api.get(`/clientes/${idCliente}/estado-cuenta/ciclos/${fechaPago}`, { fechaEfectiva });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }

  generarListado(idCliente: number, fechaPago: string): Promise<Liquidacion> {
    return this.api.post(`/clientes/${idCliente}/estado-cuenta/ciclos/${fechaPago}/listado`, {});
  }

  pagarCiclo(idCliente: number, fechaPago: string, fechaEfectiva: string, monto: number): Promise<ResultadoPago> {
    return this.api.post(`/clientes/${idCliente}/estado-cuenta/ciclos/${fechaPago}/pagos`, { fechaEfectiva, monto });
  }

  cuotasPendientes(idCliente: number, fechaEfectiva: string): Promise<CuotaConMora[]> {
    return this.api.get(`/clientes/${idCliente}/estado-cuenta/cuotas-pendientes`, { fechaEfectiva });
  }

  pagarCuota(idCuota: number, fechaEfectiva: string, monto: number): Promise<ResultadoPago> {
    return this.api.post(`/cuotas/${idCuota}/pagos`, { fechaEfectiva, monto });
  }

  pagos(idCliente: number): Promise<Pago[]> {
    return this.api.get(`/clientes/${idCliente}/pagos`);
  }

  liquidaciones(idCliente: number): Promise<Liquidacion[]> {
    return this.api.get(`/clientes/${idCliente}/liquidaciones`);
  }
}
