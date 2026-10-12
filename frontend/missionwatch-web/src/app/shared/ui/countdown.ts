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
    <span class="countdown mono" role="timer" [attr.aria-label]="label()">
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
  `,
  styles: `
    .countdown {
      display: inline-flex;
      gap: 6px;
      align-items: baseline;
      font-weight: 600;
    }
    .sign {
      color: var(--accent-strong);
    }
    small {
      color: var(--text-muted);
      font-weight: 500;
      margin-left: 1px;
    }
  `,
})
export class Countdown {
  readonly target = input.required<string>();
  /** Compact mode hides seconds. */
  readonly compact = input(false);

  private readonly now = signal(Date.now());
  protected readonly parts = computed(() => countdownParts(this.target(), this.now()));

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
