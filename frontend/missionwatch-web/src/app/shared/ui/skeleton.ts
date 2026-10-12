import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Decorative loading placeholder. Hidden from assistive tech; pair with an aria-busy container. */
@Component({
  selector: 'mw-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.height]': 'height()', '[style.width]': 'width()' },
  template: '',
  styles: `
    :host {
      display: block;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        var(--surface-2) 0%,
        var(--surface-hover) 50%,
        var(--surface-2) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
  `,
})
export class Skeleton {
  readonly height = input('16px');
  readonly width = input('100%');
}
