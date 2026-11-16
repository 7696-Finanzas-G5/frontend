import { Injectable, computed, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { EstadoCuentaService } from '../../billing/application/estado-cuenta.service';
import { CatalogoService } from '../../catalog/application/catalogo.service';
import { CreditosService } from '../../credits/application/creditos.service';
import { ClientesService } from '../../customers/application/clientes.service';
import { nombreCompleto } from '../../customers/domain/model/cliente';
import { AuthService } from '../../iam/application/auth.service';
import { UsuariosService } from '../../iam/application/usuarios.service';
import { compareIso, todayIso } from '../../shared/domain/finance/dates';
import { round2 } from '../../shared/domain/finance/financial-math';
import { TiendasService } from '../../stores/application/tiendas.service';

export interface Vencimiento {
  key: string;
  fecha: string;
  cliente: string;
  concepto: string;
  monto: number;
  vencido: boolean;
}

/** Modelo de lectura (query side) que combina información de varios bounded contexts. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly auth = inject(AuthService);
  private readonly tiendas = inject(TiendasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly clientes = inject(ClientesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly creditos = inject(CreditosService);
  private readonly estadoCuenta = inject(EstadoCuentaService);
  private readonly audit = inject(AuditService);

  readonly resumenSistema = computed(() => ({
    tiendas: this.tiendas.tiendas().length,
    tiendasActivas: this.tiendas.tiendas().filter((t) => t.estado === 'ACTIVA').length,
    usuarios: this.usuarios.usuarios().length,
    clientes: this.clientes.todos().length,
    compras: this.creditos.todasLasCompras().length,
  }));

  readonly resumenNegocio = computed(() => {
    const todos = this.clientes.deMiTienda();
    const activos = todos.filter((c) => c.estado === 'ACTIVO');
    return {
      tienda: this.tiendas.nombreDe(this.auth.tiendaId()),
      clientes: activos.length,
      productos: this.catalogo.activosDeMiTienda().length,
      deuda: round2(todos.reduce((s, c) => s + this.creditos.deudaVigente(c.id), 0)),
      disponible: round2(activos.reduce((s, c) => s + this.creditos.disponible(c.id), 0)),
    };
  });

  readonly proximosVencimientos = computed<Vencimiento[]>(() => {
    const hoy = todayIso();
    const items: Vencimiento[] = [];
    for (const c of this.clientes.deMiTienda()) {
      const nombre = nombreCompleto(c);
      for (const fp of this.estadoCuenta.ciclosPendientes(c.id)) {
        const e = this.estadoCuenta.estadoCiclo(c.id, fp, fp);
        if (e) items.push({ key: `c${c.id}-${fp}`, fecha: fp, cliente: nombre, concepto: `Listado fin de mes (${e.liquidacion.lineas.length} compras)`, monto: e.liquidacion.totalExigible, vencido: fp < hoy });
      }
      for (const q of this.creditos.cuotasPendientes(c.id).filter((x) => x.pagable)) {
        items.push({ key: `q${q.cuota.id}`, fecha: q.cuota.fechaVencimiento, cliente: nombre, concepto: `Cuota ${q.cuota.numeroCuota}/${q.compra.numeroCuotas} · ${q.descripcion}`, monto: q.cuota.montoCuota, vencido: q.cuota.fechaVencimiento < hoy });
      }
    }
    return items.sort((a, b) => compareIso(a.fecha, b.fecha)).slice(0, 10);
  });

  /** Últimos registros de auditoría: todos para el admin del sistema, solo los de su tienda para el negocio. */
  readonly bitacoraReciente = computed(() => {
    const usuarios = this.usuarios.usuarios();
    const nombres = new Map(usuarios.map((u) => [u.id, u.username]));
    const esSistema = this.auth.rol() === 'ADMIN_SISTEMA';
    const propios = new Set(usuarios.filter((u) => u.idTienda === this.auth.tiendaId()).map((u) => u.id));
    return [...this.audit.registros()]
      .filter((b) => esSistema || (b.idUsuario != null && propios.has(b.idUsuario)))
      .reverse()
      .slice(0, 8)
      .map((b) => ({ ...b, usuario: b.idUsuario ? (nombres.get(b.idUsuario) ?? '—') : 'sistema' }));
  });
}
