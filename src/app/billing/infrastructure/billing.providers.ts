import { Provider } from '@angular/core';
import { LiquidacionRepository } from '../domain/repositories/liquidacion.repository';
import { PagoRepository } from '../domain/repositories/pago.repository';
import { LocalStorageLiquidacionRepository } from './local-storage-liquidacion.repository';
import { LocalStoragePagoRepository } from './local-storage-pago.repository';

export const provideBilling = (): Provider[] => [
  { provide: LiquidacionRepository, useClass: LocalStorageLiquidacionRepository },
  { provide: PagoRepository, useClass: LocalStoragePagoRepository },
];
