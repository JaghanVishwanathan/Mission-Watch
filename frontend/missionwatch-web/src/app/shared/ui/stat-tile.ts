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
      gap: var(--space-2);
      align-content: start;
      padding: var(--space-5) 0;
      border-top: 1px solid var(--border-strong);
    }
    .label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-muted);
      font-size: var(--fs-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
    }
    .value {
      font-size: clamp(2rem, 3.6vw, 2.75rem);
      font-weight: 300;
      line-height: 1.05;
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
