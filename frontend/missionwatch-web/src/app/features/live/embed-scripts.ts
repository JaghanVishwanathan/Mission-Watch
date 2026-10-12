import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

// Minimal typings for the parts of the official YouTube IFrame Player API and X widgets.js used here.

export interface YtPlayer {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  getPlayerState(): number;
  getDuration(): number;
  /** Undocumented but stable; `isLive` is true while the video is an ongoing broadcast. */
  getVideoData?(): { isLive?: boolean; title?: string };
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

export interface YtNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YtPlayer }) => void;
        onStateChange?: (e: { data: number; target: YtPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YtPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}

export interface XWidgets {
  /** Renders any widget blockquotes (e.g. twitter-broadcast) inside the element. */
  load(el?: HTMLElement): Promise<unknown> | void;
  createTweet(
    id: string,
    el: HTMLElement,
    options?: Record<string, string | boolean | number>,
  ): Promise<HTMLElement | undefined>;
}

interface EmbedWindow extends Window {
  YT?: YtNamespace;
  onYouTubeIframeAPIReady?: () => void;
  twttr?: { widgets?: XWidgets; ready?: (cb: (t: { widgets: XWidgets }) => void) => void };
}

const TIMEOUT_MS = 15_000;

/** Loads the official third-party embed scripts once, on demand (NFR-004, NFR-008). */
@Injectable({ providedIn: 'root' })
export class EmbedScripts {
  private readonly document = inject(DOCUMENT);
  private youtube?: Promise<YtNamespace>;
  private x?: Promise<XWidgets>;

  private get win(): EmbedWindow {
    return this.document.defaultView as EmbedWindow;
  }

  loadYoutube(): Promise<YtNamespace> {
    this.youtube ??= new Promise<YtNamespace>((resolve, reject) => {
      const w = this.win;
      if (w.YT?.Player) return resolve(w.YT);
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(w.YT!);
      };
      this.inject('https://www.youtube.com/iframe_api', reject);
    }).catch((err) => {
      this.youtube = undefined;
      throw err;
    });
    return this.youtube;
  }

  loadX(): Promise<XWidgets> {
    this.x ??= new Promise<XWidgets>((resolve, reject) => {
      const w = this.win;
      if (w.twttr?.widgets) return resolve(w.twttr.widgets);
      this.inject('https://platform.x.com/widgets.js', reject, () => {
        if (w.twttr?.ready) w.twttr.ready((t) => resolve(t.widgets));
        else reject(new Error('X widgets did not initialise'));
      });
    }).catch((err) => {
      this.x = undefined;
      throw err;
    });
    return this.x;
  }

  private inject(src: string, reject: (e: Error) => void, onload?: () => void): void {
    const script = this.document.createElement('script');
    script.src = src;
    script.async = true;
    const timer = setTimeout(() => reject(new Error(`Timed out loading ${src}`)), TIMEOUT_MS);
    script.onload = () => {
      clearTimeout(timer);
      onload?.();
    };
    // Blocked by an extension, network policy or offline.
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(`Could not load ${src}`));
    };
    this.document.head.appendChild(script);
  }
}
