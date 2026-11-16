import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TokenStorage } from './token-storage';

/**
 * Adjunta `Authorization: Bearer <jwt>` a las peticiones al backend y, si la sesión expiró
 * (HTTP 401), descarta el token y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const tokens = inject(TokenStorage);
  const router = inject(Router);
  const token = tokens.token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !req.url.endsWith('/auth/login')) {
        tokens.clear();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
