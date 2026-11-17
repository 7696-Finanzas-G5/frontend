import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="logo" [class.big]="big()">
      <span class="mark" aria-hidden="true"><span>C</span><i></i></span>
      <div class="wordmark">
        <div class="name">CrediBarrio</div>
        <div class="tag">Control de Cuenta Corriente para Negocios</div>
      </div>
    </div>
  `,
  styles: `
    .logo { display: flex; align-items: center; gap: 11px; }
    .logo.big { gap: 10px; }
    .mark { position: relative; display: grid; place-items: center; width: 34px; height: 34px; color: var(--accent); border-left: 3px solid currentColor; font-family: Georgia,serif; font-size: 32px; font-weight: 700; line-height: 1; }
    .mark i { position: absolute; width: 13px; height: 3px; right: 0; bottom: 6px; background: currentColor; transform: rotate(-45deg); transform-origin: right center; }
    .big .mark { width: 42px; height: 42px; font-size: 39px; }
    .name { font-weight: 760; font-size: 18px; color: var(--primary); letter-spacing: -.055em; line-height: 1; }
    .big .name { font-size: 20px; }
    .tag { margin-top: 4px; font-size: 10px; color: var(--muted); letter-spacing: .005em; }
    .big .tag { font-size: 11px; }
  `,
})
export class Logo {
  readonly big = input(false);
}
