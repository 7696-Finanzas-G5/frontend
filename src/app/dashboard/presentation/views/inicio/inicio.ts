import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../iam/application/auth.service';
import { Icon } from '../../../../shared/presentation/components/icon';
import { FechaPipe, MoneyPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { DashboardService } from '../../../application/dashboard.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icon, MoneyPipe, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-page" [class.system-home]="esSistema()">
      @if (dashboard.error(); as err) { <div class="alert alert-danger"><app-icon name="alert" /> {{ err }}</div> }
      @if (esSistema()) {
        @let s = dashboard.resumenSistema();
        <section class="welcome">
          <div class="welcome-copy"><span class="eyebrow">ADMINISTRACIÓN</span><h1>Resumen de la plataforma</h1><p>Gestiona la plataforma y sus negocios desde un solo lugar.</p></div>
        </section>
        <section class="summary-grid"><div class="summary-card"><span>Tiendas activas</span><strong>{{ s.tiendasActivas }} <small>/ {{ s.tiendas }}</small></strong></div><div class="summary-card"><span>Usuarios registrados</span><strong>{{ s.usuarios }}</strong></div><div class="summary-card"><span>Clientes</span><strong>{{ s.clientes }}</strong></div><div class="summary-card"><span>Compras al crédito</span><strong>{{ s.compras }}</strong></div></section>
        <section class="operations"><div class="section-head"><div><span class="eyebrow">GESTIÓN</span><h2>Operaciones</h2></div><span class="section-note">Accesos principales</span></div>
          <div class="operation-grid">
            <a class="operation" routerLink="/tiendas"><span class="operation-icon"><app-icon name="store" [size]="30" /></span><b>Tiendas</b><small>Comercios registrados</small><app-icon name="arrow" [size]="16" /></a>
            <a class="operation" routerLink="/usuarios"><span class="operation-icon"><app-icon name="users" [size]="30" /></span><b>Usuarios</b><small>Accesos y perfiles</small><app-icon name="arrow" [size]="16" /></a>
          </div>
        </section>
      } @else {
        @let n = dashboard.resumenNegocio();
        <section class="welcome">
          <div class="welcome-copy"><span class="eyebrow">PANEL DE CONTROL · {{ n.tienda }}</span><h1>Resumen del negocio</h1><p>Consulta tu información y realiza tus operaciones en un solo lugar.</p><a class="hero-action" routerLink="/creditos">Registrar una compra <app-icon name="arrow" [size]="17" /></a></div>
        </section>
        <section class="summary-grid"><div class="summary-card"><span>Clientes activos</span><strong>{{ n.clientes }}</strong></div><div class="summary-card"><span>Productos y servicios</span><strong>{{ n.productos }}</strong></div><div class="summary-card"><span>Deuda vigente</span><strong>{{ n.deuda | money }}</strong></div><div class="summary-card"><span>Crédito disponible</span><strong>{{ n.disponible | money }}</strong></div></section>
        @if (n.deuda + n.disponible > 0) {
          <section class="card credit-usage">
            <h2>Uso del crédito</h2>
            <meter aria-label="Proporción de crédito utilizado" [attr.max]="n.deuda + n.disponible" [value]="n.deuda"></meter>
            <p>{{ n.deuda | money }} utilizado de {{ n.deuda + n.disponible | money }}</p>
          </section>
        }
        <section class="operations"><div class="section-head"><div><span class="eyebrow">TU NEGOCIO</span><h2>Operaciones</h2></div><span class="section-note">Elige qué quieres hacer</span></div>
          <div class="operation-grid">
            <a class="operation" routerLink="/creditos"><span class="operation-icon"><app-icon name="card" [size]="30" /></span><b>Créditos</b><small>Registra compras y cuotas</small><app-icon name="arrow" [size]="16" /></a>
            <a class="operation" routerLink="/clientes"><span class="operation-icon"><app-icon name="users" [size]="30" /></span><b>Clientes</b><small>Consulta y administra</small><app-icon name="arrow" [size]="16" /></a>
            <a class="operation" routerLink="/catalogo"><span class="operation-icon"><app-icon name="tag" [size]="30" /></span><b>Catálogo</b><small>Productos y servicios</small><app-icon name="arrow" [size]="16" /></a>
            <a class="operation" routerLink="/reportes"><span class="operation-icon"><app-icon name="chart" [size]="30" /></span><b>Reportes</b><small>Estados de cuenta</small><app-icon name="arrow" [size]="16" /></a>
          </div>
        </section>
        <section class="card due-card">
          <div class="card-title"><h2><app-icon name="calendar" /> Próximos vencimientos</h2><a class="text-link" routerLink="/reportes">Ver estado de cuenta <app-icon name="arrow" [size]="15" /></a></div>
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
  styles: `
    .home-page { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; max-width: 1440px; margin: 0 auto; align-items: start; }
    .home-page > * { min-width: 0; grid-column: 1 / -1; }
    .home-page.system-home > .card:not(.due-card):not(.credit-usage) { grid-column: span 7; align-self: stretch; }
    .home-page > .operations { grid-column: span 5; align-self: stretch; }
    .home-page > .due-card { grid-column: span 7; align-self: stretch; }
    .home-page > .card:not(.due-card):not(.credit-usage) { grid-column: 1 / -1; }
    .credit-usage meter { width: 100%; height: 24px; margin-top: 10px; accent-color: var(--metric); }
    .welcome { position: relative; display: flex; align-items: center; justify-content: space-between; min-height: 0; padding: 20px 24px; overflow: hidden; color: #fff; background: var(--primary); }
    .welcome-copy { position: relative; z-index: 1; max-width: 430px; }
    .eyebrow { display: block; color: #9db3c1; font-size: 10px; font-weight: 700; letter-spacing: .15em; }
    .welcome h1 { margin: 15px 0 11px; color: #fff; font-size: 24px; font-weight: 600; letter-spacing: -.055em; line-height: .98; }
    .welcome-copy p { max-width: 320px; margin: 0; color: #d1dce3; font-size: 14px; line-height: 1.55; }
    .hero-action { color: white; background: var(--action); display: inline-flex; align-items: center; gap: 18px; margin-top: 20px; min-height: 42px; padding: 0 15px; text-decoration: none; font-size: 12px; font-weight: 700; transition: transform .18s ease; }
    .hero-action:hover { transform: translateY(-2px); }
    .operations,.due-card,.summary-grid { padding: 21px 24px; background: #fff; border: 1px solid #dce4e8; box-shadow: 0 4px 15px rgba(16,42,67,.035); }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .section-head .eyebrow { color: var(--metric); }
    .section-head h2 { margin: 5px 0 0; font-size: 20px; }
    .section-note { color: #74828b; font-size: 11px; }
    .operation-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
    .operation { position: relative; display: grid; grid-template-columns: 42px 1fr 18px; grid-template-rows: auto auto; align-items: center; column-gap: 11px; min-height: 76px; padding: 12px; border: 1px solid #e2e8eb; color: #102a43; text-decoration: none; transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
    .operation:hover { border-color: var(--operation-color, var(--metric)); transform: translateY(-2px); box-shadow: 0 7px 18px rgba(16,42,67,.08); }
    .operation-icon { grid-row: 1 / 3; display: grid; place-items: center; width: 42px; height: 42px; color: var(--operation-color, var(--metric)); }
    .operation b { align-self: end; font-size: 12px; }
    .operation small { align-self: start; color: #73818a; font-size: 10px; }
    .operation > app-icon { grid-column: 3; grid-row: 1 / 3; color: #87959d; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 0; padding: 0; }
    .summary-card { display: flex; flex-direction: column; gap: 9px; padding: 16px 20px; border-right: 1px solid #e5eaed; }
    .summary-card:last-child { border-right: 0; }
    .summary-card span { color: #6f7f88; font-size: 11px; }
    .summary-card strong { color: var(--metric); font-size: 20px; font-variant-numeric: tabular-nums; }
    .summary-card strong small { color: #829099; font-size: 13px; }
    .due-card { padding: 21px 24px; }
    .text-link { display: inline-flex; align-items: center; gap: 7px; color: var(--metric); text-decoration: none; font-size: 11px; font-weight: 700; }
    .text-link:hover { text-decoration: underline; }
    .due-card .card-title { margin-bottom: 14px; }
    @media (max-width: 1120px) { .welcome { min-height: 0; padding: 20px; } .operation-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .home-page > .chart-panel, .home-page > .operations, .home-page > .due-card, .home-page > .card:not(.due-card):not(.credit-usage) { grid-column: 1 / -1; } }
    @media (max-width: 600px) { .home-page { gap: 14px; } .welcome { min-height: 0; padding: 20px; } .welcome-copy { max-width: 300px; } .welcome h1 { font-size: 24px; } .operations,.due-card { padding: 17px 15px; } .operation-grid { gap: 8px; } .operation { grid-template-columns: 36px 1fr 14px; column-gap: 8px; min-height: 70px; padding: 9px; } .operation-icon { width: 36px; height: 36px; } .operation small { font-size: 9px; } .section-note { display: none; } .summary-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .summary-card { padding: 13px; border-bottom: 1px solid #e5eaed; } .summary-card:nth-child(2) { border-right: 0; } .summary-card:nth-child(3),.summary-card:nth-child(4) { border-bottom: 0; } .summary-card strong { font-size: 17px; } }
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
