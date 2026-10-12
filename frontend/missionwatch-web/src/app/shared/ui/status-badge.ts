import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LaunchStatus } from '../../core/models';
import { STATUS_INFO } from '../../core/util/status';
import { Icon } from './icon';

/** Status is always conveyed by icon + text, never by colour alone (SRS §10.4). */
@Component({
  selector: 'mw-status-badge',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'badge tone-' + info().tone" [attr.title]="info().description">
      <mw-icon [name]="info().icon" [size]="14" />
      {{ info().label }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px 2px 8px;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 600;
      white-space: nowrap;
      border: 1px solid currentColor;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
    .tone-good {
      color: var(--status-good);
    }
    .tone-warning {
      color: var(--status-warning);
    }
    .tone-serious {
      color: var(--status-serious);
    }
    .tone-critical {
      color: var(--status-critical);
    }
    .tone-info {
      color: var(--status-info);
    }
    .tone-neutral {
      color: var(--status-neutral);
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<LaunchStatus>();
  protected readonly info = computed(() => STATUS_INFO[this.status()]);
}
