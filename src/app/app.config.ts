import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './iam/application/auth.service';
import { authInterceptor } from './shared/infrastructure/http/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Backend CrediBarrio (Spring Boot): el interceptor adjunta el JWT de la sesión
    provideHttpClient(withInterceptors([authInterceptor])),
    // Recupera la sesión guardada antes de evaluar los guards de las rutas
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
