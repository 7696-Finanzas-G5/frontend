/**
 * Modelo matemático de CrediBarrio (Informe, punto 6.3).
 *
 * - Año comercial de 360 días y meses de 30 días.
 * - Tasas en tanto por uno, procesadas sin redondeo (precisión doble, > 9 decimales).
 * - Montos redondeados a 2 decimales; en el cronograma el redondeo se aplica fila por fila.
 */
import { addMonths, makeDate, parseYmd, toIso } from './dates';

export type TipoTasa = 'NOMINAL' | 'EFECTIVA';

export interface TasaPactada {
  tipo: TipoTasa;
  /** Tasa en tanto por uno (24 % = 0.24). */
  valor: number;
  /** Período de la tasa en días (360 = anual, 30 = mensual, ...). */
  periodoDias: number;
  /** Frecuencia de capitalización en días (solo si la tasa es nominal). */
  capitalizacionDias?: number | null;
}

export const PERIODOS_TASA = [
  { dias: 360, label: 'Anual (360 días)', efectiva: 'TEA', nominal: 'TNA' },
  { dias: 180, label: 'Semestral (180 días)', efectiva: 'TES', nominal: 'TNS' },
  { dias: 90, label: 'Trimestral (90 días)', efectiva: 'TET', nominal: 'TNT' },
  { dias: 60, label: 'Bimestral (60 días)', efectiva: 'TEB', nominal: 'TNB' },
  { dias: 30, label: 'Mensual (30 días)', efectiva: 'TEM', nominal: 'TNM' },
  { dias: 15, label: 'Quincenal (15 días)', efectiva: 'TEQ', nominal: 'TNQ' },
  { dias: 1, label: 'Diaria (1 día)', efectiva: 'TED', nominal: 'TND' },
] as const;

export const CAPITALIZACIONES = [
  { dias: 1, label: 'Diaria' },
  { dias: 15, label: 'Quincenal' },
  { dias: 30, label: 'Mensual' },
  { dias: 60, label: 'Bimestral' },
  { dias: 90, label: 'Trimestral' },
  { dias: 180, label: 'Semestral' },
  { dias: 360, label: 'Anual' },
] as const;

export function siglaTasa(t: Pick<TasaPactada, 'tipo' | 'periodoDias'>): string {
  const p = PERIODOS_TASA.find((x) => x.dias === t.periodoDias);
  if (!p) return t.tipo === 'EFECTIVA' ? 'TE' : 'TN';
  return t.tipo === 'EFECTIVA' ? p.efectiva : p.nominal;
}

export function round2(x: number): number {
  return Math.round((x + Math.sign(x) * Number.EPSILON) * 100) / 100;
}

/** 1. Conteo de días base 360/30: d = (A2−A1)·360 + (M2−M1)·30 + [min(D2,30) − min(D1,30)]. */
export function dias360(fecha1: string, fecha2: string): number {
  const a = parseYmd(fecha1);
  const b = parseYmd(fecha2);
  return (b.y - a.y) * 360 + (b.m - a.m) * 30 + (Math.min(b.d, 30) - Math.min(a.d, 30));
}

/** 2. Fecha de pago según la fecha de corte (compras hasta las 23:59 del día de corte entran al ciclo actual). */
export function fechaPagoCiclo(fechaHoraCompra: string, diaCorte: number, diaPago: number): string {
  if (diaPago <= diaCorte) {
    throw new Error('El día de pago debe ser posterior al día de corte.');
  }
  const { y, m, d } = parseYmd(fechaHoraCompra);
  return toIso(makeDate(y, d <= diaCorte ? m : m + 1, diaPago));
}

/** Fecha de corte del ciclo cuyo pago vence en `fechaPago` (mismo mes, ya que día de pago > día de corte). */
export function fechaCorteDeCiclo(fechaPago: string, diaCorte: number): string {
  const { y, m } = parseYmd(fechaPago);
  return toIso(makeDate(y, m, diaCorte));
}

/** 3. Conversión de la tasa pactada a Tasa Efectiva Diaria (TED). */
export function tasaEfectivaDiaria(t: TasaPactada): number {
  if (t.valor < 0) throw new Error('La tasa no puede ser negativa.');
  if (t.tipo === 'EFECTIVA') {
    return Math.pow(1 + t.valor, 1 / t.periodoDias) - 1;
  }
  const m = t.capitalizacionDias;
  if (!m) throw new Error('La tasa nominal requiere la frecuencia de capitalización.');
  const iSub = t.valor * (m / t.periodoDias);
  return Math.pow(1 + iSub, 1 / m) - 1;
}

