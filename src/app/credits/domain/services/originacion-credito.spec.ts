import { describe, expect, it } from 'vitest';
import { tasaEfectivaDiaria } from '../../../shared/domain/finance/financial-math';
import { Compra } from '../model/compra';
import { CondicionesFinancieras, ProductoOfertado } from '../model/condiciones-financieras';
import { Cuota } from '../model/cuota';
import { calcularDeudaVigente, simularCompra } from './originacion-credito';

const cond: CondicionesFinancieras = {
  idCondicion: 1,
  moneda: 'PEN',
  limiteCredito: 1500,
  plazoMaxMeses: 3,
  diaCorte: 20,
  diaPago: 26,
  tedCompensatoria: tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.24, periodoDias: 360 }),
  tedMoratoria: tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.12, periodoDias: 360 }),
  tasaCompensatoriaLabel: 'TEA 24.0000%',
  tasaMoratoriaLabel: 'TEA 12.0000%',
};
const canasta: ProductoOfertado = { id: 1, descripcion: 'Canasta', precioCredito: 600, modalidadPermitida: 'AMBAS', activo: true };

describe('Servicio de dominio: originación de crédito', () => {
  it('proyecta el cronograma francés del juego de datos 1', () => {
    const s = simularCompra({ idCliente: 1, idProducto: 1, cantidad: 1, fechaHoraCompra: '2026-09-15T10:00', modalidad: 'CUOTAS', n: 3 }, canasta, cond, 1500);
    expect(s.errores).toEqual([]);
    expect(s.esAnteriorAlCorte).toBe(true);
    expect(s.cronograma?.capitalizado).toBe(603.96);
    expect(s.cronograma?.filas.map((f) => f.cuota)).toEqual([208.65, 208.65, 208.64]);
  });

  it('calcula el pago a fin de mes de una compra posterior al corte', () => {
    const s = simularCompra({ idCliente: 1, idProducto: 1, cantidad: 1, fechaHoraCompra: '2026-09-22T10:00', modalidad: 'FIN_MES', n: null }, { ...canasta, precioCredito: 120 }, cond, 1500);
    expect(s.esAnteriorAlCorte).toBe(false);
    expect(s.fechaPago).toBe('2026-10-26');
    expect(s.finMes?.dias).toBe(34);
  });

  it('rechaza compras que exceden el crédito disponible o con producto inactivo', () => {
    const s = simularCompra({ idCliente: 1, idProducto: 1, cantidad: 1, fechaHoraCompra: '2026-09-15T10:00', modalidad: 'FIN_MES', n: null }, { ...canasta, activo: false }, cond, 500);
    expect(s.errores.length).toBe(2);
  });

  it('calcula la deuda vigente con fin de mes y cuotas pendientes', () => {
    const compras = [
      { id: 1, modalidad: 'FIN_MES', estado: 'REGISTRADA', capital: 180 },
      { id: 2, modalidad: 'FIN_MES', estado: 'CANCELADA', capital: 999 },
      { id: 3, modalidad: 'CUOTAS', estado: 'REGISTRADA', capital: 600 },
    ] as Compra[];
    const cuotas = [
      { idCompra: 3, estado: 'PAGADA', amortizacion: 197.73 },
      { idCompra: 3, estado: 'PENDIENTE', amortizacion: 201.3 },
      { idCompra: 3, estado: 'PENDIENTE', amortizacion: 204.93 },
    ] as Cuota[];
    expect(calcularDeudaVigente(compras, cuotas)).toBe(586.23);
  });
});
