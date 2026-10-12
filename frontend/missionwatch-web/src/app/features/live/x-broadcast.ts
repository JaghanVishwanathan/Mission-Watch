import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { StreamStatus } from './live.models';

/**
 * X's official broadcast player (SRS §5.2). This is the same studio.x.com iframe that
 * widgets.js inserts for a `twitter-broadcast` blockquote, and X allows it on any site
 * (`frame-ancestors *`). Embedding it directly avoids widgets.js keeping the player hidden
 * until a "rendered" handshake that does not always arrive. The video is never extracted.
 */
@Component({
  selector: 'mw-x-broadcast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as url) {
      <iframe
        [src]="url"
        [title]="title()"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen
        (load)="loaded()"
      ></iframe>
    }
  `,
  styles: `
    :host,
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }
  `,
})
export class XBroadcast {
  private readonly sanitizer = inject(DomSanitizer);

  readonly broadcastId = input.required<string>();
  readonly title = input('X broadcast');
  readonly status = output<StreamStatus>();

  protected readonly src = computed(() => {
    const id = this.broadcastId();
    if (!/^\w+$/.test(id)) return undefined;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://studio.x.com/embed/broadcast/${id}?dnt=true`,
    );
  });

  constructor() {
    afterNextRender(() =>
      this.status.emit({ state: 'LOADING', detail: 'Loading the broadcast player from X…' }),
    );
  }

  /** X does not expose broadcast state to embeds, so a loaded player is UNKNOWN, never LIVE. */
  protected loaded(): void {
    this.status.emit({
      state: 'UNKNOWN',
      detail: 'Official X player loaded. X does not report whether the broadcast is live.',
    });
  }
}
