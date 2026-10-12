import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { countdownParts } from '../../core/util/time';

@Component({
  selector: 'mw-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = parts();
    @if (display()) {
      <div class="display" role="timer" [attr.aria-label]="label()">
        <span class="d-sign" aria-hidden="true">{{ p.sign }}</span>
        @for (unit of units(); track unit.label) {
          <span class="d-unit" aria-hidden="true">
            <span class="d-value">{{ unit.value }}</span>
            <span class="d-label">{{ unit.label }}</span>
          </span>
        }
      </div>
    } @else {
      <span class="inline" role="timer" [attr.aria-label]="label()">
        <span class="sign" aria-hidden="true">{{ p.sign }}</span>
        @if (p.days > 0) {
          <span aria-hidden="true">{{ p.days }}<small>d</small></span>
        }
        <span aria-hidden="true">{{ pad(p.hours) }}<small>h</small></span>
        <span aria-hidden="true">{{ pad(p.minutes) }}<small>m</small></span>
        @if (!compact()) {
          <span aria-hidden="true">{{ pad(p.seconds) }}<small>s</small></span>
        }
      </span>
    }
  `,
  styles: `
    .inline {
      display: inline-flex;
      gap: 5px;
      align-items: baseline;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .sign {
      color: var(--signal);
    }
    small {
      color: var(--text-muted);
      margin-left: 1px;
    }

    .display {
      display: flex;
      align-items: flex-start;
      gap: clamp(12px, 2.4vw, 32px);
      font-variant-numeric: tabular-nums;
    }
    .d-sign {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 3.2vw, 2.5rem);
      font-weight: 500;
      line-height: 1;
      color: var(--signal);
      padding-top: 0.35em;
    }
    .d-unit {
      display: grid;
      justify-items: start;
      gap: 6px;
    }
    .d-value {
      font-family: var(--font-sans);
      font-size: clamp(2.75rem, 7vw, 5.5rem);
      font-weight: 300;
      line-height: 1;
      letter-spacing: 0.02em;
    }
    .d-label {
      font-size: var(--fs-xs);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      color: rgba(255, 255, 255, 0.6);
    }
  `,
})
export class Countdown {
  readonly target = input.required<string>();
  /** Compact mode hides seconds. */
  readonly compact = input(false);
  /** Large segmented layout for hero use. */
  readonly display = input(false);

  private readonly now = signal(Date.now());
  protected readonly parts = computed(() => countdownParts(this.target(), this.now()));
  protected readonly units = computed(() => {
    const p = this.parts();
    return [
      { label: 'Days', value: this.pad(p.days) },
      { label: 'Hrs', value: this.pad(p.hours) },
      { label: 'Min', value: this.pad(p.minutes) },
      { label: 'Sec', value: this.pad(p.seconds) },
    ];
  });

  /** Minute-resolution label so screen readers are not flooded by every tick. */
  protected readonly label = computed(() => {
    const p = this.parts();
    const span = `${p.days} days ${p.hours} hours ${p.minutes} minutes`;
    return p.sign === 'T-' ? `Launches in ${span}` : `Launched ${span} ago`;
  });

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
