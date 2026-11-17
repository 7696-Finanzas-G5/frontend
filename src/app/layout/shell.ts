import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ClientesService } from '../customers/application/clientes.service';
import { nombreCompleto } from '../customers/domain/model/cliente';
import { AuthService } from '../iam/application/auth.service';
import { rolLabel } from '../iam/domain/model/usuario';
import { Icon } from '../shared/presentation/components/icon';
import { Logo } from '../shared/presentation/components/logo';
import { TiendasService } from '../stores/application/tiendas.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <a class="brand-link" [routerLink]="home()" aria-label="Volver a Inicio"><app-logo /></a>
      <div class="spacer"></div><a class="btn btn-outline home-link" [routerLink]="home()"><app-icon name="home" [size]="16" /> Inicio</a><a class="account-link" routerLink="/configuracion" aria-label="Configuración"><app-icon name="settings" /></a>
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
      <main class="content"><router-outlet /></main>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .topbar {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 14px;
      background: var(--surface); border-bottom: 1px solid var(--border); padding: 10px 28px;
      box-shadow: 0 2px 12px rgba(16, 42, 67, .035);
    }
    .brand-link, .account-link { display: inline-flex; text-decoration: none; }
    .home-link { text-decoration: none; padding-inline: 10px; }
    .account-link { padding: 10px; }
    .spacer { flex: 1; }
    .user { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 12px; padding: 5px 6px 5px 8px; }
    .user-txt { display: flex; flex-direction: column; line-height: 1.2; }
    .user-txt strong { font-size: 13px; }
    .user-txt small { color: var(--muted); font-size: 11.5px; }
    .body { display: flex; flex: 1; }
    .content { width: 100%; max-width: 1240px; margin-inline: auto; min-width: 0; padding: 30px clamp(20px, 3vw, 48px) 48px; }
    @media (max-width: 900px) {
      .tienda, .user-txt { display: none; }
      .topbar { padding: 10px 16px; }
      .content { padding: 16px; }
    }
  `,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly tiendas = inject(TiendasService);
  private readonly clientes = inject(ClientesService);
  private readonly router = inject(Router);

  protected readonly home = computed(() => this.auth.rol() === 'CLIENTE' ? '/mi-cuenta' : '/inicio');
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
