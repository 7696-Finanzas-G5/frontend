import { describe, expect, it } from 'vitest';
import { tasaEfectivaDiaria } from '../../../shared/domain/finance/financial-math';
import { CompraLiquidable, ciclosPendientes, construirEstadoCiclo, imputarPagoCiclo } from './liquidacion-ciclo';

const tasas = {
  tedCompensatoria: tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.24, periodoDias: 360 }),
  tedMoratoria: tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.12, periodoDias: 360 }),
  diaCorte: 20,
};
const compras: CompraLiquidable[] = [
  { id: 2, descripcion: 'Lácteos', fechaCompra: '2026-09-12T18:40', capital: 80, fechaPago: '2026-09-26' },
  { id: 1, descripcion: 'Abarrotes', fechaCompra: '2026-09-05T09:15', capital: 100, fechaPago: '2026-09-26' },
  { id: 9, descripcion: 'Posterior al corte', fechaCompra: '2026-09-22T09:00', capital: 120, fechaPago: '2026-10-26' },
];

describe('Servicio de dominio: liquidación del ciclo (juego de datos 2)', () => {
  it('lista los ciclos pendientes en orden', () => {
    expect(ciclosPendientes(compras)).toEqual(['2026-09-26', '2026-10-26']);
  });

  it('genera el listado al corte con mora por 5 días', () => {
    const e = construirEstadoCiclo(compras, tasas, '2026-09-26', '2026-10-01')!;
    expect(e.fechaCorte).toBe('2026-09-20');
    expect(e.liquidacion.lineas.map((l) => l.id)).toEqual([1, 2]);
    expect(e.liquidacion.totalExigible).toBe(181.93);
    expect(e.mora.interesMoratorio).toBe(0.29);
    expect(imputarPagoCiclo(182.22, e)).toEqual({ mora: 0.29, compensatorio: 1.93, capital: 180, total: 182.22 });
  });

  it('rechaza pagos parciales', () => {
    const e = construirEstadoCiclo(compras, tasas, '2026-09-26', '2026-10-01')!;
    expect(() => imputarPagoCiclo(150, e)).toThrow(/parciales/);
  });
});
