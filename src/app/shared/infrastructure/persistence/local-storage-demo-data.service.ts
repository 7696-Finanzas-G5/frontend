import { Injectable, inject } from '@angular/core';
import { DemoDataService } from '../../application/demo-data.service';
import { LocalDatabase } from './local-database';

@Injectable()
export class LocalStorageDemoDataService implements DemoDataService {
  private readonly db = inject(LocalDatabase);

  reset(): Promise<void> {
    return this.db.reset();
  }
}
