import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { describeError, LAUNCH_DATA } from '../../core/data';
import { DataMeta, DataResponse, Launch } from '../../core/models';
import { Countdown } from '../../shared/ui/countdown';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { CommunityPanel, ChatSource, XDiscussion } from './community-panel';
import { LIVE_MISSIONS } from './live-mission.config';
import { LiveMissionConfig, StreamStatus } from './live.models';
import {
  buildTimeline,
  Coverage,
  coverageOf,
  parseXBroadcastId,
  parseXPostId,
  parseYoutubeId,
  safeHttpsUrl,
} from './live-util';
import * as layoutOps from './live-layout';
import { LayoutMode } from './live-layout';
import { MissionTimeline } from './mission-timeline';
import { StreamCard } from './stream-card';
import { XBroadcast } from './x-broadcast';
import { XPost } from './x-post';
import { YoutubePlayer } from './youtube-player';

const CONSENT_KEY = 'mw-live-consent';
/** Launch data is re-requested this often; the shared cache decides whether it hits the network. */
const REFRESH_MS = 10 * 60_000;

interface StreamView {
  id: string;
  kind: 'youtube' | 'x';
  broadcaster: string;
  platform: 'YouTube' | 'X';
  videoId?: string;
  postId?: string;
  broadcastId?: string;
  scheduledStart?: string;
  externalUrl?: string;
  externalLabel: string;
  /** Why nothing can be embedded, when no usable link is configured. */
  missing?: string;
}

const COVERAGE_LABEL: Record<Coverage, string> = {
  live: 'Coverage live',
  scheduled: 'Coverage scheduled',
  unverified: 'Coverage status unverified',
  none: 'No coverage available',
};

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

function toView(s: LiveMissionConfig['streams'][number]): StreamView {
  if (s.platform === 'youtube') {
    const videoId = parseYoutubeId(s.video);
    return {
      id: s.id,
      kind: 'youtube',
      broadcaster: s.broadcaster,
      platform: 'YouTube',
      videoId,
      scheduledStart: s.scheduledStart,
      externalUrl: videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : safeHttpsUrl(s.channelUrl),
      externalLabel: videoId ? 'Watch on YouTube' : 'Open channel',
      missing: videoId
        ? undefined
        : s.video
          ? 'The configured YouTube link is not valid.'
          : 'No stream has been announced for this mission yet.',
    };
  }
  const postId = parseXPostId(s.postUrl);
  const broadcastId = parseXBroadcastId(s.broadcastUrl);
  return {
    id: s.id,
    kind: 'x',
    broadcaster: s.broadcaster,
    platform: 'X',
    postId,
    broadcastId,
    scheduledStart: s.scheduledStart,
    externalUrl:
      safeHttpsUrl(s.broadcastUrl) ?? safeHttpsUrl(s.postUrl) ?? safeHttpsUrl(s.profileUrl),
    externalLabel: s.broadcastUrl || s.postUrl ? 'Watch on X' : 'Open SpaceX on X',
    missing:
      postId || broadcastId
        ? undefined
        : s.broadcastUrl
          ? 'The configured X broadcast link is not valid.'
          : 'No broadcast has been set for this mission yet.',
  };
}

function initialStatus(v: StreamView, consented: boolean, now: number): StreamStatus {
  const upcoming = !!v.scheduledStart && Date.parse(v.scheduledStart) > now;
  if (!v.videoId && !v.postId && !v.broadcastId) {
    return upcoming
      ? { state: 'SCHEDULED', detail: 'Broadcast expected. The link is not published yet.' }
      : { state: 'UNAVAILABLE', detail: v.missing };
  }
  if (!consented)
    return {
      state: upcoming ? 'SCHEDULED' : 'UNKNOWN',
      detail: `Not loaded: ${v.platform} content is off.`,
    };
  return { state: 'LOADING' };
}

