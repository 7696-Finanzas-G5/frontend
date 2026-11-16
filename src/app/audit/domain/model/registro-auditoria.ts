/** Registro inalterable de la bitácora de auditoría (audit trail, COBIT 2019). */
export interface RegistroAuditoria {
  readonly id: number;
  readonly idUsuario: number | null;
  readonly accion: string;
  readonly entidad: string;
  readonly idRegistro: number | null;
  readonly detalle: string | null;
  readonly fechaHora: string;
}
