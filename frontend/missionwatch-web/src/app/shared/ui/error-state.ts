import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'mw-error-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="alert">
      <mw-icon name="alert" [size]="28" />
      <p class="title">{{ title() }}</p>
      <p class="message">{{ message() }}</p>
      <button type="button" class="btn" (click)="retry.emit()">
        <mw-icon name="refresh" [size]="16" /> Try again
      </button>
    </div>
  `,
  styles: `
    .state {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      color: var(--status-critical);
      border: 1px solid color-mix(in srgb, var(--status-critical) 40%, transparent);
      background: color-mix(in srgb, var(--status-critical) 6%, transparent);
      border-radius: var(--radius);
    }
    .title {
      color: var(--text);
      font-weight: 600;
    }
    .message {
      color: var(--text-secondary);
      max-width: 48ch;
      font-size: var(--fs-sm);
      margin-bottom: var(--space-2);
    }
  `,
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('The data could not be loaded. Check your connection and try again.');
  readonly retry = output<void>();
}
