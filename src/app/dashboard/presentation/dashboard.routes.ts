import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const dashboardRoutes: Routes = [
  { path: 'inicio', canActivate: [roleGuard('ADMIN_SISTEMA', 'ADMIN_NEGOCIO')], loadComponent: () => import('./views/inicio/inicio').then((m) => m.Inicio), title: 'Inicio · CrediBarrio' },
];
