import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A labelled value: use as <div mw-field> inside a <dl> (dl > div > dt + dd is valid HTML). Missing values render as an explicit
 * "Unavailable" marker rather than being hidden or invented (FR-03).
 */
@Component({
  selector: '[mw-field]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dt>{{ label() }}</dt>
    <dd>
      @if (present()) {
        {{ value() }}
      } @else {
        <span class="unavailable">Unavailable</span>
      }
    </dd>
  `,
  styles: `
    :host {
      display: grid;
      gap: 2px;
      min-width: 0;
      align-content: start;
    }
    dt {
      font-size: var(--fs-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .unavailable {
      color: var(--text-muted);
      font-style: italic;
    }
  `,
})
export class Field {
  readonly label = input.required<string>();
  readonly value = input<string | number | null | undefined>();
  protected readonly present = computed(() => {
    const v = this.value();
    return v !== undefined && v !== null && v !== '';
  });
}
