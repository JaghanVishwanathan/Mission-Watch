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
      gap: var(--space-4);
    }
    .text {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }
    h1 {
      font-size: var(--fs-3xl);
    }
    .eyebrow {
      font-size: var(--fs-xs);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent-strong);
      font-weight: 650;
    }
    .subtitle {
      color: var(--text-secondary);
      max-width: 70ch;
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
    @media (max-width: 600px) {
      h1 {
        font-size: var(--fs-2xl);
      }
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly eyebrow = input<string>();
}
