import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';

/** Botón "?" de ayuda contextual junto a cada campo (requisito 6.2). */
@Component({
  selector: 'app-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="help-btn" [attr.aria-label]="'Ayuda: ' + title()" [attr.aria-expanded]="open()"
      (click)="open.set(!open())" (mouseenter)="open.set(true)" (mouseleave)="open.set(false)">?</button>
    @if (open()) {
      <span class="help-pop" role="tooltip"><strong>{{ title() }}:</strong> {{ text() }}</span>
    }
  `,
  styles: `
    :host { position: relative; display: inline-flex; vertical-align: middle; margin-left: 6px; }
    .help-btn {
      width: 18px; height: 18px; border-radius: 50%; border: 0; padding: 0; cursor: help;
      background: var(--primary); color: #fff; font-size: 11px; font-weight: 700; line-height: 18px;
    }
    .help-pop {
      position: absolute; z-index: 50; top: -6px; left: 26px; width: 260px;
      background: var(--surface); color: var(--text); border: 1px solid var(--border);
      box-shadow: var(--shadow-lg); border-radius: 10px; padding: 10px 12px;
      font-size: 12px; font-weight: 400; line-height: 1.45; text-transform: none; letter-spacing: 0;
    }
    .help-pop strong { color: var(--primary); }
    @media (max-width: 720px) { .help-pop { left: auto; right: -8px; top: 26px; } }
  `,
})
export class HelpTip {
  readonly text = input.required<string>();
  readonly title = input('Ayuda');
  protected readonly open = signal(false);
  private readonly el = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!this.el.nativeElement.contains(e.target)) this.open.set(false);
  }
}
