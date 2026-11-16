import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const customersRoutes: Routes = [
  { path: 'clientes', canActivate: [roleGuard('ADMIN_NEGOCIO')], loadComponent: () => import('./views/clientes/clientes').then((m) => m.Clientes), title: 'Clientes · CrediBarrio' },
];
