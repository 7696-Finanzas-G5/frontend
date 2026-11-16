import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const catalogRoutes: Routes = [
  { path: 'catalogo', canActivate: [roleGuard('ADMIN_NEGOCIO')], loadComponent: () => import('./views/catalogo/catalogo').then((m) => m.Catalogo), title: 'Catálogo · CrediBarrio' },
];
