import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ThemeService } from '../../core/state/theme.service';
import { Icon } from '../../shared/ui/icon';
import { StreamState } from './live.models';
import { XPost } from './x-post';

export interface ChatSource {
  id: string;
  broadcaster: string;
  /** Validated 11-character YouTube ID, if configured. */
  videoId?: string;
  state: StreamState;
  watchUrl: string;
}

export interface XDiscussion {
  postId?: string;
  postUrl?: string;
  broadcastUrl?: string;
  profileUrl: string;
}

/** YouTube's embedded live chat is not supported on mobile web (SRS §6.1). */
const MOBILE_QUERY = '(max-width: 719px), (hover: none) and (pointer: coarse)';

/**
 * Native YouTube Live Chat and the SpaceX X discussion. Sign-in, posting and moderation
 * stay on each platform; Mission Watch never proxies messages (SRS §6.3).
 */
@Component({
  selector: 'mw-community-panel',
  imports: [Icon, XPost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="tablist" aria-label="Community source" (keydown)="onKey($event)">
      @for (t of tabs(); track t.id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + t.id"
          [attr.aria-selected]="selected() === t.id"
          [attr.aria-controls]="'tabpanel-community'"
          [tabindex]="selected() === t.id ? 0 : -1"
          (click)="selected.set(t.id)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    <div
      class="panel-body"
      role="tabpanel"
      id="tabpanel-community"
      [attr.aria-labelledby]="'tab-' + selected()"
    >
      @if (chat(); as c) {
        @if (!c.videoId || c.state === 'UNAVAILABLE') {
          <div class="note">
            <mw-icon name="x-circle" [size]="24" />
            <p>
              Chat is unavailable: {{ c.broadcaster }}
              {{
                c.videoId ? 'stream cannot be played here.' : 'has no stream set for this mission.'
              }}
            </p>
            <a class="btn" [href]="c.watchUrl" target="_blank" rel="noopener noreferrer"
              >Open {{ c.broadcaster }} on YouTube <mw-icon name="external" [size]="14"
            /></a>
          </div>
        } @else if (mobile()) {
          <div class="note">
            <mw-icon name="info" [size]="24" />
            <p>YouTube does not support embedded live chat on mobile browsers.</p>
            <a class="btn" [href]="c.watchUrl" target="_blank" rel="noopener noreferrer"
              >Open {{ c.broadcaster }} chat on YouTube <mw-icon name="external" [size]="14"
            /></a>
          </div>
        } @else if (!consented()) {
          <div class="note">
            <mw-icon name="info" [size]="24" />
            <p>Allow third-party content above to load the chat.</p>
          </div>
        } @else {
          <iframe
            class="chat"
            [src]="chatSrc()"
            [title]="c.broadcaster + ' YouTube live chat'"
            loading="lazy"
          ></iframe>
          <p class="hint">
            {{
              c.state === 'OFFLINE'
                ? 'This broadcast has ended, so chat may be closed or replay-only.'
                : 'Chat appears only while the stream is live and chat is enabled. Sign in on YouTube to post.'
            }}
            <a [href]="c.watchUrl" target="_blank" rel="noopener noreferrer"
              >Open on YouTube <mw-icon name="external" [size]="12"
            /></a>
          </p>
        }
      } @else {
        @let x = xDiscussion();
        <div class="x">
          <p class="hint">
            The conversation lives on X. Replies and posting use X's own interface and account.
          </p>
          @if (x.postId && consented()) {
            <div class="x-embed">
              <mw-x-post
                [postId]="x.postId"
                [conversation]="true"
                (status)="xFailed.set($event.state === 'UNAVAILABLE')"
              />
            </div>
            @if (xFailed()) {
              <p class="hint">The post could not be embedded. Use the links below.</p>
            }
          }
          <div class="x-links">
            @if (x.postUrl) {
              <a class="btn" [href]="x.postUrl" target="_blank" rel="noopener noreferrer"
                >Join the replies on X <mw-icon name="external" [size]="14"
              /></a>
            }
            @if (x.broadcastUrl) {
              <a class="btn" [href]="x.broadcastUrl" target="_blank" rel="noopener noreferrer"
                >Open broadcast on X <mw-icon name="external" [size]="14"
              /></a>
            }
            <a
              class="btn btn--ghost"
              [href]="x.profileUrl"
              target="_blank"
              rel="noopener noreferrer"
              >SpaceX on X <mw-icon name="external" [size]="14"
            /></a>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      height: 100%;
      min-height: 0;
    }
    .tabs {
      display: flex;
      gap: var(--space-1);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
    }
    [role='tab'] {
      padding: var(--space-3) var(--space-3);
      background: none;
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      white-space: nowrap;
      font-size: var(--fs-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      color: var(--text-muted);
    }
    [role='tab'][aria-selected='true'] {
      color: var(--text);
      border-bottom-color: var(--text);
    }
    /* Column flex so the chat or the X post fills whatever height the tile has. */
    .panel-body {
      padding-top: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-height: 0;
    }
    .chat {
      flex: 1 1 auto;
      width: 100%;
      min-height: var(--chat-min-height, 420px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: transparent;
      color-scheme: normal;
    }
    .note {
      display: grid;
      justify-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius);
    }
    .hint {
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
    .hint a {
      color: inherit;
    }
    .x {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      flex: 1 1 auto;
      min-height: 0;
    }
    .x-embed {
      flex: 1 1 auto;
      min-height: 0;
      max-height: 640px;
      overflow-y: auto;
    }
    .x-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  `,
})
export class CommunityPanel {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);

  readonly chatSources = input.required<ChatSource[]>();
  readonly xDiscussion = input.required<XDiscussion>();
  readonly consented = input(false);

  protected readonly tabs = computed(() => [
    ...this.chatSources().map((s) => ({ id: s.id, label: `${s.broadcaster} chat` })),
    { id: 'x', label: 'SpaceX on X' },
  ]);
  /** Defaults to the first chat that has a stream configured. */
  protected readonly selected = linkedSignal(
    () => (this.chatSources().find((s) => s.videoId) ?? this.chatSources()[0])?.id ?? 'x',
  );
  protected readonly chat = computed(() =>
    this.chatSources().find((s) => s.id === this.selected()),
  );
  protected readonly xFailed = signal(false);

  /** embed_domain must match the page's hostname or YouTube refuses the chat. */
  protected readonly chatSrc = computed<SafeResourceUrl | undefined>(() => {
    const id = this.chat()?.videoId;
    if (!id || !/^[\w-]{11}$/.test(id)) return undefined;
    const domain = this.document.location?.hostname ?? '';
    // dark_theme=1 makes YouTube render the chat to match the dark site theme.
    const dark = this.theme.theme() === 'dark' ? '&dark_theme=1' : '';
    const url = `https://www.youtube.com/live_chat?v=${id}&embed_domain=${encodeURIComponent(domain)}${dark}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  protected readonly mobile = signal(false);

  constructor() {
    const mq = this.document.defaultView?.matchMedia?.(MOBILE_QUERY);
    if (mq) {
      this.mobile.set(mq.matches);
      const listener = (e: MediaQueryListEvent) => this.mobile.set(e.matches);
      mq.addEventListener('change', listener);
      inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', listener));
    }
  }

  /** Arrow-key navigation between tabs (WAI-ARIA tabs pattern). */
  protected onKey(event: KeyboardEvent): void {
    const ids = this.tabs().map((t) => t.id);
    const i = ids.indexOf(this.selected());
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (i + 1) % ids.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ids.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    this.selected.set(ids[next]);
    this.document.getElementById(`tab-${ids[next]}`)?.focus();
  }
}
