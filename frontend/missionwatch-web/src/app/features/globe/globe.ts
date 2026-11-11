import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { describeError, LAUNCH_DATA, matchesText } from '../../core/data';
import { Launch } from '../../core/models';
import { formatLaunchTime } from '../../core/util/launch-time';
import { Countdown } from '../../shared/ui/countdown';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { GLOBE_RENDERER, GlobeRenderer } from './globe-renderer';
import { groupBySite } from './globe-util';

type Mode = 'upcoming' | 'recent';

const WORLD_VIEW_KM = 20_000;
const SITE_VIEW_KM = 2_500;
const LIST_LIMIT = 50;

/**
 * Mission Globe (FR-04). Launch sites come from the active launch data source; the 3D engine sits
 * behind GLOBE_RENDERER and loads only on this page. The side panel is the keyboard and
 * screen-reader way to do everything the globe does.
 */
@Component({
  selector: 'mw-globe',
  imports: [
    RouterLink,
    Countdown,
    EmptyState,
    ErrorState,
    FreshnessIndicator,
    Icon,
    PageHeader,
    Skeleton,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './globe.html',
  styleUrl: './globe.scss',
})
export class Globe {
  private readonly data = inject(LAUNCH_DATA);
  private readonly router = inject(Router);
  private readonly createRenderer = inject(GLOBE_RENDERER);

  // ── URL state (shareable views) ──
  readonly modeParam = input<string>(undefined, { alias: 'mode' });
  readonly launchParam = input<string>(undefined, { alias: 'launch' });
  readonly queryParam = input<string>(undefined, { alias: 'q' });

  protected readonly mode = computed<Mode>(() =>
    this.modeParam() === 'recent' ? 'recent' : 'upcoming',
  );
  protected readonly text = linkedSignal(() => this.queryParam() ?? '');

  // ── Data ──
  protected readonly list = rxResource({
    params: () => this.mode(),
    stream: ({ params }) =>
      params === 'recent' ? this.data.getPrevious(LIST_LIMIT) : this.data.getUpcoming(LIST_LIMIT),
  });

  /** A launch opened by link (e.g. from a mission page) may not be in the current list. */
  protected readonly detail = rxResource({
    params: () => this.launchParam(),
    stream: ({ params }) => (params ? this.data.getLaunch(params) : of(undefined)),
  });

  protected readonly listError = computed(() => {
    const err = this.list.error();
    return err ? describeError(err) : undefined;
  });

  private readonly launches = computed<Launch[]>(() =>
    this.list.hasValue() ? this.list.value().data : [],
  );
  private readonly filtered = computed(() => {
    const t = this.text().trim();
    return t ? this.launches().filter((l) => matchesText(l, t)) : this.launches();
  });
  protected readonly grouping = computed(() => groupBySite(this.filtered()));

  protected readonly selectedLaunch = computed<Launch | undefined>(() => {
    const id = this.launchParam();
    if (!id) return undefined;
    const full = this.detail.hasValue() ? this.detail.value()?.data : undefined;
    return full ?? this.launches().find((l) => l.id === id);
  });

  /** The selected site follows the selected launch, and can also be chosen on its own. */
  protected readonly selectedSiteId = linkedSignal(() => this.selectedLaunch()?.site.id);
  protected readonly selectedSite = computed(() =>
    this.grouping().sites.find((s) => s.id === this.selectedSiteId()),
  );

  // ── Globe ──
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private renderer?: GlobeRenderer;
  protected readonly globeState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly formatLaunchTime = formatLaunchTime;

  constructor() {
    afterNextRender(() => void this.startGlobe());
    inject(DestroyRef).onDestroy(() => this.renderer?.destroy());

    // Markers follow the filtered sites and the selection.
    effect(() => {
      const sites = this.grouping().sites;
      const selected = this.selectedSiteId();
      if (this.globeState() !== 'ready') return;
      this.renderer?.setMarkers(
        sites.map((s) => ({
          id: s.id,
          label: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          count: s.launches.length,
          selected: s.id === selected,
        })),
      );
    });

    // The camera follows the selected site (or the selected launch's pad).
    effect(() => {
      const site = this.selectedSite();
      const launch = this.selectedLaunch();
      if (this.globeState() !== 'ready') return;
      const target = site
        ? { latitude: site.latitude, longitude: site.longitude, heightKm: SITE_VIEW_KM }
        : launch?.site.latitude !== undefined && launch.site.longitude !== undefined
          ? {
              latitude: launch.site.latitude,
              longitude: launch.site.longitude,
              heightKm: SITE_VIEW_KM,
            }
          : { latitude: 20, longitude: -40, heightKm: WORLD_VIEW_KM };
      this.renderer?.focus(target, !this.reducedMotion);
    });
  }

  private async startGlobe(): Promise<void> {
    const el = this.canvas()?.nativeElement;
    if (!el) return;
    try {
      const renderer = await this.createRenderer();
      await renderer.init(el);
      renderer.onSelect((siteId) => this.selectSite(siteId));
      this.renderer = renderer;
      this.globeState.set('ready');
    } catch (err) {
      console.warn('Mission Globe: 3D view unavailable', err);
      this.globeState.set('unavailable');
    }
  }

  // ── Actions ──
  protected setMode(mode: Mode): void {
    this.navigate({ mode: mode === 'upcoming' ? null : mode });
  }

  protected setText(value: string): void {
    this.text.set(value);
    this.navigate({ q: value.trim() || null });
  }

  protected selectSite(siteId: string): void {
    this.selectedSiteId.set(siteId);
    const launch = this.selectedLaunch();
    if (launch && launch.site.id !== siteId) this.navigate({ launch: null });
  }

  protected selectLaunch(id: string): void {
    this.navigate({ launch: id });
  }

  protected clearSelection(): void {
    this.selectedSiteId.set(undefined);
    this.navigate({ launch: null });
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
