import { describe, expect, it } from 'vitest';
import {
  calcularMora,
  cronogramaFrances,
  dias360,
  fechaPagoCiclo,
  imputarPago,
  interesPorDias,
  liquidarFinDeMes,
  tasaEfectivaAnual,
  tasaEfectivaDiaria,
  tasaEfectivaMensual,
  validarCompra,
} from './financial-math';

const pct7 = (x: number) => (x * 100).toFixed(7);

describe('Juego de datos 1: compra en 3 cuotas con gracia total (TEA 24 %)', () => {
  const ted = tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.24, periodoDias: 360 });
  const fechaPago1 = fechaPagoCiclo('2026-09-15T10:00', 20, 26);
  const c = cronogramaFrances(600, ted, '2026-09-15', fechaPago1, 3);

  it('convierte TEA → TED y TEM', () => {
    expect(pct7(ted)).toBe('0.0597710');
    // El informe (6.4) indica 1.8087577 %, pero (1.24)^(1/12) − 1 = 1.8087582 % (valor que muestra el mockup 6.2.5).
    expect(pct7(tasaEfectivaMensual(ted))).toBe('1.8087582');
  });

  it('capitaliza los 11 días de gracia total', () => {
    expect(fechaPago1).toBe('2026-09-26');
    expect(c.diasGracia).toBe(11);
    expect(c.interesGracia).toBe(3.96);
    expect(c.capitalizado).toBe(603.96);
    expect(c.factor.toFixed(7)).toBe('0.3454638');
    expect(c.cuota).toBe(208.65);
  });

  it('genera el cronograma francés con ajuste de cierre', () => {
    expect(c.filas.map((f) => [f.fecha, f.saldoInicial, f.interes, f.amortizacion, f.cuota, f.saldoFinal])).toEqual([
      ['2026-10-26', 603.96, 10.92, 197.73, 208.65, 406.23],
      ['2026-11-26', 406.23, 7.35, 201.3, 208.65, 204.93],
      ['2026-12-26', 204.93, 3.71, 204.93, 208.64, 0],
    ]);
    expect(c.totalInteres).toBe(21.98);
    expect(c.totalAmortizacion).toBe(603.96);
    expect(c.totalCuotas).toBe(625.94);
    expect((c.tea * 100).toFixed(4)).toBe('24.0000');
  });
});

describe('Juego de datos 2: pago a fin de mes con mora (TEA 24 % / TEA 12 %)', () => {
  const tedC = tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.24, periodoDias: 360 });
  const tedM = tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.12, periodoDias: 360 });
  const liq = liquidarFinDeMes(
    [
      { fechaCompra: '2026-09-12', capital: 80 },
      { fechaCompra: '2026-09-05', capital: 100 },
    ],
    tedC,
    '2026-09-26',
  );

  it('calcula intereses compensatorios por días, ordenados por fecha', () => {
    expect(pct7(tedM)).toBe('0.0314851');
    expect(liq.lineas.map((l) => [l.dias, l.interes])).toEqual([
      [21, 1.26],
      [14, 0.67],
    ]);
    expect(liq.totalExigible).toBe(181.93);
  });

  it('aplica mora sobre el total exigible y la prelación del pago', () => {
    const mora = calcularMora(liq.totalExigible, tedM, '2026-09-26', '2026-10-01');
    expect(mora.diasMora).toBe(5);
    expect(mora.interesMoratorio).toBe(0.29);
    expect(mora.totalExigible).toBe(182.22);
    expect(imputarPago(182.22, mora.interesMoratorio, liq.interesTotal, mora.totalExigible)).toEqual({
      mora: 0.29,
      compensatorio: 1.93,
      capital: 180,
      total: 182.22,
    });
  });

  it('pago puntual: mora S/ 0.00', () => {
    const mora = calcularMora(liq.totalExigible, tedM, '2026-09-26', '2026-09-26');
    expect(mora.interesMoratorio).toBe(0);
    expect(mora.totalExigible).toBe(181.93);
  });

  it('rechaza pagos parciales', () => {
    expect(() => imputarPago(150, 0.29, 1.93, 182.22)).toThrow(/parciales/);
  });
});

