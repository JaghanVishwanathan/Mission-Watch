import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DataMeta } from '../../core/models';
import { relativeTime } from '../../core/util/time';
import { Icon } from './icon';

/** Data older than this is flagged as stale (SRS §10.3). */
export const STALE_AFTER_MS = 6 * 3_600_000;

@Component({
  selector: 'mw-freshness',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let m = meta();
    <span
      class="freshness"
      [class.stale]="stale()"
      [attr.title]="'Last refreshed ' + m.lastRefresh"
    >
      <mw-icon [name]="stale() ? 'alert' : 'database'" [size]="14" />
      <span>{{ m.source }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ stale() ? 'Stale, updated' : 'Updated' }} {{ updated() }}</span>
      @if (m.isMock) {
        <span class="tag">Demo data</span>
      }
    </span>
  `,
  styles: `
    .freshness {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
    .stale {
      color: var(--status-warning);
    }
    .tag {
      padding: 1px 8px;
      border-radius: var(--radius-pill);
      background: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: 600;
    }
  `,
})
export class FreshnessIndicator {
  readonly meta = input.required<DataMeta>();
  protected readonly stale = computed(
    () => Date.now() - Date.parse(this.meta().lastRefresh) > STALE_AFTER_MS,
  );
  protected readonly updated = computed(() => relativeTime(this.meta().lastRefresh));
}
