import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../application/auth.service';
import { Rol } from '../domain/model/usuario';

export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

export const roleGuard =
  (...roles: Rol[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const rol = auth.rol();
    return (rol !== null && roles.includes(rol)) || inject(Router).createUrlTree([auth.homeFor(rol)]);
  };

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).createUrlTree([auth.homeFor(auth.rol())]);
};
