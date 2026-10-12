import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DataMeta } from '../../core/models';
import { relativeTime } from '../../core/util/time';
import { Icon } from './icon';

/** Data older than this is flagged as stale by default (SRS §10.3). */
export const STALE_AFTER_MS = 6 * 3_600_000;

/** Source, freshness and any warnings for a block of data (SRS §5.7, §10.3). */
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
      @if (m.sourceUrl) {
        <a [href]="m.sourceUrl" target="_blank" rel="noopener noreferrer">{{ m.source }}</a>
      } @else {
        <span>{{ m.source }}</span>
      }
      <span aria-hidden="true">·</span>
      <span
        >{{ m.stale ? 'Saved copy from' : stale() ? 'Stale, updated' : 'Updated' }}
        {{ updated() }}</span
      >
      @if (m.isMock) {
        <span class="tag">Demo data</span>
      }
    </span>
    @if (showWarnings() && m.warnings.length) {
      <ul class="warnings" role="status">
        @for (w of m.warnings; track w) {
          <li><mw-icon name="alert" [size]="12" /> {{ w }}</li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 4px;
    }
    .freshness {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
    .freshness a {
      color: inherit;
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
    .warnings {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 2px;
      font-size: var(--fs-xs);
      color: var(--status-warning);
    }
    .warnings li {
      display: flex;
      gap: 6px;
      align-items: baseline;
    }
  `,
})
export class FreshnessIndicator {
  readonly meta = input.required<DataMeta>();
  /** Snapshot-style sources refresh less often, so they can raise the threshold. */
  readonly staleAfterMs = input(STALE_AFTER_MS);
  readonly showWarnings = input(true);

  protected readonly stale = computed(
    () =>
      !!this.meta().stale || Date.now() - Date.parse(this.meta().lastRefresh) > this.staleAfterMs(),
  );
  protected readonly updated = computed(() => relativeTime(this.meta().lastRefresh));
}
