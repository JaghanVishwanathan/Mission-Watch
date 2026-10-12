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
import { EmbedScripts, XWidgets } from './embed-scripts';
import { StreamStatus } from './live.models';

/** How long to wait for widgets.js to turn a broadcast blockquote into a player. */
const RENDER_TIMEOUT_MS = 15_000;

/**
 * Official X embed via widgets.js (SRS §5.2): a live broadcast (`twitter-broadcast`) or a post.
 * The video is never extracted or rehosted. X does not expose broadcast state to embeds,
 * so a successful embed is reported as UNKNOWN.
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
    .host ::ng-deep .twitter-tweet,
    .host ::ng-deep .twitter-broadcast {
      margin: 0 auto !important;
    }
  `,
})
export class XPost {
  private readonly scripts = inject(EmbedScripts);
  private readonly theme = inject(ThemeService);

  /** Embeds this broadcast when set; otherwise the post. */
  readonly broadcastId = input<string>();
  readonly postId = input<string>();
  /** Show the reply thread (discussion panel) rather than just the post. */
  readonly conversation = input(false);
  readonly status = output<StreamStatus>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  constructor() {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));

    afterNextRender(async () => {
      const broadcast = this.broadcastId();
      this.status.emit({
        state: 'LOADING',
        detail: `Loading the ${broadcast ? 'broadcast' : 'post'} from X…`,
      });
      try {
        const widgets = await this.scripts.loadX();
        if (destroyed) return;
        const ok = broadcast
          ? await this.renderBroadcast(widgets, broadcast)
          : !!(await widgets.createTweet(this.postId() ?? '', this.host().nativeElement, {
              theme: this.theme.theme(),
              dnt: true,
              conversation: this.conversation() ? 'all' : 'none',
              align: 'center',
            }));
        if (destroyed) return;
        this.status.emit(
          ok
            ? {
                state: 'UNKNOWN',
                detail: 'Embedded from X. X does not report whether the broadcast is live.',
              }
            : {
                state: 'UNAVAILABLE',
                detail: 'X did not return this content. It may be deleted or restricted.',
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

  /** X's documented broadcast embed: a blockquote that widgets.js replaces with an iframe. */
  private renderBroadcast(widgets: XWidgets, id: string): Promise<boolean> {
    const host = this.host().nativeElement;
    const quote = host.ownerDocument.createElement('blockquote');
    quote.className = 'twitter-broadcast';
    quote.dataset['broadcastId'] = id;
    quote.dataset['theme'] = this.theme.theme();
    quote.dataset['dnt'] = 'true';
    const link = host.ownerDocument.createElement('a');
    link.href = `https://x.com/i/broadcasts/${id}`;
    link.textContent = 'Broadcast';
    quote.appendChild(link);
    host.replaceChildren(quote);

    return new Promise<boolean>((resolve) => {
      const done = (ok: boolean) => {
        observer.disconnect();
        clearTimeout(timer);
        resolve(ok);
      };
      const observer = new MutationObserver(() => {
        if (host.querySelector('iframe')) done(true);
      });
      observer.observe(host, { childList: true, subtree: true });
      const timer = setTimeout(() => done(!!host.querySelector('iframe')), RENDER_TIMEOUT_MS);
      void widgets.load(host);
    });
  }
}
