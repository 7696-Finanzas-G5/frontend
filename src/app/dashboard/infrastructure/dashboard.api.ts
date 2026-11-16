import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../shared/infrastructure/http/api-client';

export interface RegistroBitacora {
  id: number;
  idUsuario: number | null;
  usuario: string;
  accion: string;
  entidad: string;
  idRegistro: number | null;
  detalle: string | null;
  fechaHora: string;
}

export interface Vencimiento {
  key: string;
  fecha: string;
  idCliente: number;
  cliente: string;
  concepto: string;
  monto: number;
  vencido: boolean;
}

export interface ResumenSistema {
  tiendas: number;
  tiendasActivas: number;
  usuarios: number;
  clientes: number;
  compras: number;
  bitacoraReciente: RegistroBitacora[];
}

export interface ResumenNegocio {
  tienda: string;
  clientes: number;
  productos: number;
  deuda: number;
  disponible: number;
  proximosVencimientos: Vencimiento[];
  bitacoraReciente: RegistroBitacora[];
}

/** Adaptador HTTP de `/dashboard` (modelo de lectura que combina varios contextos). */
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly api = inject(ApiClient);

  sistema(): Promise<ResumenSistema> {
    return this.api.get('/dashboard/sistema');
  }

  negocio(): Promise<ResumenNegocio> {
    return this.api.get('/dashboard/negocio');
  }
}
