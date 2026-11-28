import { Injectable, inject } from '@angular/core';
import { CatalogoService } from '../../../catalog/application/catalogo.service';
import { ClientesService } from '../../../customers/application/clientes.service';
import { CondicionCredito, tasaLabel, tedCompensatoria, tedMoratoria } from '../../../customers/domain/model/condicion-credito';
import { CondicionesFinancieras, ProductoOfertado } from '../../domain/model/condiciones-financieras';

/**
 * Capa anticorrupción: traduce los modelos de Customers y Catalog
 * al lenguaje del contexto de Créditos.
 */
@Injectable({ providedIn: 'root' })
export class CreditContextAdapter {
  private readonly clientes = inject(ClientesService);
  private readonly catalogo = inject(CatalogoService);

  condicionesVigentes(idCliente: number): CondicionesFinancieras | undefined {
    const c = this.clientes.condicionVigente(idCliente);
    return c ? this.traducir(c) : undefined;
  }

  condicionesPorId(idCondicion: number): CondicionesFinancieras | undefined {
    const c = this.clientes.condicionById(idCondicion);
    return c ? this.traducir(c) : undefined;
  }

  producto(id: number): ProductoOfertado | undefined {
    const p = this.catalogo.findById(id);
    return p ? { id: p.id, descripcion: p.descripcion, precioCredito: p.precioCredito, modalidadPermitida: p.modalidadPermitida, activo: p.estado === 'ACTIVO' } : undefined;
  }

  private traducir(c: CondicionCredito): CondicionesFinancieras {
    return {
      idCondicion: c.id,
      moneda: c.moneda,
      limiteCredito: c.limiteCredito,
      plazoMaxMeses: c.plazoMaxMeses,
      diaCorte: c.diaCorte,
      diaPago: c.diaPago,
      tedCompensatoria: tedCompensatoria(c),
      tedMoratoria: tedMoratoria(c),
      tasaCompensatoriaLabel: tasaLabel(c, 'COMPENSATORIA'),
      tasaMoratoriaLabel: tasaLabel(c, 'MORATORIA'),
      horaCorte: c.horaCorte ?? null,
    };
  }
}
