import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-page-header',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ph card">
      <div class="ph-main">
        <span class="ph-icon" [attr.data-icon]="icon()"><app-icon [name]="icon()" [size]="30" /></span>
        <div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) { <p>{{ subtitle() }}</p> }
        </div>
      </div>
      @if (help()) {
        <aside class="ph-help"><app-icon name="info" [size]="16" /><span><strong>Ayuda del Sistema:</strong> {{ help() }}</span></aside>
      }
    </div>
  `,
  styles: `
    .ph { display: flex; justify-content: space-between; gap: 20px; align-items: center; flex-wrap: wrap; }
    .ph-main { display: flex; gap: 16px; align-items: center; }
    .ph-icon {
      display: grid;
      place-items: center;
      flex: 0 0 46px;
      min-height: 42px;
      color: var(--section-color, var(--primary));
      border-inline-end: 2px solid currentColor;
      padding-inline-end: 12px;
    }
    .ph-icon[data-icon="card"] { --section-color: #b5246d; }
    .ph-icon[data-icon="users"] { --section-color: #7139b7; }
    .ph-icon:is([data-icon="tag"], [data-icon="store"]) { --section-color: #168044; }
    .ph-icon[data-icon="chart"] { --section-color: var(--metric); }
    h1 { margin: 0; font-size: 22px; }
    p { margin: 2px 0 0; color: var(--muted); }
    .ph-help {
      max-width: 380px; display: flex; gap: 8px; font-size: 12px; line-height: 1.45; color: var(--text);
      background: var(--primary-soft); border: 1px solid var(--primary-border); border-radius: 10px; padding: 10px 12px;
    }
    .ph-help strong { color: var(--primary); }
    .ph-help app-icon { color: var(--primary); margin-top: 1px; }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input('info');
  readonly help = input('');
}
