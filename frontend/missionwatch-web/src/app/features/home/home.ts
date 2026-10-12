import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LAUNCH_DATA } from '../../core/data';
import { Countdown } from '../../shared/ui/countdown';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { LaunchCard } from '../../shared/ui/launch-card';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatTile } from '../../shared/ui/stat-tile';
import { StatusBadge } from '../../shared/ui/status-badge';

@Component({
  selector: 'mw-home',
  imports: [
    DatePipe,
    RouterLink,
    Countdown,
    EmptyState,
    ErrorState,
    FreshnessIndicator,
    Icon,
    LaunchCard,
    Skeleton,
    StatTile,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly data = inject(LAUNCH_DATA);

  protected readonly upcoming = rxResource({ stream: () => this.data.getUpcoming(7) });
  protected readonly recent = rxResource({ stream: () => this.data.getPrevious(4) });
  protected readonly featured = rxResource({ stream: () => this.data.getFeatured() });
  protected readonly stats = rxResource({ stream: () => this.data.getAnalytics({}) });

  /** The next launch gets the hero slot; the rest fill the list. */
  protected readonly next = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().data[0] : undefined,
  );
  protected readonly later = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().data.slice(1) : [],
  );

  protected readonly statTiles = computed(() => {
    if (!this.stats.hasValue()) return [];
    const s = this.stats.value().data;
    const success = s.outcomes.find((o) => o.status === 'success')?.count ?? 0;
    const lastYear = s.byYear.at(-1);
    const busiest = s.byProvider[0];
    return [
      {
        label: 'Launches recorded',
        value: s.total,
        hint: 'Completed orbital attempts in dataset',
        icon: 'rocket',
      },
      {
        label: `Launches in ${lastYear?.label ?? 'latest year'}`,
        value: lastYear?.count ?? 0,
        hint: 'Calendar year to date',
        icon: 'calendar',
      },
      {
        label: 'Success share',
        value: s.total ? `${((success / s.total) * 100).toFixed(1)}%` : 'n/a',
        hint: `${success} of ${s.total} launches`,
        icon: 'check-circle',
      },
      {
        label: 'Most active provider',
        value: busiest?.abbrev ?? busiest?.name ?? 'n/a',
        hint: busiest ? `${busiest.name}, ${busiest.launches} launches` : undefined,
        icon: 'layers',
      },
    ];
  });
}
