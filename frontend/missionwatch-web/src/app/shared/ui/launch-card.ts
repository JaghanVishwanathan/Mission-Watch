import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Launch, UPCOMING_STATUSES } from '../../core/models';
import { formatLaunchTime } from '../../core/util/launch-time';
import { Countdown } from './countdown';
import { Icon } from './icon';
import { StatusBadge } from './status-badge';

@Component({
  selector: 'mw-launch-card',
  imports: [RouterLink, Countdown, Icon, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.row]': "layout() === 'row'" },
  template: `
    @let l = launch();
    <article class="card">
      <div class="art" [attr.data-category]="l.category ?? 'unknown'">
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
          <mw-icon name="rocket" [size]="layout() === 'row' ? 22 : 34" />
          <span class="visually-hidden">No mission image available</span>
        }
      </div>
      <div class="body">
        <div class="meta-top">
          <mw-status-badge [status]="l.status" />
          @if (isUpcoming() && !l.timePrecision) {
            <mw-countdown [target]="l.scheduledTime" [compact]="true" />
          }
        </div>
        <h3 class="title">
          <a [routerLink]="['/launches', l.id]" class="stretched">{{ l.missionName }}</a>
        </h3>
        <p class="sub">{{ l.provider.name }} · {{ l.rocket.name }}</p>
        <ul class="facts">
          <li>
            <mw-icon name="calendar" [size]="14" />
            <time [attr.datetime]="l.scheduledTime">{{ when() }}</time>
          </li>
          <li>
            <mw-icon name="pin" [size]="14" />{{ l.site.name }},
            {{ l.site.countryCode ?? 'Unknown country' }}
          </li>
        </ul>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      position: relative;
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition:
        border-color var(--dur) var(--ease),
        transform var(--dur) var(--ease),
        background var(--dur) var(--ease);
    }
    .card:hover {
      border-color: var(--border-strong);
      background: var(--surface-hover);
      transform: translateY(-1px);
    }
    .card:focus-within {
      border-color: var(--accent);
    }
    .art {
      position: relative;
      overflow: hidden;
      min-height: 0;
      aspect-ratio: 16 / 7;
      display: grid;
      place-items: center;
      color: rgba(255, 255, 255, 0.85);
      background:
        radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.5px),
        radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.4) 0 1px, transparent 1.5px),
        radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.3) 0 1px, transparent 1.5px),
        linear-gradient(135deg, #1c2450, #3b2d7a);
    }
    .art[data-category='communications'] {
      background-image:
        radial-gradient(circle at 75% 35%, rgba(255, 255, 255, 0.45) 0 1px, transparent 1.5px),
        linear-gradient(135deg, #142a5c, #2c4a8f);
    }
    .art[data-category='earth-observation'] {
      background-image:
        radial-gradient(circle at 80% 120%, #1f6f8b 0 40%, transparent 41%),
        linear-gradient(135deg, #12213d, #1d3a5f);
    }
    .art[data-category='science'] {
      background-image:
        radial-gradient(circle at 85% 30%, #c9c3b4 0 12%, transparent 13%),
        linear-gradient(135deg, #15172e, #2d2357);
    }
    .art[data-category='human-spaceflight'] {
      background-image: linear-gradient(135deg, #1b2347, #4a2f6b);
    }
    .art[data-category='navigation'] {
      background-image:
        radial-gradient(
          circle at 50% 50%,
          transparent 35%,
          rgba(139, 124, 246, 0.25) 36% 37%,
          transparent 38%
        ),
        linear-gradient(135deg, #131b36, #233466);
    }
    /* Absolutely positioned so a large photo never stretches the card. */
    .art img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .body {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      align-content: start;
    }
    .meta-top {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
      justify-content: space-between;
      font-size: var(--fs-sm);
    }
    .title {
      font-size: var(--fs-lg);
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
      border-radius: var(--radius);
    }
    .sub {
      color: var(--text-secondary);
      font-size: var(--fs-sm);
    }
    .facts {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 4px;
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
    .facts li {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    :host(.row) .card {
      grid-template-rows: none;
      grid-template-columns: 96px 1fr;
    }
    :host(.row) .art {
      aspect-ratio: auto;
    }
    :host(.row) .body {
      padding: var(--space-3) var(--space-4);
    }
    @media (max-width: 480px) {
      :host(.row) .card {
        grid-template-columns: 56px 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .card:hover {
        transform: none;
      }
    }
  `,
})
export class LaunchCard {
  readonly launch = input.required<Launch>();
  readonly layout = input<'grid' | 'row'>('grid');

  protected readonly imageFailed = signal(false);
  protected readonly when = computed(() =>
    formatLaunchTime(this.launch().scheduledTime, this.launch().timePrecision),
  );
  protected readonly isUpcoming = computed(() => UPCOMING_STATUSES.includes(this.launch().status));
}
