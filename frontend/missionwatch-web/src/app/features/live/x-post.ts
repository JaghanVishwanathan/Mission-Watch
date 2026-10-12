import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ThemeService } from '../../core/state/theme.service';
import { EmbedScripts } from './embed-scripts';
import { StreamStatus } from './live.models';

/**
 * Official X post embed via widgets.js (SRS §5.2). The video is never extracted or rehosted.
 * X does not expose broadcast state to embeds, so a successful embed is reported as UNKNOWN.
 */
@Component({
  selector: 'mw-x-post',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="host"></div>`,
  styles: `
    :host {
      display: block;
    }
    .host {
      display: flex;
      justify-content: center;
    }
    .host ::ng-deep .twitter-tweet {
      margin: 0 auto !important;
    }
  `,
})
export class XPost {
  private readonly scripts = inject(EmbedScripts);
  private readonly theme = inject(ThemeService);

  readonly postId = input.required<string>();
  /** Show the reply thread (discussion panel) rather than just the post. */
  readonly conversation = input(false);
  readonly status = output<StreamStatus>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  constructor() {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));

    afterNextRender(async () => {
      this.status.emit({ state: 'LOADING', detail: 'Loading the post from X…' });
      try {
        const widgets = await this.scripts.loadX();
        if (destroyed) return;
        const el = await widgets.createTweet(this.postId(), this.host().nativeElement, {
          theme: this.theme.theme(),
          dnt: true,
          conversation: this.conversation() ? 'all' : 'none',
          align: 'center',
        });
        if (destroyed) return;
        this.status.emit(
          el
            ? {
                state: 'UNKNOWN',
                detail: 'Post embedded. X does not report whether the broadcast is live.',
              }
            : {
                state: 'UNAVAILABLE',
                detail: 'X did not return this post. It may be deleted or restricted.',
              },
        );
      } catch {
        if (!destroyed)
          this.status.emit({
            state: 'UNAVAILABLE',
            detail: 'The X embed could not be loaded. It may be blocked by your browser.',
          });
      }
    });
  }
}
