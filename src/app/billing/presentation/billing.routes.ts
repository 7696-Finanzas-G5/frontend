import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const billingRoutes: Routes = [
  { path: 'reportes', canActivate: [roleGuard('ADMIN_NEGOCIO')], loadComponent: () => import('./views/reportes/reportes').then((m) => m.Reportes), title: 'Estado de cuenta · CrediBarrio' },
  { path: 'mi-cuenta', canActivate: [roleGuard('CLIENTE')], loadComponent: () => import('./views/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta), title: 'Mi cuenta · CrediBarrio' },
];
