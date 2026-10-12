import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mw-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="text">
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-5);
      padding-bottom: var(--space-6);
      border-bottom: 1px solid var(--border);
    }
    .text {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }
    h1 {
      font-size: clamp(2.25rem, 5vw, 3.75rem);
      line-height: 1;
      letter-spacing: 0.03em;
    }
    .eyebrow {
      font-size: var(--fs-xs);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wide);
      color: var(--text-muted);
      font-weight: 600;
    }
    .subtitle {
      color: var(--text-secondary);
      max-width: 68ch;
      font-size: var(--fs-lg);
      font-weight: 300;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly eyebrow = input<string>();
}
