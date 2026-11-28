/**
 * Servicio de dominio: originación de una venta al crédito.
 * Valida la condición de aceptación (6.3.5) y proyecta el pago a fin de mes o el cronograma francés.
 */
import {
  CronogramaFrances,
  ModalidadCompra,
  creditoDisponible,
  cronogramaFrances,
  dias360,
  fechaCorteDeCiclo,
  antesDelCorte,
  fechaPagoCiclo,
  interesPorDias,
  round2,
  validarCompra,
} from '../../../shared/domain/finance/financial-math';
import { Compra } from '../model/compra';
import { CondicionesFinancieras, ProductoOfertado } from '../model/condiciones-financieras';
import { Cuota, estaPendiente } from '../model/cuota';

export interface SolicitudCompra {
  idCliente: number;
  idProducto: number;
  cantidad: number;
  fechaHoraCompra: string;
  modalidad: ModalidadCompra;
  n: number | null;
}

export interface SimulacionCompra {
  errores: string[];
  monto: number;
  disponible: number;
  fechaPago: string;
  fechaCorte: string;
  esAnteriorAlCorte: boolean;
  finMes?: { dias: number; interes: number; total: number };
  cronograma?: CronogramaFrances;
}

export function simularCompra(
  sol: SolicitudCompra,
  producto: ProductoOfertado,
  cond: CondicionesFinancieras,
  disponible: number,
): SimulacionCompra {
  const monto = round2(producto.precioCredito * sol.cantidad);
  const errores = validarCompra({
    modalidadPermitida: producto.modalidadPermitida,
    modalidad: sol.modalidad,
    n: sol.n,
    nMax: cond.plazoMaxMeses,
    monto,
    disponible,
  });
  if (sol.cantidad <= 0) errores.push('La cantidad debe ser mayor a cero.');
  if (!producto.activo) errores.push('El producto está dado de baja.');

  const fechaPago = fechaPagoCiclo(sol.fechaHoraCompra, cond.diaCorte, cond.diaPago, cond.horaCorte);
  const fechaCorte = fechaCorteDeCiclo(fechaPago, cond.diaCorte);
  const result: SimulacionCompra = {
    errores,
    monto,
    disponible,
    fechaPago,
    fechaCorte,
    // Compras anteriores a la fecha y hora de corte entran al ciclo de ese mes
    esAnteriorAlCorte: antesDelCorte(sol.fechaHoraCompra, cond.diaCorte, cond.horaCorte),
  };

  if (sol.modalidad === 'FIN_MES') {
    const dias = dias360(sol.fechaHoraCompra, fechaPago);
    const interes = interesPorDias(monto, cond.tedCompensatoria, dias);
    result.finMes = { dias, interes, total: round2(monto + interes) };
  } else if (sol.n && sol.n >= 1 && monto > 0) {
    result.cronograma = cronogramaFrances(monto, cond.tedCompensatoria, sol.fechaHoraCompra, fechaPago, sol.n);
  }
  return result;
}

/** Deuda vigente: capital de compras a fin de mes no canceladas + amortización pendiente de cuotas. */
export function calcularDeudaVigente(compras: Compra[], cuotas: Cuota[]): number {
  const vigentes = compras.filter((c) => c.estado === 'REGISTRADA');
  const idsCuotas = new Set(vigentes.filter((c) => c.modalidad === 'CUOTAS').map((c) => c.id));
  const finMes = vigentes.filter((c) => c.modalidad === 'FIN_MES').reduce((s, c) => s + c.capital, 0);
  const pendiente = cuotas.filter((q) => idsCuotas.has(q.idCompra) && estaPendiente(q)).reduce((s, q) => s + q.amortizacion, 0);
  return round2(finMes + pendiente);
}

export { creditoDisponible };
