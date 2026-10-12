import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { describeError, LAUNCH_DATA } from '../../core/data';
import { formatLaunchTime } from '../../core/util/launch-time';
import { Countdown } from '../../shared/ui/countdown';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { LaunchCard } from '../../shared/ui/launch-card';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';

const percent = (part: number, whole: number) =>
  whole ? `${((part / whole) * 100).toFixed(1)}%` : 'n/a';

/**
 * The dashboard is deliberately focused: one hero for the next launch, then the
 * manifest, a single band of key figures, and recent launches.
 */
@Component({
  selector: 'mw-home',
  imports: [
    RouterLink,
    Countdown,
    EmptyState,
    ErrorState,
    FreshnessIndicator,
    Icon,
    LaunchCard,
    Skeleton,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly data = inject(LAUNCH_DATA);
  protected readonly year = new Date().getFullYear();

  protected readonly upcoming = rxResource({ stream: () => this.data.getUpcoming(7) });
  protected readonly recent = rxResource({ stream: () => this.data.getPrevious(4) });
  protected readonly thisYear = rxResource({
    stream: () => this.data.getAnalytics({ fromYear: this.year }),
  });
  protected readonly allTime = rxResource({ stream: () => this.data.getAnalytics({}) });

  protected readonly describeError = describeError;
  protected readonly heroImageFailed = signal(false);

  protected readonly next = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().data[0] : undefined,
  );
  protected readonly nextWhen = computed(() => {
    const l = this.next();
    return l ? formatLaunchTime(l.scheduledTime, l.timePrecision) : '';
  });
  protected readonly later = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().data.slice(1) : [],
  );

  protected readonly figures = computed(() => {
    if (!this.thisYear.hasValue() || !this.allTime.hasValue()) return [];
    const y = this.thisYear.value().data;
    const all = this.allTime.value().data;
    const success = y.outcomes.find((o) => o.status === 'success')?.count ?? 0;
    const busiest = y.byProvider[0];
    return [
      { value: y.total.toLocaleString(), label: `Orbital launches in ${this.year}` },
      { value: percent(success, y.total), label: `Reached orbit in ${this.year}` },
      { value: busiest?.abbrev ?? busiest?.name ?? 'n/a', label: `Most active in ${this.year}` },
      {
        value: all.total.toLocaleString(),
        label: `Orbital launches since ${all.firstLaunch?.slice(0, 4) ?? '1957'}`,
      },
    ];
  });
}
