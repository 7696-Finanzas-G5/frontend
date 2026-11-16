import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideAudit } from './audit/infrastructure/audit.providers';
import { provideBilling } from './billing/infrastructure/billing.providers';
import { buildDemoSeed } from './bootstrap/demo-seed';
import { provideCatalog } from './catalog/infrastructure/catalog.providers';
import { provideCredits } from './credits/infrastructure/credits.providers';
import { provideCustomers } from './customers/infrastructure/customers.providers';
import { PasswordHasher } from './iam/domain/services/password-hasher';
import { provideIam } from './iam/infrastructure/iam.providers';
import { DemoDataService } from './shared/application/demo-data.service';
import { LocalDatabase } from './shared/infrastructure/persistence/local-database';
import { LocalStorageDemoDataService } from './shared/infrastructure/persistence/local-storage-demo-data.service';
import { provideStores } from './stores/infrastructure/stores.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Infraestructura de cada bounded context (puertos de dominio → adaptadores)
    provideAudit(),
    provideIam(),
    provideStores(),
    provideCatalog(),
    provideCustomers(),
    provideCredits(),
    provideBilling(),
    { provide: DemoDataService, useClass: LocalStorageDemoDataService },
    provideAppInitializer(() => {
      const hasher = inject(PasswordHasher);
      return inject(LocalDatabase).init(() => buildDemoSeed(hasher));
    }),
  ],
};
