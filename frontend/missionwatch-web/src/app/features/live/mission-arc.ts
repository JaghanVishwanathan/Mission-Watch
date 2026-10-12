import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { countdownParts } from '../../core/util/time';
import { TimelineEvent } from './live.models';

// Geometry in SVG user units: a shallow arc of a large circle, apex at the top centre.
const W = 1000;
const H = 200;
const R = 900;
const CX = W / 2;
const CY = R + 40;
/** Half the arc's sweep, so its ends sit 30 units inside the viewBox. */
const HALF = Math.asin((W / 2 - 30) / R);
/** Before the first event and after the last, progress eases along the padding over this span. */
const LEAD_MS = 60 * 60_000;

type MarkerState = 'past' | 'current' | 'upcoming';

interface Marker {
  id: string;
  title: string;
  x: number;
  y: number;
  lx: number;
  ly: number;
  deg: number;
  state: MarkerState;
  confirmed: boolean;
  /** Label distance from the current event: 0 always shown, 1 shown on small screens too. */
  near: number;
}

function point(u: number, radius = R) {
  const a = -HALF + u * 2 * HALF;
  return { x: CX + radius * Math.sin(a), y: CY - radius * Math.cos(a), deg: (a * 180) / Math.PI };
}

function arcPath(from: number, to: number): string {
  const a = point(from);
  const b = point(to);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${R} ${R} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Webcast-style mission arc: events spaced evenly along a curve, progress advancing with the
 * clock between them. Passed events are bright, the next one is in the signal colour, later
 * ones are dim. Position follows time only; whether an event is confirmed is shown by a
 * filled marker and in the timeline list (SRS §4.3).
 */
@Component({
  selector: 'mw-mission-arc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="arc">
      <svg
        [attr.viewBox]="'0 0 ' + w + ' ' + h"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden="true"
      >
        <path class="track" [attr.d]="track" />
        <path class="progress" [attr.d]="progressPath()" />
        @for (m of markers(); track m.id) {
          <g [class]="'m m--' + m.state + ' near-' + m.near" [class.confirmed]="m.confirmed">
            @if (m.state === 'current') {
              <circle class="halo" [attr.cx]="m.x" [attr.cy]="m.y" r="13" />
            }
            <circle
              class="dot"
              [attr.cx]="m.x"
              [attr.cy]="m.y"
              [attr.r]="m.state === 'current' ? 7 : 5"
            />
            <text
              [attr.x]="m.lx"
              [attr.y]="m.ly"
              [attr.transform]="'rotate(' + m.deg + ' ' + m.lx + ' ' + m.ly + ')'"
            >
              {{ m.title }}
            </text>
          </g>
        }
        <circle class="now" [attr.cx]="nowPoint().x" [attr.cy]="nowPoint().y" r="4" />
      </svg>

      <div class="center">
        <p class="clock mono" role="timer" [attr.aria-label]="clockLabel()">
          <span class="sign">{{ clock().sign }}</span
          >{{ clock().text }}
        </p>
        <p class="mission">{{ missionName() }}</p>
        @if (next(); as n) {
          <p class="next">
            Next: <strong>{{ n.title }}</strong>
            @if (n.in) {
              <span class="mono">in {{ n.in }}</span>
            }
          </p>
        }
      </div>
    </div>
  `,
  styles: `
    .arc {
      position: relative;
      padding: var(--space-4) var(--space-4) var(--space-5);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background:
        linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 100% 48px,
        linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 48px 100%,
        var(--bg-elevated);
      overflow: hidden;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .track,
    .progress {
      fill: none;
      stroke-linecap: round;
    }
    .track {
      stroke: var(--border-strong);
      stroke-width: 2;
    }
    .progress {
      stroke: var(--text);
      stroke-width: 2.5;
      transition: d 1s linear;
    }
    .dot {
      fill: var(--bg-elevated);
      stroke-width: 2;
    }
    text {
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-anchor: middle;
    }
    .m--past .dot {
      stroke: var(--text);
    }
    .m--past.confirmed .dot {
      fill: var(--text);
    }
    .m--past text {
      fill: var(--text-secondary);
    }
    .m--current .dot {
      stroke: var(--signal);
      fill: var(--signal);
    }
    .m--current text {
      fill: var(--signal);
      font-size: 16px;
    }
    .halo {
      fill: none;
      stroke: var(--signal);
      stroke-width: 1.5;
      opacity: 0.5;
      transform-box: fill-box;
      transform-origin: center;
      animation: ping 1.8s ease-out infinite;
    }
    @keyframes ping {
      from {
        transform: scale(0.6);
        opacity: 0.8;
      }
      to {
        transform: scale(1.4);
        opacity: 0;
      }
    }
    .m--upcoming .dot {
      stroke: var(--text-muted);
    }
    .m--upcoming text {
      fill: var(--text-muted);
    }
    /* Far-away labels are hidden so neighbours never collide; titles stay in the list below. */
    .near-3 text {
      display: none;
    }
    .now {
      fill: var(--text);
      filter: drop-shadow(0 0 4px var(--signal));
    }

    .center {
      position: absolute;
      left: 50%;
      top: 34%;
      transform: translateX(-50%);
      display: grid;
      justify-items: center;
      gap: 2px;
      text-align: center;
      white-space: nowrap;
    }
    .clock {
      font-size: clamp(1.75rem, 4.2vw, 3.25rem);
      font-weight: 500;
      line-height: 1;
      letter-spacing: 0.02em;
    }
    .sign {
      margin-right: 0.25em;
      font-size: 0.7em;
      color: var(--text-secondary);
    }
    .mission {
      font-family: var(--font-display);
      font-size: var(--fs-sm);
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .next {
      font-size: var(--fs-xs);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);

      strong {
        color: var(--signal);
        font-weight: 600;
      }
    }

    @media (max-width: 719px) {
      .near-2 text,
      .near-1 text {
        display: none;
      }
      text {
        font-size: 28px;
      }
      .m--current text {
        font-size: 30px;
      }
      .center {
        position: static;
        transform: none;
        margin-top: var(--space-3);
        white-space: normal;
      }
    }
  `,
})
export class MissionArc {
  readonly events = input.required<TimelineEvent[]>();
  readonly t0 = input<string>();
  readonly now = input.required<number>();
  readonly missionName = input('');

  protected readonly w = W;
  protected readonly h = H;
  protected readonly track = arcPath(0, 1);

  /** Events with a known time, in order; each gets an evenly spaced slot along the arc. */
  private readonly timed = computed(() =>
    this.events()
      .filter((e) => e.plannedAt)
      .map((e) => ({ e, t: Date.parse(e.plannedAt!) }))
      .sort((a, b) => a.t - b.t),
  );
  private readonly slot = (i: number) => (i + 1) / (this.timed().length + 1);

  /** Index of the next event still ahead of the clock; length when all have passed. */
  private readonly currentIndex = computed(() => {
    const now = this.now();
    const i = this.timed().findIndex(({ t }) => t > now);
    return i === -1 ? this.timed().length : i;
  });

  /** 0..1 along the arc: linear in time between neighbouring events. */
  private readonly progress = computed(() => {
    const ev = this.timed();
    const now = this.now();
    if (!ev.length) return 0;
    const i = this.currentIndex();
    if (i === 0) {
      const lead = Math.min(1, Math.max(0, 1 - (ev[0].t - now) / LEAD_MS));
      return this.slot(0) * lead;
    }
    if (i === ev.length) {
      const tail = Math.min(1, (now - ev[i - 1].t) / LEAD_MS);
      return this.slot(i - 1) + (1 - this.slot(i - 1)) * tail;
    }
    const a = ev[i - 1];
    const b = ev[i];
    const f = (now - a.t) / Math.max(1, b.t - a.t);
    return this.slot(i - 1) + f * (this.slot(i) - this.slot(i - 1));
  });

  protected readonly progressPath = computed(() => arcPath(0, Math.max(0.0001, this.progress())));
  protected readonly nowPoint = computed(() => point(this.progress()));

  protected readonly markers = computed<Marker[]>(() => {
    const cur = this.currentIndex();
    return this.timed().map(({ e }, i) => {
      const p = point(this.slot(i));
      const l = point(this.slot(i), R + 20);
      const state: MarkerState = i < cur ? 'past' : i === cur ? 'current' : 'upcoming';
      // When everything has passed, anchor label visibility on the last event.
      const distance = Math.abs(i - Math.min(cur, this.timed().length - 1));
      return {
        id: e.id,
        title: e.title,
        x: +p.x.toFixed(1),
        y: +p.y.toFixed(1),
        lx: +l.x.toFixed(1),
        ly: +l.y.toFixed(1),
        deg: +p.deg.toFixed(2),
        state,
        confirmed: !!e.actualAt,
        near: Math.min(distance, 3),
      };
    });
  });

  protected readonly clock = computed(() => {
    const t0 = this.t0();
    if (!t0) return { sign: 'T-', text: '--:--:--' };
    const p = countdownParts(t0, this.now());
    const hms = `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
    return { sign: p.sign, text: p.days ? `${p.days}d ${hms}` : hms };
  });

  /** Minute resolution so screen readers are not flooded every second. */
  protected readonly clockLabel = computed(() => {
    const t0 = this.t0();
    if (!t0) return 'Launch time not yet known';
    const p = countdownParts(t0, Math.floor(this.now() / 60_000) * 60_000);
    const span = `${p.days} days ${p.hours} hours ${p.minutes} minutes`;
    return p.sign === 'T-' ? `Liftoff in ${span}` : `${span} since liftoff`;
  });

  protected readonly next = computed(() => {
    const item = this.timed()[this.currentIndex()];
    if (!item) return undefined;
    const p = countdownParts(item.e.plannedAt!, this.now());
    const hms = `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
    return { title: item.e.title, in: p.days ? `${p.days}d ${hms}` : hms };
  });
}
