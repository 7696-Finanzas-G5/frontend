import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ClientesService } from '../customers/application/clientes.service';
import { nombreCompleto } from '../customers/domain/model/cliente';
import { AuthService } from '../iam/application/auth.service';
import { Rol, rolLabel } from '../iam/domain/model/usuario';
import { Icon } from '../shared/presentation/components/icon';
import { Logo } from '../shared/presentation/components/logo';
import { TiendasService } from '../stores/application/tiendas.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: Rol[];
}

const NAV: NavItem[] = [
  { path: '/inicio', label: 'Inicio', icon: 'home', roles: ['ADMIN_SISTEMA', 'ADMIN_NEGOCIO'] },
  { path: '/tiendas', label: 'Tiendas', icon: 'store', roles: ['ADMIN_SISTEMA'] },
  { path: '/usuarios', label: 'Usuarios', icon: 'users', roles: ['ADMIN_SISTEMA'] },
  { path: '/catalogo', label: 'Catálogo', icon: 'tag', roles: ['ADMIN_NEGOCIO'] },
  { path: '/clientes', label: 'Clientes', icon: 'users', roles: ['ADMIN_NEGOCIO'] },
  { path: '/creditos', label: 'Créditos', icon: 'card', roles: ['ADMIN_NEGOCIO'] },
  { path: '/reportes', label: 'Reportes', icon: 'chart', roles: ['ADMIN_NEGOCIO'] },
  { path: '/mi-cuenta', label: 'Mi estado de cuenta', icon: 'receipt', roles: ['CLIENTE'] },
  { path: '/configuracion', label: 'Configuración', icon: 'settings', roles: ['ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'CLIENTE'] },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <button class="icon-btn menu" (click)="menuOpen.set(!menuOpen())" aria-label="Abrir menú"><app-icon name="menu" /></button>
      <app-logo />
      <div class="spacer"></div>
      @if (tienda(); as t) {
        <span class="badge badge-info tienda">{{ t }}</span>
      }
      <div class="user">
        <span class="avatar"><app-icon name="user" [size]="16" /></span>
        <div class="user-txt">
          <strong>{{ displayName() }}</strong>
          <small>{{ rolLabel() }}</small>
        </div>
        <button class="icon-btn" (click)="logout()" title="Cerrar sesión" aria-label="Cerrar sesión"><app-icon name="logout" /></button>
      </div>
    </header>
    <div class="body">
      <nav class="sidebar" [class.open]="menuOpen()">
        @for (item of nav(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" (click)="menuOpen.set(false)">
            <app-icon [name]="item.icon" /> {{ item.label }}
          </a>
        }
      </nav>
      <main class="content"><router-outlet /></main>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .topbar {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 14px;
      background: var(--surface); border-bottom: 1px solid var(--border); padding: 10px 24px;
    }
    .spacer { flex: 1; }
    .menu { display: none; }
    .user { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 12px; padding: 5px 6px 5px 8px; }
    .user-txt { display: flex; flex-direction: column; line-height: 1.2; }
    .user-txt strong { font-size: 13px; }
    .user-txt small { color: var(--muted); font-size: 11.5px; }
    .body { display: flex; flex: 1; }
    .sidebar { width: 230px; flex-shrink: 0; padding: 18px 12px; display: flex; flex-direction: column; gap: 4px; }
    .sidebar a {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px;
      color: var(--text); text-decoration: none; font-weight: 500;
    }
    .sidebar a:hover { background: var(--surface); }
    .sidebar a.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
    .content { flex: 1; min-width: 0; padding: 22px 28px 40px 8px; }
    @media (max-width: 900px) {
      .menu { display: inline-grid; }
      .tienda, .user-txt { display: none; }
      .topbar { padding: 10px 16px; }
      .sidebar { position: fixed; top: 61px; bottom: 0; left: 0; z-index: 30; background: var(--surface); box-shadow: var(--shadow-lg); transform: translateX(-100%); transition: transform .2s; }
      .sidebar.open { transform: none; }
      .content { padding: 16px; }
    }
  `,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly tiendas = inject(TiendasService);
  private readonly clientes = inject(ClientesService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly nav = computed(() => NAV.filter((n) => n.roles.includes(this.auth.rol()!)));
  protected readonly rolLabel = computed(() => rolLabel(this.auth.rol()));
  protected readonly tienda = computed(() => {
    const id = this.auth.tiendaId();
    this.tiendas.tiendas();
    return id == null ? null : (this.tiendas.findById(id)?.nombreComercial ?? null);
  });
  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    this.clientes.todos();
    const cli = u?.idCliente != null ? this.clientes.findById(u.idCliente) : undefined;
    return cli ? nombreCompleto(cli) : (u?.username ?? '');
  });

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