describe('Juego de datos 3: tasa nominal y compra posterior al corte', () => {
  const ted = tasaEfectivaDiaria({ tipo: 'NOMINAL', valor: 0.18, periodoDias: 360, capitalizacionDias: 30 });

  it('convierte TNA capitalizable mensualmente', () => {
    expect(pct7(ted)).toBe('0.0496410');
    expect((tasaEfectivaAnual(ted) * 100).toFixed(4)).toBe('19.5618');
  });

  it('traslada al ciclo siguiente las compras posteriores al corte', () => {
    const fa = fechaPagoCiclo('2026-09-18T12:00', 20, 26);
    const fb = fechaPagoCiclo('2026-09-22T09:00', 20, 26);
    expect(fa).toBe('2026-09-26');
    expect(fb).toBe('2026-10-26');
    expect(dias360('2026-09-18', fa)).toBe(8);
    expect(dias360('2026-09-22', fb)).toBe(34);
    expect(interesPorDias(250, ted, 8)).toBe(0.99);
    expect(interesPorDias(120, ted, 34)).toBe(2.04);
  });

  it('incluye la compra hecha el mismo día de corte (hasta las 23:59)', () => {
    expect(fechaPagoCiclo('2026-09-20T23:59', 20, 26)).toBe('2026-09-26');
    expect(fechaPagoCiclo('2026-12-21T08:00', 20, 26)).toBe('2027-01-26');
  });

  it('respeta la hora de corte pactada en el mismo día de corte', () => {
    expect(fechaPagoCiclo('2026-09-20T17:59', 20, 26, '18:00:00')).toBe('2026-09-26');
    expect(fechaPagoCiclo('2026-09-20T18:00', 20, 26, '18:00:00')).toBe('2026-10-26');
    expect(fechaPagoCiclo('2026-09-20T18:01', 20, 26, '18:00:00')).toBe('2026-10-26');
    expect(fechaPagoCiclo('2026-09-20T23:59', 20, 26, null)).toBe('2026-09-26');
  });

  it.each([
    ['2026-09-20T18:00:00.499999999', '2026-09-26'],
    ['2026-09-20T18:00:00.500', '2026-10-26'],
    ['2026-09-20T18:00:00.500000001', '2026-10-26'],
  ])('respeta el instante exacto de corte con fracciones: %s', (compra, pago) => {
    expect(fechaPagoCiclo(compra, 20, 26, '18:00:00.500')).toBe(pago);
  });

  it('aplica el corte exacto por defecto y en el cambio de año', () => {
    expect(fechaPagoCiclo('2026-09-20T23:59:58.999999999', 20, 26)).toBe('2026-09-26');
    expect(fechaPagoCiclo('2026-09-20T23:59:59', 20, 26)).toBe('2026-10-26');
    expect(fechaPagoCiclo('2026-12-20T00:00', 20, 26, '00:00:00')).toBe('2027-01-26');
  });
});

describe('Casos de validación de reglas del sistema', () => {
  const base = { modalidadPermitida: 'AMBAS' as const, modalidad: 'FIN_MES' as const, n: null, nMax: 3, monto: 50, disponible: 70 };

  it('rechaza compra que excede el límite', () => {
    expect(validarCompra({ ...base, monto: 90 })[0]).toContain('70.00');
  });
  it('rechaza plazo mayor al permitido', () => {
    expect(validarCompra({ ...base, modalidad: 'CUOTAS', n: 4 })[0]).toContain('fuera de rango');
  });
  it('rechaza modalidad no permitida', () => {
    expect(validarCompra({ ...base, modalidadPermitida: 'FIN_MES', modalidad: 'CUOTAS', n: 2 })[0]).toContain('no habilitada');
  });
  it('acepta una compra válida', () => {
    expect(validarCompra(base)).toEqual([]);
  });
});
