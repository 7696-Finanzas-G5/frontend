import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-logo',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="logo" [class.big]="big()">
      <span class="mark"><app-icon name="store" [size]="big() ? 40 : 24" /></span>
      <div>
        <div class="name"><span>Credi</span>Barrio</div>
        <div class="tag">Control de Cuenta Corriente para Negocios</div>
      </div>
    </div>
  `,
  styles: `
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo.big { flex-direction: column; text-align: center; gap: 10px; }
    .mark { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
    .big .mark { width: 76px; height: 76px; }
    .name { font-weight: 800; font-size: 20px; color: #0d2a63; letter-spacing: -0.02em; line-height: 1.1; }
    .name span { color: var(--primary); }
    .big .name { font-size: 32px; }
    .tag { font-size: 11.5px; color: var(--muted); }
    .big .tag { font-size: 14px; }
  `,
})
export class Logo {
  readonly big = input(false);
}
