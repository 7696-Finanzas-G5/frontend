import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, NonNullableFormBuilder } from '@angular/forms';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditosService } from '../../../../credits/application/creditos.service';
import { UsuariosService } from '../../../../iam/application/usuarios.service';
import { ClientesService } from '../../../application/clientes.service';
import { Cliente } from '../../../domain/model/cliente';
import { CondicionCredito } from '../../../domain/model/condicion-credito';
import { Clientes } from './clientes';

describe('Hora exacta de corte del cliente', () => {
  const cliente: Cliente = {
    id: 1, idTienda: 1, dni: '10000001', nombres: 'Cliente', apellidos: 'Prueba',
    direccion: null, telefono: null, correo: null, estado: 'ACTIVO', fechaRegistro: '2026-09-01',
  };
  const condicion: CondicionCredito = {
    id: 2, idCliente: 1, moneda: 'PEN', limiteCredito: 500, plazoMaxMeses: 3,
    diaCorte: 20, horaCorte: '18:30:45', diaPago: 26,
    vigenteDesde: '2026-09-01', vigenteHasta: null, estado: 'VIGENTE',
    tasas: [
      { finalidad: 'COMPENSATORIA', tipoTasa: 'EFECTIVA', valorTasa: 0.2, periodoTasaDias: 360, capitalizacionDias: null },
      { finalidad: 'MORATORIA', tipoTasa: 'EFECTIVA', valorTasa: 0.1, periodoTasaDias: 360, capitalizacionDias: null },
    ],
  };
  let componente: Clientes;
  const actualizar = vi.fn().mockResolvedValue(cliente);

  beforeEach(() => {
    actualizar.mockClear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: NonNullableFormBuilder, useFactory: () => new FormBuilder().nonNullable },
        { provide: CreditosService, useValue: {} },
        { provide: UsuariosService, useValue: { usuarios: signal([]), isUsernameTaken: () => false } },
        { provide: ClientesService, useValue: {
          condicionVigente: () => condicion, findById: () => cliente, todos: signal([cliente]),
          isDniTaken: () => false, actualizar,
        } },
      ],
    });
    componente = TestBed.runInInjectionContext(() => new Clientes());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('conserva los segundos al editar y guardar sin cambiar la hora', async () => {
    componente.edit(cliente);
    await componente.save();

    expect(actualizar).toHaveBeenCalledOnce();
    expect(actualizar.mock.calls[0][1].terminos.horaCorte).toBe('18:30:45');
  });

  it('guarda una hora indicada a minutos con segundos cero, incluyendo 23:59', async () => {
    componente.edit(cliente);
    componente['form'].controls.horaCorte.setValue('23:59');
    await componente.save();

    expect(actualizar.mock.calls[0][1].terminos.horaCorte).toBe('23:59:00');
  });
});
