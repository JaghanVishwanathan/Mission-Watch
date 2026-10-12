import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { describeError, LAUNCH_DATA } from '../../core/data';
import { LL2_LIST_LIMIT } from '../../core/config';
import {
  DataResponse,
  Launch,
  LaunchSortField,
  LaunchStatus,
  SortDirection,
} from '../../core/models';
import { STATUS_INFO } from '../../core/util/status';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FreshnessIndicator } from '../../shared/ui/freshness-indicator';
import { Icon } from '../../shared/ui/icon';
import { LaunchCard } from '../../shared/ui/launch-card';
import { PageHeader } from '../../shared/ui/page-header';
import { Skeleton } from '../../shared/ui/skeleton';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ExplorerFilters,
  filtersFromParams,
  filtersToParams,
  statusesFor,
  toLaunchQuery,
  ViewMode,
  When,
} from './explorer-state';

interface SortOption {
  value: string;
  label: string;
  sort: LaunchSortField;
  direction: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'time-asc', label: 'Launch time (earliest first)', sort: 'time', direction: 'asc' },
  { value: 'time-desc', label: 'Launch time (latest first)', sort: 'time', direction: 'desc' },
  { value: 'name-asc', label: 'Name (A–Z)', sort: 'name', direction: 'asc' },
  { value: 'provider-asc', label: 'Provider (A–Z)', sort: 'provider', direction: 'asc' },
];

@Component({
  selector: 'mw-explorer',
  imports: [EmptyState, ErrorState, FreshnessIndicator, Icon, LaunchCard, PageHeader, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './explorer.html',
  styleUrl: './explorer.scss',
})
export class Explorer {
  private readonly data = inject(LAUNCH_DATA);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly params = toSignal(this.route.queryParams, { initialValue: {} });

  /** Single source of truth; re-derived when the URL changes (back/forward), locally writable. */
  protected readonly filters = linkedSignal<ExplorerFilters>(() =>
    filtersFromParams(this.params()),
  );

  /** Raw text box value; search runs on a debounced copy so typing doesn't spam requests. */
  protected readonly textInput = linkedSignal(() => this.filters().text);
  private readonly debouncedText = toSignal(
    toObservable(this.textInput).pipe(debounceTime(250), distinctUntilChanged()),
    {
      initialValue: untracked(this.textInput),
    },
  );

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly describeError = describeError;
  protected readonly subtitle = `Search and filter the next ${LL2_LIST_LIMIT} scheduled launches and the ${LL2_LIST_LIMIT} most recent ones by mission, provider, rocket, status and date. Full launch history is on the Analytics page.`;
  protected readonly statusOptions = computed(() =>
    statusesFor(this.filters().when).map((s) => ({ value: s, label: STATUS_INFO[s].label })),
  );
  protected readonly sortValue = computed(
    () => `${this.filters().sort}-${this.filters().direction}`,
  );
  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  protected readonly providers = rxResource({ stream: () => this.data.getProviders() });
  protected readonly results = rxResource({
    params: () => toLaunchQuery(this.filters()),
    // switchMap semantics: a new query cancels the in-flight one (NFR-01).
    stream: ({ params }) => this.data.search(params),
  });

  /** Keeps the previous results on screen (dimmed) while a new query loads, instead of flashing skeletons. */
  protected readonly shown = linkedSignal<
    DataResponse<Launch[]> | undefined,
    DataResponse<Launch[]> | undefined
  >({
    source: () => (this.results.hasValue() ? this.results.value() : undefined),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly filtersOpen = signal(false);

  constructor() {
    effect(() => {
      const text = this.debouncedText();
      untracked(() => {
        if (text !== this.filters().text) this.update({ text });
      });
    });
  }

  protected update(patch: Partial<ExplorerFilters>): void {
    const next = { ...this.filters(), ...patch };
    this.filters.set(next);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(next),
      replaceUrl: true,
    });
  }

  protected setWhen(when: When): void {
    const allowed = statusesFor(when);
    this.update({ when, statuses: this.filters().statuses.filter((s) => allowed.includes(s)) });
  }

  protected toggleStatus(status: LaunchStatus): void {
    const current = this.filters().statuses;
    this.update({
      statuses: current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status],
    });
  }

  protected setSort(value: string): void {
    const option = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
    this.update({ sort: option.sort, direction: option.direction });
  }

  protected setView(view: ViewMode): void {
    this.update({ view });
  }

  protected reset(): void {
    this.textInput.set('');
    this.update({ ...DEFAULT_FILTERS, view: this.filters().view });
  }

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
