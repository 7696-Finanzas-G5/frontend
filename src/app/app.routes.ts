import { Routes } from '@angular/router';
import { billingRoutes } from './billing/presentation/billing.routes';
import { catalogRoutes } from './catalog/presentation/catalog.routes';
import { creditsRoutes } from './credits/presentation/credits.routes';
import { customersRoutes } from './customers/presentation/customers.routes';
import { dashboardRoutes } from './dashboard/presentation/dashboard.routes';
import { authGuard } from './iam/presentation/guards';
import { iamRoutes, loginRoute, registroRoute } from './iam/presentation/iam.routes';
import { storesRoutes } from './stores/presentation/stores.routes';

export const routes: Routes = [
  loginRoute,
  registroRoute,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      ...dashboardRoutes,
      ...storesRoutes,
      ...iamRoutes,
      ...catalogRoutes,
      ...customersRoutes,
      ...creditsRoutes,
      ...billingRoutes,
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    ],
  },
  { path: '**', redirectTo: '' },
];
