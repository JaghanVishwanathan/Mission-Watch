import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { EmbedScripts, YtNamespace, YtPlayer } from './embed-scripts';
import { StreamStatus } from './live.models';

const ERRORS: Record<number, string> = {
  2: 'The configured video ID is invalid.',
  5: 'The video cannot be played in this browser.',
  100: 'The video was removed or made private.',
  101: 'The broadcaster does not allow this video to be embedded.',
  150: 'The broadcaster does not allow this video to be embedded.',
};

/** How often live status is re-checked, so a waiting room flips to LIVE when the stream starts. */
const RECHECK_MS = 60_000;

/** Official YouTube IFrame player with native controls, started muted (SRS §5.1, §5.3). */
@Component({
  selector: 'mw-youtube-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="host"></div>`,
  styles: `
    :host,
    .host,
    :host ::ng-deep iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }
  `,
})
export class YoutubePlayer {
  private readonly scripts = inject(EmbedScripts);

  readonly videoId = input.required<string>();
  readonly title = input.required<string>();
  readonly muted = input(true);
  /** ISO time; before it, a non-live player reports SCHEDULED. */
  readonly scheduledStart = input<string>();
  readonly status = output<StreamStatus>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly player = signal<YtPlayer | undefined>(undefined);
  private yt?: YtNamespace;
  private failed = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let destroyed = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    afterNextRender(() => {
      this.status.emit({ state: 'LOADING', detail: 'Starting the YouTube player…' });
      this.scripts.loadYoutube().then(
        (yt) => {
          if (destroyed) return;
          this.yt = yt;
          new yt.Player(this.host().nativeElement, {
            host: 'https://www.youtube-nocookie.com',
            videoId: this.videoId(),
            width: '100%',
            height: '100%',
            playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0 },
            events: {
              onReady: ({ target }) => {
                if (destroyed) return target.destroy();
                target.getIframe().setAttribute('title', this.title());
                this.player.set(target);
                this.evaluate(target);
                timer = setInterval(() => this.evaluate(target), RECHECK_MS);
              },
              onStateChange: ({ target }) => this.evaluate(target),
              onError: ({ data }) => {
                this.failed = true;
                this.status.emit({
                  state: 'UNAVAILABLE',
                  detail: ERRORS[data] ?? 'The video could not be played.',
                });
              },
            },
          });
        },
        () =>
          this.status.emit({
            state: 'UNAVAILABLE',
            detail: 'The YouTube player could not be loaded. It may be blocked by your browser.',
          }),
      );
    });

    // Audio selector: only this effect touches mute state after start-up.
    effect(() => {
      const p = this.player();
      if (!p) return;
      if (this.muted()) p.mute();
      else {
        p.unMute();
        p.playVideo();
      }
    });

    destroyRef.onDestroy(() => {
      destroyed = true;
      clearInterval(timer);
      this.player()?.destroy();
    });
  }

  /** LIVE only when the player itself reports a live broadcast, never because it loaded (SRS §3.3). */
  private evaluate(p: YtPlayer): void {
    if (this.failed) return;
    const data = p.getVideoData?.();
    const start = this.scheduledStart();
    const PS = this.yt?.PlayerState;
    const state = p.getPlayerState();
    // YouTube also flags upcoming waiting rooms ("Live in 5 hours") with isLive, so LIVE needs
    // the stream to have actually started: a waiting room can never play, buffer or pause.
    const started = !!PS && (state === PS.PLAYING || state === PS.BUFFERING || state === PS.PAUSED);
    if (data?.isLive && started) {
      this.status.emit({
        state: 'LIVE',
        detail: 'YouTube reports this broadcast as live and playing.',
      });
    } else if (data?.isLive && start && Date.parse(start) > Date.now()) {
      this.status.emit({ state: 'SCHEDULED', detail: 'The broadcast has not started yet.' });
    } else if (data?.isLive) {
      // Could be a waiting room or a live stream whose autoplay the browser blocked.
      this.status.emit({
        state: 'UNKNOWN',
        detail: 'Live or upcoming broadcast that has not started playing. Press play to check.',
      });
    } else if (p.getPlayerState() === this.yt?.PlayerState.ENDED) {
      this.status.emit({ state: 'OFFLINE', detail: 'The broadcast has ended.' });
    } else if (start && Date.parse(start) > Date.now()) {
      this.status.emit({ state: 'SCHEDULED', detail: 'The broadcast has not started yet.' });
    } else if (data?.isLive === false && p.getDuration() > 0) {
      this.status.emit({ state: 'OFFLINE', detail: 'Not live. The player shows the recording.' });
    } else {
      this.status.emit({
        state: 'UNKNOWN',
        detail: 'Player ready. YouTube has not reported live status.',
      });
    }
  }
}