@Component({
  selector: 'mw-live',
  imports: [
    DatePipe,
    RouterLink,
    CommunityPanel,
    Countdown,
    FreshnessIndicator,
    Icon,
    MissionTimeline,
    Skeleton,
    StreamCard,
    XBroadcast,
    XPost,
    YoutubePlayer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live.html',
  styleUrl: './live.scss',
})
export class Live {
  private readonly data = inject(LAUNCH_DATA);
  private readonly router = inject(Router);

  /** `?mission=` query parameter. */
  readonly missionParam = input<string>(undefined, { alias: 'mission' });

  protected readonly missions = LIVE_MISSIONS;
  protected readonly mission = computed(
    () => LIVE_MISSIONS.find((m) => m.id === this.missionParam()) ?? LIVE_MISSIONS[0],
  );

  // ── Consent (NFR-008): nothing from YouTube or X loads until the viewer allows it ──
  protected readonly consented = signal(readConsent());

  protected setConsent(value: boolean): void {
    this.consented.set(value);
    try {
      if (value) localStorage.setItem(CONSENT_KEY, 'yes');
      else localStorage.removeItem(CONSENT_KEY);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }

  // ── Streams ──
  protected readonly streams = computed(() => this.mission().streams.map(toView));
  protected readonly statuses = linkedSignal<
    { views: StreamView[]; consented: boolean },
    Record<string, StreamStatus>
  >({
    source: () => ({ views: this.streams(), consented: this.consented() }),
    computation: ({ views, consented }) =>
      Object.fromEntries(views.map((v) => [v.id, initialStatus(v, consented, Date.now())])),
  });
  protected readonly coverage = computed(() =>
    coverageOf(this.streams().map((v) => this.statuses()[v.id]?.state ?? 'UNKNOWN')),
  );
  protected readonly coverageLabel = computed(() => COVERAGE_LABEL[this.coverage()]);

  protected setStatus(id: string, status: StreamStatus): void {
    this.statuses.update((all) => ({ ...all, [id]: status }));
  }

  /** Stream IDs whose audio the app can control (YouTube only; X has its own player). */
  protected readonly audioSources = computed(() =>
    this.streams().filter((v) => v.kind === 'youtube' && v.videoId),
  );
  /** 'none' keeps every controllable player muted (muted start-up, SRS §5.3). */
  protected readonly audio = linkedSignal(() => (this.mission(), 'none'));

  // ── Layout: focus (one main + two side tiles, floating chat) or 2×2 grid ──
  private readonly savedLayout = layoutOps.readLayout();
  protected readonly layout = signal<LayoutMode>(
    this.savedLayout.mode === 'grid' ? 'grid' : 'focus',
  );
  /** Stream IDs by position; position 0 is the main tile. */
  protected readonly order = linkedSignal(() =>
    layoutOps.initialOrder(
      this.streams().map((s) => s.id),
      new Set(
        this.streams()
          .filter((s) => s.videoId || s.broadcastId || s.postId)
          .map((s) => s.id),
      ),
      this.savedLayout.order,
    ),
  );
  protected readonly chatOpen = signal(!globalThis.matchMedia?.('(max-width: 719px)').matches);

  protected areaOf(id: string): string {
    return layoutOps.areaOf(this.order(), id);
  }
  protected positionOf(id: string): number {
    return this.order().indexOf(id);
  }
  protected makeMain(id: string): void {
    this.order.update((o) => layoutOps.makeMain(o, id));
  }
  protected move(id: string, delta: -1 | 1): void {
    this.order.update((o) => layoutOps.move(o, id, delta));
  }

  // ── Launch data and timeline ──
  protected readonly launch = rxResource({
    params: () => this.mission().launch,
    stream: ({ params }) => {
      if (params.ll2LaunchId) return this.data.getLaunch(params.ll2LaunchId);
      const provider = params.nextFromProvider?.trim().toLowerCase();
      if (!provider) return of(this.configOnly());
      return this.data.getUpcoming().pipe(
        switchMap((res) => {
          const next = res.data.find((l) =>
            `${l.provider.name} ${l.provider.abbrev ?? ''}`.toLowerCase().includes(provider),
          );
          return next
            ? this.data.getLaunch(next.id)
            : of<DataResponse<Launch | null>>({ data: null, meta: res.meta });
        }),
      );
    },
  });

  /** Last good response for this mission, kept while a refresh fails (SRS §4.3). */
  private readonly lastGood = linkedSignal<
    { mission: string; value?: DataResponse<Launch | null> },
    DataResponse<Launch | null> | undefined
  >({
    source: () => ({
      mission: this.mission().id,
      value: this.launch.hasValue() ? this.launch.value() : undefined,
    }),
    computation: (s, prev) =>
      s.value ?? (prev && prev.source.mission === s.mission ? prev.value : undefined),
  });

  protected readonly l = computed(() => this.lastGood()?.data ?? undefined);
  protected readonly meta = computed<DataMeta | undefined>(() => {
    const m = this.lastGood()?.meta;
    return m && this.launch.error() ? { ...m, stale: true } : m;
  });
  protected readonly loadError = computed(() => {
    const err = this.launch.error();
    return err ? describeError(err) : undefined;
  });

  protected readonly missionName = computed(
    () => this.mission().name || this.l()?.missionName || 'Next mission',
  );
  protected readonly vehicle = computed(() => this.mission().vehicle || this.l()?.rocket.name);

  /** T-0: live source first, configured fallback only when no data has loaded. */
  protected readonly t0 = computed(() => {
    const fallback = this.mission().launch.fallbackT0;
    const t =
      this.l()?.scheduledTime ??
      (fallback && !Number.isNaN(Date.parse(fallback)) ? fallback : undefined);
    return t;
  });
  protected readonly t0FromFallback = computed(() => !this.l()?.scheduledTime && !!this.t0());
  /** Inexact NETs ("Month") get no ticking countdown, which would imply false precision. */
  protected readonly exactT0 = computed(() => {
    const p = this.l()?.timePrecision?.toLowerCase();
    return !p || p === 'second' || p === 'minute';
  });

  private readonly now = signal(Date.now());
  protected readonly events = computed(() => {
    const l = this.l();
    return buildTimeline({
      missionId: this.mission().id,
      t0: this.t0(),
      launchStatus: l?.status,
      milestones: l?.milestones,
      configured: this.mission().events,
      source: this.meta()?.source ?? 'Mission Watch',
      updatedAt: this.meta()?.lastRefresh ?? new Date(this.now()).toISOString(),
      now: this.now(),
    });
  });
  /** The next event still ahead of the clock, highlighted on the arc and in the list. */
  protected readonly currentEventId = computed(
    () => this.events().find((e) => e.plannedAt && Date.parse(e.plannedAt) > this.now())?.id,
  );

  // ── Community ──
  protected readonly chatSources = computed<ChatSource[]>(() =>
    this.streams()
      .filter((v) => v.kind === 'youtube')
      .map((v) => ({
        id: v.id,
        broadcaster: v.broadcaster,
        videoId: v.videoId,
        state: this.statuses()[v.id]?.state ?? 'UNKNOWN',
        watchUrl: v.externalUrl ?? 'https://www.youtube.com',
      })),
  );
  protected readonly xDiscussion = computed<XDiscussion>(() => {
    const cfg = this.mission().streams.find((s) => s.platform === 'x');
    const postUrl = safeHttpsUrl(this.mission().xDiscussionUrl) ?? safeHttpsUrl(cfg?.postUrl);
    return {
      postId: parseXPostId(postUrl),
      postUrl,
      broadcastUrl: safeHttpsUrl(cfg?.broadcastUrl),
      profileUrl: safeHttpsUrl(cfg?.profileUrl) ?? 'https://x.com/SpaceX',
    };
  });

  constructor() {
    const tick = setInterval(() => this.now.set(Date.now()), 1000);
    const refresh = setInterval(() => this.launch.reload(), REFRESH_MS);
    effect(() => layoutOps.writeLayout({ mode: this.layout(), order: this.order() }));
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      clearInterval(refresh);
    });
  }

  protected selectMission(id: string): void {
    this.router.navigate([], { queryParams: { mission: id }, queryParamsHandling: 'merge' });
  }

  private configOnly(): DataResponse<Launch | null> {
    return {
      data: null,
      meta: {
        source: 'Mission configuration',
        lastRefresh: new Date().toISOString(),
        warnings: [],
        isMock: false,
      },
    };
  }
}