/** 4. Tasa Efectiva Mensual (30 días). */
export function tasaEfectivaMensual(ted: number): number {
  return Math.pow(1 + ted, 30) - 1;
}

/** 10. Tasa Efectiva Anual equivalente (360 días). Sin comisiones ni seguros, TCEA = TEA. */
export function tasaEfectivaAnual(ted: number): number {
  return Math.pow(1 + ted, 360) - 1;
}

/** Interés compuesto por `dias` días a la TED: VA·[(1+TED)^d − 1], redondeado a 2 decimales. */
export function interesPorDias(capital: number, ted: number, dias: number): number {
  if (dias <= 0) return 0;
  return round2(capital * (Math.pow(1 + ted, dias) - 1));
}

/** 5. Crédito disponible = límite − deuda vigente. */
export function creditoDisponible(limite: number, deudaVigente: number): number {
  return round2(Math.max(0, limite - deudaVigente));
}

// ---------------------------------------------------------------------------
// 6. Modalidad 1: venta a fin de mes
// ---------------------------------------------------------------------------

export interface ItemFinDeMes {
  id?: number;
  descripcion?: string;
  fechaCompra: string;
  capital: number;
}

export interface LineaFinDeMes extends ItemFinDeMes {
  dias: number;
  interes: number;
  total: number;
}

export interface LiquidacionFinDeMes {
  fechaPago: string;
  lineas: LineaFinDeMes[];
  capitalTotal: number;
  interesTotal: number;
  /** VF = ΣVA + ΣIc */
  totalExigible: number;
}

export function liquidarFinDeMes(items: ItemFinDeMes[], tedC: number, fechaPago: string): LiquidacionFinDeMes {
  const lineas = [...items]
    .sort((a, b) => a.fechaCompra.localeCompare(b.fechaCompra))
    .map((it) => {
      const dias = dias360(it.fechaCompra, fechaPago);
      const interes = interesPorDias(it.capital, tedC, dias);
      return { ...it, dias, interes, total: round2(it.capital + interes) };
    });
  const capitalTotal = round2(lineas.reduce((s, l) => s + l.capital, 0));
  const interesTotal = round2(lineas.reduce((s, l) => s + l.interes, 0));
  return { fechaPago, lineas, capitalTotal, interesTotal, totalExigible: round2(capitalTotal + interesTotal) };
}

// ---------------------------------------------------------------------------
// 7. Modalidad 2: venta en cuotas (método francés vencido ordinario con gracia total)
// ---------------------------------------------------------------------------

export interface FilaCronograma {
  k: number;
  fecha: string;
  saldoInicial: number;
  interes: number;
  amortizacion: number;
  cuota: number;
  saldoFinal: number;
}

export interface CronogramaFrances {
  ted: number;
  tem: number;
  tea: number;
  diasGracia: number;
  interesGracia: number;
  capitalizado: number;
  factor: number;
  cuota: number;
  fechaFinGracia: string;
  filas: FilaCronograma[];
  totalInteres: number;
  totalAmortizacion: number;
  totalCuotas: number;
}

/**
 * @param capital    VA (precio de lista financiado)
 * @param tedC       Tasa efectiva diaria compensatoria
 * @param fechaCompra Fecha de la compra
 * @param fechaPago1 Primera fecha de pago (fin del período de gracia total)
 * @param n          Número de cuotas mensuales
 */
