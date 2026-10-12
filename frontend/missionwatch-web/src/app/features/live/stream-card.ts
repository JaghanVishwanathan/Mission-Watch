import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { StreamStatus } from './live.models';
import { STREAM_STATE_LABEL } from './live-util';

const STATE_ICON: Record<string, string> = {
  LOADING: 'clock',
  LIVE: 'spark',
  SCHEDULED: 'calendar',
  OFFLINE: 'pause',
  UNAVAILABLE: 'x-circle',
  UNKNOWN: 'help',
};

/** Frame shared by every broadcast panel: attribution, state, player area and external link. */
@Component({
  selector: 'mw-stream-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = status();
    <article class="card" [attr.aria-labelledby]="headingId()">
      <header class="head">
        <div class="who">
          <h3 [id]="headingId()">{{ broadcaster() }}</h3>
          <span class="platform">{{ platform() }}</span>
        </div>
        <span class="state" [class]="'state state--' + s.state.toLowerCase()" role="status">
          @if (s.state === 'LIVE') {
            <span class="dot" aria-hidden="true"></span>
          } @else {
            <mw-icon [name]="icon()" [size]="13" />
          }
          {{ label() }}
        </span>
      </header>

      <div class="frame" [class.frame--auto]="!fixedRatio()">
        @if (s.state === 'UNAVAILABLE') {
          <div class="fallback">
            <mw-icon name="x-circle" [size]="28" />
            <p>{{ s.detail ?? 'This stream cannot be played here.' }}</p>
          </div>
        } @else {
          <ng-content />
        }
      </div>

      <footer class="foot">
        <p class="detail">{{ s.state === 'UNAVAILABLE' ? '' : s.detail }}</p>
        @if (externalUrl()) {
          <a
            class="btn btn--ghost ext"
            [href]="externalUrl()"
            target="_blank"
            rel="noopener noreferrer"
            [attr.aria-label]="externalLabel() + ' (opens ' + platform() + ' in a new tab)'"
          >
            {{ externalLabel() }} <mw-icon name="external" [size]="14" />
          </a>
        }
      </footer>
    </article>
  `,
  styles: `
    .card {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elevated);
      min-width: 0;
    }
    .head,
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
    }
    .head {
      border-bottom: 1px solid var(--border);
    }
    .foot {
      border-top: 1px solid var(--border);
      min-height: 56px;
    }
    .who {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      min-width: 0;
    }
    h3 {
      font-size: var(--fs-md);
      letter-spacing: var(--tracking-wide);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .platform {
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
    .state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--status-neutral);
    }
    .state--live {
      color: var(--status-critical);
    }
    .state--scheduled {
      color: var(--status-info);
    }
    .state--unavailable {
      color: var(--status-warning);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.35;
      }
    }
    .frame {
      position: relative;
      aspect-ratio: 16 / 9;
      background: #000;
      overflow: hidden;
    }
    .frame--auto {
      aspect-ratio: auto;
      min-height: 0;
      max-height: 560px;
      overflow-y: auto;
      background: transparent;
      padding: var(--space-3);
    }
    .fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-4);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      background: var(--surface);
    }
    .frame--auto .fallback {
      position: static;
      min-height: 220px;
    }
    .detail {
      font-size: var(--fs-xs);
      color: var(--text-muted);
      min-width: 0;
    }
    .ext {
      flex-shrink: 0;
      height: 36px;
      padding: 0 var(--space-3);
    }
  `,
})
export class StreamCard {
  readonly streamId = input.required<string>();
  readonly broadcaster = input.required<string>();
  readonly platform = input.required<string>();
  readonly status = input.required<StreamStatus>();
  readonly externalUrl = input<string>();
  readonly externalLabel = input('Watch');
  /** 16:9 video frame; off for X posts, which size themselves. */
  readonly fixedRatio = input(true);

  protected readonly headingId = computed(() => `stream-${this.streamId()}`);
  protected readonly label = computed(() => STREAM_STATE_LABEL[this.status().state]);
  protected readonly icon = computed(() => STATE_ICON[this.status().state]);
}
