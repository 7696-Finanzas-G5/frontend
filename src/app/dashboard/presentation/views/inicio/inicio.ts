import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../iam/application/auth.service';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { FechaPipe, MoneyPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { DashboardService } from '../../../application/dashboard.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icon, PageHeader, MoneyPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      @if (dashboard.error(); as err) { <div class="alert alert-danger"><app-icon name="alert" /> {{ err }}</div> }
      @if (esSistema()) {
        @let s = dashboard.resumenSistema();
        <app-page-header icon="home" title="Panel del Administrador del Sistema" subtitle="Gestión global de comercios en la plataforma" />
        <section class="kpis">
          <div class="card kpi"><span class="label">Tiendas activas</span><span class="value">{{ s.tiendasActivas }} / {{ s.tiendas }}</span></div>
          <div class="card kpi"><span class="label">Usuarios registrados</span><span class="value">{{ s.usuarios }}</span></div>
          <div class="card kpi"><span class="label">Clientes en la plataforma</span><span class="value">{{ s.clientes }}</span></div>
          <div class="card kpi"><span class="label">Compras al crédito</span><span class="value">{{ s.compras }}</span></div>
        </section>
        <div class="actions" style="justify-content:flex-start">
          <a class="btn btn-primary" routerLink="/tiendas"><app-icon name="store" /> Gestionar tiendas</a>
          <a class="btn btn-outline" routerLink="/usuarios"><app-icon name="users" /> Gestionar usuarios</a>
        </div>
      } @else {
        @let n = dashboard.resumenNegocio();
        <app-page-header icon="home" [title]="'Bienvenido, ' + n.tienda" subtitle="Resumen de la cuenta corriente de crédito del negocio" />
        <section class="kpis">
          <div class="card kpi"><span class="label">Clientes activos</span><span class="value">{{ n.clientes }}</span></div>
          <div class="card kpi"><span class="label">Productos y servicios activos</span><span class="value">{{ n.productos }}</span></div>
          <div class="card kpi"><span class="label">Deuda vigente total</span><span class="value">{{ n.deuda | money }}</span></div>
          <div class="card kpi"><span class="label">Crédito disponible total</span><span class="value text-ok">{{ n.disponible | money }}</span></div>
        </section>
        <div class="actions" style="justify-content:flex-start">
          <a class="btn btn-primary" routerLink="/creditos"><app-icon name="plus" /> Registrar compra</a>
          <a class="btn btn-outline" routerLink="/reportes"><app-icon name="chart" /> Estado de cuenta</a>
          <a class="btn btn-outline" routerLink="/clientes"><app-icon name="users" /> Clientes</a>
        </div>
        <section class="card">
          <div class="card-title"><h2><app-icon name="calendar" /> Próximos vencimientos</h2></div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Vencimiento</th><th>Cliente</th><th>Concepto</th><th class="num">Monto (sin mora)</th><th>Estado</th></tr></thead>
              <tbody>
                @for (v of dashboard.proximosVencimientos(); track v.key) {
                  <tr>
                    <td>{{ v.fecha | fecha }}</td><td>{{ v.cliente }}</td><td>{{ v.concepto }}</td><td class="num">{{ v.monto | money }}</td>
                    <td><span class="badge" [class.badge-off]="v.vencido" [class.badge-info]="!v.vencido">{{ v.vencido ? 'Vencido' : 'Por vencer' }}</span></td>
                  </tr>
                } @empty { <tr><td colspan="5" class="empty">No hay vencimientos pendientes.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      }

      <section class="card">
        <div class="card-title"><h2><app-icon name="shield" /> Bitácora de auditoría (últimos movimientos)</h2></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
            <tbody>
              @for (b of dashboard.bitacoraReciente(); track b.id) {
                <tr><td>{{ b.fechaHora | fecha: true }}</td><td>{{ b.usuario }}</td><td><span class="badge badge-info">{{ b.accion }}</span></td><td>{{ b.entidad }}</td><td>{{ b.detalle }}</td></tr>
              } @empty { <tr><td colspan="5" class="empty">Sin movimientos.</td></tr> }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Inicio {
  protected readonly dashboard = inject(DashboardService);
  private readonly auth = inject(AuthService);
  protected readonly esSistema = computed(() => this.auth.rol() === 'ADMIN_SISTEMA');

  constructor() {
    this.dashboard.load();
  }
}
