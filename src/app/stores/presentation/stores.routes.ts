import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const storesRoutes: Routes = [
  { path: 'tiendas', canActivate: [roleGuard('ADMIN_SISTEMA')], loadComponent: () => import('./views/tiendas/tiendas').then((m) => m.Tiendas), title: 'Tiendas · CrediBarrio' },
];
