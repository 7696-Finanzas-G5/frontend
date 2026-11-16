import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ClientesService } from '../../../../customers/application/clientes.service';
import { nombreCompleto } from '../../../../customers/domain/model/cliente';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { FechaPipe } from '../../../../shared/presentation/pipes/format.pipes';
import { TiendasService } from '../../../../stores/application/tiendas.service';
import { AuthService } from '../../../application/auth.service';
import { UsuariosService } from '../../../application/usuarios.service';
import { Usuario, rolLabel } from '../../../domain/model/usuario';

@Component({
  selector: 'app-usuarios',
  imports: [Icon, PageHeader, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="users" title="Usuarios del Sistema" subtitle="Control de acceso por roles (RBAC)"
        help="Los administradores de negocio se crean al registrar una tienda y los usuarios de cliente al registrar un cliente. Aquí puede activar, desactivar o restablecer contraseñas." />

      @if (msg(); as m) { <div class="alert" [class.alert-ok]="m.ok" [class.alert-danger]="!m.ok"><app-icon [name]="m.ok ? 'check' : 'alert'" /> {{ m.text }}</div> }

      <section class="card">
        <div class="card-title">
          <h2>Usuarios registrados</h2>
          <div class="search"><app-icon name="search" [size]="16" /><input class="input" placeholder="Buscar por usuario o tienda..." (input)="q.set($any($event.target).value)" /></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Tienda</th><th>Cliente</th><th>Último acceso</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.u.id) {
                <tr>
                  <td><span class="cell-flex"><span class="avatar">{{ r.u.username.slice(0, 2).toUpperCase() }}</span><strong>{{ r.u.username }}</strong></span></td>
                  <td>{{ r.rol }}</td>
                  <td>{{ r.tienda }}</td>
                  <td>{{ r.cliente }}</td>
                  <td>{{ (r.u.ultimoAcceso | fecha: true) || '—' }}</td>
                  <td><span class="badge" [class.badge-ok]="r.u.estado === 'ACTIVO'" [class.badge-off]="r.u.estado !== 'ACTIVO'">{{ r.u.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</span></td>
                  <td><span class="cell-flex">
                    <button class="icon-btn" (click)="resetPass(r.u)" title="Restablecer contraseña" aria-label="Restablecer contraseña"><app-icon name="lock" [size]="15" /></button>
                    @if (r.u.id !== me()) {
                      <button class="icon-btn danger" (click)="toggle(r.u)" [title]="r.u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'" [attr.aria-label]="r.u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'">
                        <app-icon [name]="r.u.estado === 'ACTIVO' ? 'trash' : 'refresh'" [size]="15" />
                      </button>
                    }
                  </span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Usuarios {
  private readonly usuarios = inject(UsuariosService);
  private readonly tiendas = inject(TiendasService);
  private readonly clientes = inject(ClientesService);
  private readonly auth = inject(AuthService);

  protected readonly q = signal('');
  protected readonly msg = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly me = this.auth.userIdValue;

  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    this.tiendas.tiendas();
    const clientes = new Map(this.clientes.todos().map((c) => [c.id, nombreCompleto(c)]));
    return this.usuarios
      .usuarios()
      .map((u) => ({ u, rol: rolLabel(u.rol), tienda: u.idTienda ? this.tiendas.nombreDe(u.idTienda) : '—', cliente: (u.idCliente && clientes.get(u.idCliente)) || '—' }))
      .filter((r) => !q || r.u.username.toLowerCase().includes(q) || r.tienda.toLowerCase().includes(q));
  });

  async toggle(u: Usuario) {
    try {
      await this.usuarios.cambiarEstado(u.id, u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }

  async resetPass(u: Usuario) {
    const nueva = prompt(`Nueva contraseña para "${u.username}" (8 a 64 caracteres):`);
    if (nueva == null) return;
    try {
      await this.usuarios.restablecerClave(u.id, nueva);
      this.msg.set({ ok: true, text: `Contraseña de "${u.username}" restablecida.` });
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }
}
