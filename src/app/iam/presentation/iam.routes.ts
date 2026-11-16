import { Route, Routes } from '@angular/router';
import { guestGuard, roleGuard } from './guards';

export const loginRoute: Route = {
  path: 'login',
  canActivate: [guestGuard],
  loadComponent: () => import('./views/login/login').then((m) => m.Login),
  title: 'Ingresar · CrediBarrio',
};

export const iamRoutes: Routes = [
  { path: 'usuarios', canActivate: [roleGuard('ADMIN_SISTEMA')], loadComponent: () => import('./views/usuarios/usuarios').then((m) => m.Usuarios), title: 'Usuarios · CrediBarrio' },
  { path: 'configuracion', loadComponent: () => import('./views/account-settings/account-settings').then((m) => m.AccountSettings), title: 'Configuración · CrediBarrio' },
];
