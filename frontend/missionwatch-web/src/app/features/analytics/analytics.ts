import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, of, startWith } from 'rxjs';
import { LAUNCH_DATA, MIN_SAMPLE_FOR_RATE } from '../../core/data';
import { AnalyticsFilter } from '../../core/models';
import { ThemeService } from '../../core/state/theme.service';
import { STATUS_INFO } from '../../core/util/status';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatTile } from '../../shared/ui/stat-tile';
import { ChartPanel } from './chart-panel';
import {
  launchesPerYearOption,
  monthlyCadenceOption,
  outcomesOption,
  PALETTES,
  providerVolumeOption,
} from './chart-options';

const FIRST_YEAR = 2016;
const MONTHS_SHOWN = 24;
const TOP_PROVIDERS = 8;

@Component({
  selector: 'mw-analytics',
  imports: [
    DatePipe,
    ChartPanel,
    EmptyState,
    ErrorState,
    FreshnessIndicator,
    Icon,
    PageHeader,
    Skeleton,
    StatTile,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics {
  private readonly data = inject(LAUNCH_DATA);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  protected readonly minSample = MIN_SAMPLE_FOR_RATE;
  protected readonly years = Array.from(
    { length: new Date().getFullYear() - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  );

  protected readonly filter = signal<AnalyticsFilter>({});
  protected readonly providers = rxResource({ stream: () => this.data.getProviders() });
  protected readonly analytics = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.data.getAnalytics(params),
  });

  private readonly reducedMotion = toSignal(this.reducedMotion$(), { initialValue: false });
  private readonly palette = computed(() => PALETTES[this.theme.theme()]);
  protected readonly summary = computed(() =>
    this.analytics.hasValue() ? this.analytics.value().data : undefined,
  );

  protected readonly tiles = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const success = s.outcomes.find((o) => o.status === 'success')?.count ?? 0;
    const years = s.byYear.length || 1;
    return [
      {
        label: 'Completed launches',
        value: s.total.toLocaleString(),
        hint: 'In the selected range',
        icon: 'rocket',
      },
      {
        label: 'Average per year',
        value: Math.round(s.total / years).toLocaleString(),
        hint: `Across ${years} calendar years`,
        icon: 'calendar',
      },
      {
        label: 'Success share',
        value: s.total ? `${((success / s.total) * 100).toFixed(1)}%` : 'n/a',
        hint: `${success.toLocaleString()} of ${s.total.toLocaleString()}`,
        icon: 'check-circle',
      },
      {
        label: 'Providers',
        value: s.byProvider.length,
        hint: 'With at least one launch',
        icon: 'layers',
      },
    ];
  });

  protected readonly yearChart = computed(() => {
    const s = this.summary();
    if (!s) return undefined;
    return {
      options: launchesPerYearOption(s.byYear, this.palette(), this.reducedMotion()),
      rows: s.byYear.map((r) => ({ year: r.label, launches: r.count })),
    };
  });

  protected readonly monthChart = computed(() => {
    const s = this.summary();
    if (!s) return undefined;
    const months = s.byMonth.slice(-MONTHS_SHOWN);
    return {
      options: monthlyCadenceOption(months, this.palette(), this.reducedMotion()),
      rows: months.map((r) => ({ month: r.label, launches: r.count })),
    };
  });

  protected readonly providerChart = computed(() => {
    const s = this.summary();
    if (!s) return undefined;
    const top = s.byProvider.slice(0, TOP_PROVIDERS);
    return {
      options: providerVolumeOption(top, this.palette(), this.reducedMotion()),
      rows: s.byProvider.map((r) => ({
        provider: r.name,
        launches: r.launches,
        successes: r.successes,
        rate:
          r.successRate === null
            ? `n < ${MIN_SAMPLE_FOR_RATE}`
            : `${(r.successRate * 100).toFixed(1)}%`,
      })),
    };
  });

  protected readonly outcomeChart = computed(() => {
    const s = this.summary();
    if (!s) return undefined;
    return {
      options: outcomesOption(s.outcomes, this.palette(), this.reducedMotion()),
      rows: s.outcomes.map((o) => ({
        outcome: STATUS_INFO[o.status].label,
        launches: o.count,
        share: s.total ? `${((o.count / s.total) * 100).toFixed(1)}%` : '0%',
      })),
    };
  });

  protected readonly topSites = computed(() => this.summary()?.bySite.slice(0, 8) ?? []);

  protected setYear(key: 'fromYear' | 'toYear', value: string): void {
    this.filter.update((f) => ({ ...f, [key]: value ? Number(value) : undefined }));
  }

  protected setProvider(value: string): void {
    this.filter.update((f) => ({ ...f, providerIds: value ? [value] : undefined }));
  }

  protected reset(): void {
    this.filter.set({});
  }

  protected selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  private reducedMotion$() {
    const mq = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return of(false);
    return fromEvent<MediaQueryListEvent>(mq, 'change').pipe(
      map((e) => e.matches),
      startWith(mq.matches),
    );
  }
}
