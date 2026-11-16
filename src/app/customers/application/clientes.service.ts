import { Injectable, computed, inject } from '@angular/core';
import { AuditService } from '../../audit/application/audit.service';
import { AuthService } from '../../iam/application/auth.service';
import { UsuariosService } from '../../iam/application/usuarios.service';
import { DomainError } from '../../shared/domain/domain-error';
import { nowIsoMinutes, todayIso } from '../../shared/domain/finance/dates';
import { Cliente, DatosCliente, nombreCompleto, validarDatosCliente } from '../domain/model/cliente';
import { CondicionCredito, TerminosCredito, mismosTerminos, validarTerminos } from '../domain/model/condicion-credito';
import { ClienteRepository } from '../domain/repositories/cliente.repository';
import { CondicionCreditoRepository } from '../domain/repositories/condicion-credito.repository';

export interface GuardarClienteCommand {
  datos: DatosCliente;
  terminos: TerminosCredito;
  activo: boolean;
  /** Acceso opcional del cliente con el rol Cliente / Vecino. */
  acceso?: { username: string; clave: string } | null;
}

/** Casos de uso: alta/baja de clientes y configuración de su línea de crédito. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly clientes = inject(ClienteRepository);
  private readonly condiciones = inject(CondicionCreditoRepository);
  private readonly usuarios = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);

  readonly todos = this.clientes.all;
  readonly todasLasCondiciones = this.condiciones.all;
  readonly deMiTienda = computed(() => this.clientes.all().filter((c) => c.idTienda === this.auth.tiendaId()));
  readonly activosDeMiTienda = computed(() => this.deMiTienda().filter((c) => c.estado === 'ACTIVO'));

  findById(id: number | null | undefined): Cliente | undefined {
    return this.clientes.findById(id);
  }

  condicionVigente(idCliente: number): CondicionCredito | undefined {
    // Lee el signal para que los consumidores reaccionen a cambios
    this.condiciones.all();
    return this.condiciones.findVigente(idCliente);
  }

  condicionById(id: number): CondicionCredito | undefined {
    return this.condiciones.findById(id);
  }

  isDniTaken(dni: string, exceptId?: number | null): boolean {
    const idTienda = this.auth.tiendaId();
    const c = idTienda == null ? undefined : this.clientes.findByDni(idTienda, dni);
    return !!c && c.id !== exceptId;
  }

  async registrar(cmd: GuardarClienteCommand): Promise<Cliente> {
    const idTienda = this.auth.tiendaId();
    if (idTienda == null) throw new DomainError('El usuario no pertenece a una tienda.');
    const datos = validarDatosCliente(cmd.datos);
    const terminos = validarTerminos(cmd.terminos);
    if (this.isDniTaken(datos.dni)) throw new DomainError('Ya existe un cliente con este DNI en la tienda.');
    if (cmd.acceso?.username && this.usuarios.isUsernameTaken(cmd.acceso.username)) throw new DomainError('El nombre de usuario ya está en uso.');

    const estado = cmd.activo ? 'ACTIVO' : 'INACTIVO';
    const cliente = this.clientes.add({ ...datos, idTienda, correo: null, estado, fechaRegistro: nowIsoMinutes() });
    this.condiciones.add({ ...terminos, idCliente: cliente.id, vigenteDesde: todayIso(), vigenteHasta: null, estado: 'VIGENTE' });
    if (cmd.acceso?.username) {
      await this.usuarios.registrar({ username: cmd.acceso.username, clave: cmd.acceso.clave, rol: 'CLIENTE', idTienda, idCliente: cliente.id, estado });
    }
    this.audit.registrar(this.auth.userIdValue(), 'ALTA', 'cliente', cliente.id, nombreCompleto(datos));
    return cliente;
  }

  async actualizar(id: number, cmd: GuardarClienteCommand): Promise<Cliente> {
    const datos = validarDatosCliente(cmd.datos);
    const terminos = validarTerminos(cmd.terminos);
    if (this.isDniTaken(datos.dni, id)) throw new DomainError('Ya existe un cliente con este DNI en la tienda.');
    const estado = cmd.activo ? 'ACTIVO' : 'INACTIVO';

    const usuario = this.usuarios.usuarioDeCliente(id);
    if (cmd.acceso?.username) {
      if (usuario) {
        await this.usuarios.actualizarCredenciales(usuario.id, { username: cmd.acceso.username, clave: cmd.acceso.clave || undefined, estado });
      } else {
        await this.usuarios.registrar({ username: cmd.acceso.username, clave: cmd.acceso.clave, rol: 'CLIENTE', idTienda: this.auth.tiendaId(), idCliente: id, estado });
      }
    } else {
      this.usuarios.sincronizarEstadoCliente(id, estado);
    }

    const cliente = this.clientes.update(id, { ...datos, estado });
    const actual = this.condiciones.findVigente(id);
    if (!actual || !mismosTerminos(actual, terminos)) {
      // Versionado: las compras ya registradas conservan la condición con la que fueron pactadas.
      if (actual) this.condiciones.update(actual.id, { estado: 'HISTORICA', vigenteHasta: todayIso() });
      this.condiciones.add({ ...terminos, idCliente: id, vigenteDesde: todayIso(), vigenteHasta: null, estado: 'VIGENTE' });
    }
    this.audit.registrar(this.auth.userIdValue(), 'EDITAR', 'cliente', id, nombreCompleto(datos));
    return cliente;
  }

  cambiarEstado(id: number, activo: boolean): void {
    const estado = activo ? 'ACTIVO' : 'INACTIVO';
    const c = this.clientes.update(id, { estado });
    this.usuarios.sincronizarEstadoCliente(id, estado);
    this.audit.registrar(this.auth.userIdValue(), activo ? 'ALTA' : 'BAJA', 'cliente', id, nombreCompleto(c));
  }
}
