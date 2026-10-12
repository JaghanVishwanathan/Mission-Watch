import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Launch, UPCOMING_STATUSES } from '../../core/models';
import { formatLaunchTime } from '../../core/util/launch-time';
import { Countdown } from './countdown';
import { Icon } from './icon';
import { StatusBadge } from './status-badge';

/**
 * A launch as either an image tile ('grid') or a manifest line ('row').
 * The whole item is one link; the title is the accessible name.
 */
@Component({
  selector: 'mw-launch-card',
  imports: [RouterLink, Countdown, Icon, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.row]': "layout() === 'row'" },
  template: `
    @let l = launch();
    @if (layout() === 'row') {
      <article class="line">
        <div class="date" aria-hidden="true">
          <span class="day">{{ day() }}</span>
          <span class="month">{{ month() }}</span>
        </div>
        <div class="main">
          <h3 class="title">
            <a [routerLink]="['/launches', l.id]" class="stretched">{{ l.missionName }}</a>
          </h3>
          <p class="sub">{{ l.provider.abbrev ?? l.provider.name }} · {{ l.rocket.name }}</p>
        </div>
        <p class="site">
          <span class="overline">Site</span>
          <span>{{ l.site.name }}{{ l.site.countryCode ? ', ' + l.site.countryCode : '' }}</span>
        </p>
        <div class="state">
          <mw-status-badge [status]="l.status" />
          @if (isUpcoming() && !l.timePrecision) {
            <mw-countdown [target]="l.scheduledTime" [compact]="true" />
          } @else {
            <time class="when" [attr.datetime]="l.scheduledTime">{{ when() }}</time>
          }
        </div>
        <mw-icon class="chevron" name="arrow-right" [size]="18" />
      </article>
    } @else {
      <article class="tile">
        <div class="media">
          @if ((l.thumbnailUrl ?? l.imageUrl) && !imageFailed()) {
            <img
              [src]="l.thumbnailUrl ?? l.imageUrl"
              alt=""
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              (error)="imageFailed.set(true)"
            />
          } @else {
            <mw-icon name="rocket" [size]="32" />
            <span class="visually-hidden">No mission image available</span>
          }
        </div>
        <div class="body">
          <div class="meta">
            <time [attr.datetime]="l.scheduledTime">{{ when() }}</time>
            <mw-status-badge [status]="l.status" />
          </div>
          <h3 class="title">
            <a [routerLink]="['/launches', l.id]" class="stretched">{{ l.missionName }}</a>
          </h3>
          <p class="sub">{{ l.provider.name }} · {{ l.rocket.name }}</p>
          <p class="sub muted">
            {{ l.site.name }}{{ l.site.countryCode ? ', ' + l.site.countryCode : '' }}
          </p>
        </div>
      </article>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .title {
      font-size: var(--fs-lg);
      letter-spacing: 0.05em;
      line-height: 1.15;
    }
    .title a {
      color: inherit;
      text-decoration: none;
    }
    .stretched::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    .stretched:focus-visible {
      outline: none;
    }
    .stretched:focus-visible::after {
      outline: 2px solid var(--focus-ring);
      outline-offset: -2px;
    }
    .sub {
      color: var(--text-secondary);
      font-size: var(--fs-sm);
    }
    .muted {
      color: var(--text-muted);
    }

    /* Tile */
    .tile {
      position: relative;
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr;
      border-bottom: 1px solid var(--border);
    }
    .media {
      position: relative;
      overflow: hidden;
      aspect-ratio: 16 / 10;
      display: grid;
      place-items: center;
      color: var(--text-muted);
      background: radial-gradient(120% 80% at 50% 120%, #1b2533 0%, #050608 70%);
    }
    .media img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.001);
      transition:
        transform 600ms var(--ease),
        filter 600ms var(--ease);
      filter: saturate(0.9);
    }
    .tile:hover .media img {
      transform: scale(1.04);
      filter: saturate(1);
    }
    .body {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4) 0 var(--space-5);
      align-content: start;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
      align-items: center;
      justify-content: space-between;
      font-size: var(--fs-xs);
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      color: var(--text-muted);
    }

    /* Manifest row */
    .line {
      position: relative;
      display: grid;
      grid-template-columns: 64px minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr) 24px;
      gap: var(--space-5);
      align-items: center;
      padding: var(--space-5) var(--space-2);
      border-bottom: 1px solid var(--border);
      transition: background var(--dur-fast) var(--ease);
    }
    .line:hover {
      background: var(--accent-soft);
    }
    .date {
      display: grid;
      justify-items: start;
      line-height: 1;
    }
    .day {
      font-size: 2rem;
      font-weight: 300;
    }
    .month {
      font-size: var(--fs-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .main {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .site {
      display: grid;
      gap: 2px;
      font-size: var(--fs-sm);
      color: var(--text-secondary);
      min-width: 0;
    }
    .state {
      display: grid;
      gap: 6px;
      justify-items: start;
      font-size: var(--fs-sm);
    }
    .when {
      color: var(--text-secondary);
      font-size: var(--fs-sm);
    }
    .chevron {
      color: var(--text-muted);
      transition:
        transform var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .line:hover .chevron {
      transform: translateX(4px);
      color: var(--text);
    }

    @media (max-width: 760px) {
      .line {
        grid-template-columns: 52px minmax(0, 1fr);
        gap: var(--space-2) var(--space-4);
        padding: var(--space-4) 0;
      }
      .date {
        grid-row: span 2;
      }
      .site,
      .chevron {
        display: none;
      }
      .day {
        font-size: 1.6rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .tile:hover .media img {
        transform: none;
      }
    }
  `,
})
export class LaunchCard {
  readonly launch = input.required<Launch>();
  readonly layout = input<'grid' | 'row'>('grid');

  protected readonly imageFailed = signal(false);
  protected readonly isUpcoming = computed(() => UPCOMING_STATUSES.includes(this.launch().status));
  protected readonly when = computed(() =>
    formatLaunchTime(this.launch().scheduledTime, this.launch().timePrecision),
  );
  private readonly date = computed(() => new Date(this.launch().scheduledTime));
  /** A month-precision date has no meaningful day, so the day column shows a dash. */
  protected readonly day = computed(() => {
    const p = this.launch().timePrecision?.toLowerCase();
    return p && !['hour', 'morning', 'afternoon', 'day'].includes(p)
      ? '—'
      : String(this.date().getDate()).padStart(2, '0');
  });
  protected readonly month = computed(() =>
    this.date().toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
  );
}
