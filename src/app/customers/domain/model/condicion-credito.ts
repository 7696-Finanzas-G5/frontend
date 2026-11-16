import { Moneda } from '../../../shared/domain/common';
import { ensure } from '../../../shared/domain/domain-error';
import { TasaPactada, TipoTasa, round2, siglaTasa, tasaEfectivaDiaria } from '../../../shared/domain/finance/financial-math';

export type FinalidadTasa = 'COMPENSATORIA' | 'MORATORIA';

/** Value object: tasa pactada con el cliente. */
export interface TasaCondicion {
  readonly finalidad: FinalidadTasa;
  readonly tipoTasa: TipoTasa;
  /** Tanto por uno (0.24 = 24 %). */
  readonly valorTasa: number;
  readonly periodoTasaDias: number;
  readonly capitalizacionDias: number | null;
}

/** Términos financieros de la línea de crédito (lo que el negocio pacta con el vecino). */
export interface TerminosCredito {
  readonly moneda: Moneda;
  readonly limiteCredito: number;
  readonly plazoMaxMeses: number;
  readonly diaCorte: number;
  readonly horaCorte: string;
  readonly diaPago: number;
  readonly tasas: TasaCondicion[];
}

/** Entidad versionada: al cambiar los términos la versión vigente pasa a histórica. */
export interface CondicionCredito extends TerminosCredito {
  readonly id: number;
  readonly idCliente: number;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string | null;
  readonly estado: 'VIGENTE' | 'HISTORICA';
}

export const LIMITE_MIN = 50;
export const LIMITE_MAX = 50000;
export const PLAZO_MAX = 24;

export function validarTerminos(t: TerminosCredito): TerminosCredito {
  ensure(t.limiteCredito >= LIMITE_MIN && t.limiteCredito <= LIMITE_MAX, `El límite de crédito debe estar entre ${LIMITE_MIN} y ${LIMITE_MAX}.`);
  ensure(Number.isInteger(t.plazoMaxMeses) && t.plazoMaxMeses >= 1 && t.plazoMaxMeses <= PLAZO_MAX, `El plazo máximo debe estar entre 1 y ${PLAZO_MAX} meses.`);
  ensure(t.diaCorte >= 1 && t.diaCorte <= 28, 'El día de corte debe estar entre 1 y 28.');
  ensure(t.diaPago >= 1 && t.diaPago <= 30, 'El día de pago debe estar entre 1 y 30.');
  ensure(t.diaPago > t.diaCorte, 'El día de pago debe ser posterior al día de corte.');
  const comp = t.tasas.find((x) => x.finalidad === 'COMPENSATORIA');
  const mora = t.tasas.find((x) => x.finalidad === 'MORATORIA');
  ensure(!!comp && comp.valorTasa > 0 && comp.valorTasa <= 1, 'La tasa compensatoria debe ser mayor a 0 % y como máximo 100 %.');
  ensure(!!mora && mora.valorTasa >= 0 && mora.valorTasa <= 1, 'La tasa moratoria debe estar entre 0 % y 100 %.');
  for (const x of t.tasas) {
    ensure(x.tipoTasa === 'EFECTIVA' || !!x.capitalizacionDias, 'La tasa nominal requiere la frecuencia de capitalización.');
  }
  return { ...t, limiteCredito: round2(t.limiteCredito) };
}

export function mismosTerminos(a: TerminosCredito, b: TerminosCredito): boolean {
  const pick = (t: TerminosCredito) => [t.moneda, t.limiteCredito, t.plazoMaxMeses, t.diaCorte, t.horaCorte, t.diaPago, t.tasas];
  return JSON.stringify(pick(a)) === JSON.stringify(pick(b));
}

export function tasaDe(cond: TerminosCredito, finalidad: FinalidadTasa): TasaCondicion {
  const t = cond.tasas.find((x) => x.finalidad === finalidad);
  ensure(t, `La condición de crédito no tiene tasa ${finalidad.toLowerCase()}.`);
  return t;
}

export const toTasaPactada = (t: TasaCondicion): TasaPactada => ({
  tipo: t.tipoTasa,
  valor: t.valorTasa,
  periodoDias: t.periodoTasaDias,
  capitalizacionDias: t.capitalizacionDias,
});

export const tedCompensatoria = (cond: TerminosCredito) => tasaEfectivaDiaria(toTasaPactada(tasaDe(cond, 'COMPENSATORIA')));
export const tedMoratoria = (cond: TerminosCredito) => tasaEfectivaDiaria(toTasaPactada(tasaDe(cond, 'MORATORIA')));

/** "TEA 24.0000%" */
export function tasaLabel(cond: TerminosCredito | undefined, finalidad: FinalidadTasa): string {
  const t = cond?.tasas.find((x) => x.finalidad === finalidad);
  return t ? `${siglaTasa({ tipo: t.tipoTasa, periodoDias: t.periodoTasaDias })} ${(t.valorTasa * 100).toFixed(4)}%` : '—';
}
