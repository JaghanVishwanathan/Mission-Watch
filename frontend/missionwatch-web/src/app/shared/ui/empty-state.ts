import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'mw-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="status">
      <mw-icon [name]="icon()" [size]="28" />
      <p class="title">{{ title() }}</p>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .state {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-7) var(--space-4);
      text-align: center;
      color: var(--text-muted);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius);
    }
    .title {
      color: var(--text);
      font-weight: 600;
    }
    .message {
      max-width: 48ch;
      font-size: var(--fs-sm);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input('search');
}