export function cronogramaFrances(
  capital: number,
  tedC: number,
  fechaCompra: string,
  fechaPago1: string,
  n: number,
): CronogramaFrances {
  if (!Number.isInteger(n) || n < 1) throw new Error('El número de cuotas debe ser un entero ≥ 1.');
  const tem = tasaEfectivaMensual(tedC);
  const diasGracia = Math.max(0, dias360(fechaCompra, fechaPago1));
  const interesGracia = interesPorDias(capital, tedC, diasGracia);
  const capitalizado = round2(capital + interesGracia);
  const factor = (tem * Math.pow(1 + tem, n)) / (Math.pow(1 + tem, n) - 1);
  const cuota = round2(capitalizado * factor);
  const diaPago = parseYmd(fechaPago1).d;

  const filas: FilaCronograma[] = [];
  let saldo = capitalizado;
  for (let k = 1; k <= n; k++) {
    const interes = round2(saldo * tem);
    let amortizacion = round2(cuota - interes);
    let cuotaK = cuota;
    if (k === n) {
      // Ajuste de cierre: A_n = SI_n para que SF_n = 0.00
      amortizacion = saldo;
      cuotaK = round2(amortizacion + interes);
    }
    const saldoFinal = round2(saldo - amortizacion);
    filas.push({
      k,
      fecha: addMonths(fechaPago1, k, diaPago),
      saldoInicial: saldo,
      interes,
      amortizacion,
      cuota: cuotaK,
      saldoFinal,
    });
    saldo = saldoFinal;
  }

  return {
    ted: tedC,
    tem,
    tea: tasaEfectivaAnual(tedC),
    diasGracia,
    interesGracia,
    capitalizado,
    factor,
    cuota,
    fechaFinGracia: fechaPago1,
    filas,
    totalInteres: round2(filas.reduce((s, f) => s + f.interes, 0)),
    totalAmortizacion: round2(filas.reduce((s, f) => s + f.amortizacion, 0)),
    totalCuotas: round2(filas.reduce((s, f) => s + f.cuota, 0)),
  };
}

// ---------------------------------------------------------------------------
// 8. Interés moratorio
// ---------------------------------------------------------------------------

export interface ResultadoMora {
  diasMora: number;
  interesMoratorio: number;
  base: number;
  totalExigible: number;
}

export function calcularMora(base: number, tedM: number, fechaPagoPactada: string, fechaPagoEfectiva: string): ResultadoMora {
  const diasMora = Math.max(0, dias360(fechaPagoPactada, fechaPagoEfectiva));
  const interesMoratorio = interesPorDias(base, tedM, diasMora);
  return { diasMora, interesMoratorio, base, totalExigible: round2(base + interesMoratorio) };
}

// ---------------------------------------------------------------------------
// 9. Imputación del pago (prelación: mora → interés compensatorio → capital)
// ---------------------------------------------------------------------------

export interface Imputacion {
  mora: number;
  compensatorio: number;
  capital: number;
  total: number;
}

export function imputarPago(pago: number, interesMora: number, interesCompensatorio: number, totalExigible: number): Imputacion {
  if (round2(pago) !== round2(totalExigible)) {
    throw new Error(`No se permiten pagos parciales: el pago debe ser exactamente ${totalExigible.toFixed(2)}.`);
  }
  const mora = round2(Math.min(pago, interesMora));
  const compensatorio = round2(Math.min(pago - mora, interesCompensatorio));
  const capital = round2(pago - mora - compensatorio);
  return { mora, compensatorio, capital, total: round2(pago) };
}

// ---------------------------------------------------------------------------
// Validación de compra (condición de aceptación del punto 6.3.5)
// ---------------------------------------------------------------------------

export type ModalidadPermitida = 'FIN_MES' | 'CUOTAS' | 'AMBAS';
export type ModalidadCompra = 'FIN_MES' | 'CUOTAS';

export interface ValidacionCompraInput {
  modalidadPermitida: ModalidadPermitida;
  modalidad: ModalidadCompra;
  n: number | null;
  nMax: number;
  monto: number;
  disponible: number;
}

export function validarCompra(v: ValidacionCompraInput): string[] {
  const errores: string[] = [];
  if (v.modalidadPermitida !== 'AMBAS' && v.modalidadPermitida !== v.modalidad) {
    errores.push('Modalidad no habilitada para este producto o servicio.');
  }
  if (v.modalidad === 'CUOTAS' && (v.n == null || v.n < 1 || v.n > v.nMax)) {
    errores.push(`Número de cuotas fuera de rango (1 a ${v.nMax}).`);
  }
  if (v.monto <= 0) {
    errores.push('El monto de la compra debe ser mayor a cero.');
  }
  if (round2(v.monto) > round2(v.disponible)) {
    errores.push(`La compra excede el límite de crédito: crédito disponible ${v.disponible.toFixed(2)}.`);
  }
  return errores;
}
