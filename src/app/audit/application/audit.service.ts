import { Injectable, inject } from '@angular/core';
import { nowIsoMinutes } from '../../shared/domain/finance/dates';
import { BitacoraRepository } from '../domain/repositories/bitacora.repository';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly repo = inject(BitacoraRepository);
  readonly registros = this.repo.all;

  registrar(idUsuario: number | null, accion: string, entidad: string, idRegistro: number | null, detalle: string | null = null): void {
    this.repo.add({ idUsuario, accion, entidad, idRegistro, detalle, fechaHora: nowIsoMinutes() });
  }
}
