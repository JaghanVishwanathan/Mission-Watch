import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'mw-stat-tile',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tile">
      <div class="label">
        @if (icon(); as name) {
          <mw-icon [name]="name" [size]="16" />
        }
        {{ label() }}
      </div>
      <div class="value">{{ value() }}</div>
      @if (hint()) {
        <div class="hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tile {
      height: 100%;
      display: grid;
      gap: var(--space-1);
      align-content: start;
      padding: var(--space-4) var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-secondary);
      font-size: var(--fs-sm);
    }
    .value {
      font-size: var(--fs-2xl);
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    .hint {
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
  `,
})
export class StatTile {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly icon = input<string>();
}
