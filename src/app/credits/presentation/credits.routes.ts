import { Routes } from '@angular/router';
import { roleGuard } from '../../iam/presentation/guards';

export const creditsRoutes: Routes = [
  { path: 'creditos', canActivate: [roleGuard('ADMIN_NEGOCIO')], loadComponent: () => import('./views/creditos/creditos').then((m) => m.Creditos), title: 'Créditos · CrediBarrio' },
];
