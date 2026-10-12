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
        <ng-content select="[cardActions]" />
        <span
          class="state"
          [class]="'state state--' + s.state.toLowerCase()"
          role="status"
          [attr.title]="s.detail"
        >
          @if (s.state === 'LIVE') {
            <span class="dot" aria-hidden="true"></span>
          } @else {
            <mw-icon [name]="icon()" [size]="13" />
          }
          {{ label() }}
          @if (s.detail && s.state !== 'UNAVAILABLE') {
            <span class="visually-hidden">: {{ s.detail }}</span>
          }
        </span>
        @if (externalUrl()) {
          <a
            class="ext"
            [href]="externalUrl()"
            target="_blank"
            rel="noopener noreferrer"
            [attr.title]="externalLabel()"
            [attr.aria-label]="
              externalLabel() + ': ' + broadcaster() + ' (opens ' + platform() + ' in a new tab)'
            "
          >
            <mw-icon name="external" [size]="15" />
          </a>
        }
      </header>

      <div class="frame" [class.frame--auto]="!fixedRatio()" [class.frame--fill]="fill()">
        @if (s.state === 'UNAVAILABLE') {
          <div class="fallback">
            <mw-icon name="x-circle" [size]="28" />
            <p>{{ s.detail ?? 'This stream cannot be played here.' }}</p>
            @if (externalUrl()) {
              <a class="btn" [href]="externalUrl()" target="_blank" rel="noopener noreferrer"
                >{{ externalLabel() }} <mw-icon name="external" [size]="14"
              /></a>
            }
          </div>
        } @else {
          <ng-content />
        }
      </div>
    </article>
  `,
  styles: `
    .card {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elevated);
      min-width: 0;
      overflow: hidden;
    }
    .head {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 44px;
      padding: 0 var(--space-2) 0 var(--space-4);
      border-bottom: 1px solid var(--border);
    }
    .who {
      flex: 1 1 auto;
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
    /*
     * Main tile in the wide focus layout: fill the height set by the two stacked side tiles.
     * aspect-ratio must be off here; with a set height it would derive the width and overflow.
     * Below 1101px (live.scss stacks the tiles) it keeps 16:9.
     */
    @media (min-width: 1101px) {
      .frame--fill {
        aspect-ratio: auto;
        height: 100%;
      }
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
    .ext {
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }
    .ext:hover {
      color: var(--text);
      background: var(--accent-soft);
    }
    @media (max-width: 480px) {
      .platform {
        display: none;
      }
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
  /** Stretch the player to the tile's height (main tile in the focus layout). */
  readonly fill = input(false);

  protected readonly headingId = computed(() => `stream-${this.streamId()}`);
  protected readonly label = computed(() => STREAM_STATE_LABEL[this.status().state]);
  protected readonly icon = computed(() => STATE_ICON[this.status().state]);
}
