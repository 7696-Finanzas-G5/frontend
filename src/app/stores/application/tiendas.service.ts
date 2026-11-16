import { Injectable, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { AuthService } from '../../iam/application/auth.service';
import { UsuariosService } from '../../iam/application/usuarios.service';
import { DomainError } from '../../shared/domain/domain-error';
import { nowIsoMinutes } from '../../shared/domain/finance/dates';
import { DatosTienda, EstadoTienda, Tienda, validarDatosTienda } from '../domain/model/tienda';
import { TiendaRepository } from '../domain/repositories/tienda.repository';

export interface GuardarTiendaCommand {
  datos: DatosTienda;
  activa: boolean;
  adminUsername: string;
  /** Obligatoria al registrar; opcional al editar. */
  adminClave: string;
}

/** Casos de uso del Administrador del Sistema: alta y baja de tiendas multi-giro. */
@Injectable({ providedIn: 'root' })
export class TiendasService {
  private readonly repo = inject(TiendaRepository);
  private readonly usuarios = inject(UsuariosService);
  private readonly audit = inject(AuditService);
  private readonly auth = inject(AuthService);

  readonly tiendas = this.repo.all;

  findById(id: number | null | undefined): Tienda | undefined {
    return this.repo.findById(id);
  }

  nombreDe(id: number | null | undefined): string {
    return this.repo.findById(id)?.nombreComercial ?? '—';
  }

  isRucTaken(ruc: string, exceptId?: number | null): boolean {
    const t = this.repo.findByRuc(ruc);
    return !!t && t.id !== exceptId;
  }

  async registrar(cmd: GuardarTiendaCommand): Promise<Tienda> {
    const datos = validarDatosTienda(cmd.datos);
    if (this.isRucTaken(datos.ruc)) throw new DomainError('Ya existe una tienda con este RUC.');
    if (this.usuarios.isUsernameTaken(cmd.adminUsername)) throw new DomainError('El usuario administrador ya está en uso.');
    const estado: EstadoTienda = cmd.activa ? 'ACTIVA' : 'INACTIVA';
    const tienda = this.repo.add({ ...datos, estado, fechaRegistro: nowIsoMinutes() });
    await this.usuarios.registrar({
      username: cmd.adminUsername,
      clave: cmd.adminClave,
      rol: 'ADMIN_NEGOCIO',
      idTienda: tienda.id,
      idCliente: null,
      estado: cmd.activa ? 'ACTIVO' : 'INACTIVO',
    });
    this.audit.registrar(this.auth.userIdValue(), 'ALTA', 'tienda', tienda.id, datos.nombreComercial);
    return tienda;
  }

  async actualizar(id: number, cmd: GuardarTiendaCommand): Promise<Tienda> {
    const datos = validarDatosTienda(cmd.datos);
    if (this.isRucTaken(datos.ruc, id)) throw new DomainError('Ya existe una tienda con este RUC.');
    const estado = cmd.activa ? 'ACTIVO' : 'INACTIVO';
    const admin = this.usuarios.adminDeTienda(id);
    if (admin) {
      await this.usuarios.actualizarCredenciales(admin.id, { username: cmd.adminUsername, clave: cmd.adminClave || undefined, estado });
    } else if (cmd.adminClave) {
      await this.usuarios.registrar({ username: cmd.adminUsername, clave: cmd.adminClave, rol: 'ADMIN_NEGOCIO', idTienda: id, idCliente: null, estado });
    }
    const tienda = this.repo.update(id, { ...datos, estado: cmd.activa ? 'ACTIVA' : 'INACTIVA' });
    this.audit.registrar(this.auth.userIdValue(), 'EDITAR', 'tienda', id, datos.nombreComercial);
    return tienda;
  }

  cambiarEstado(id: number, activa: boolean): void {
    const t = this.repo.update(id, { estado: activa ? 'ACTIVA' : 'INACTIVA' });
    this.usuarios.sincronizarEstadoAdminTienda(id, activa ? 'ACTIVO' : 'INACTIVO');
    this.audit.registrar(this.auth.userIdValue(), activa ? 'ALTA' : 'BAJA', 'tienda', id, t.nombreComercial);
  }
}
