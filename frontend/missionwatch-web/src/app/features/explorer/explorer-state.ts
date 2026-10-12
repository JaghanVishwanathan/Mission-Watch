import { Params } from '@angular/router';
import {
  LaunchQuery,
  LaunchSortField,
  LaunchStatus,
  OUTCOME_STATUSES,
  SortDirection,
  UPCOMING_STATUSES,
} from '../../core/models';
import { STATUS_INFO } from '../../core/util/status';

export type When = 'all' | 'upcoming' | 'past';
export type ViewMode = 'grid' | 'list';

/** Everything the explorer UI controls. Serialised to the URL so views are shareable. */
export interface ExplorerFilters {
  text: string;
  when: When;
  statuses: LaunchStatus[];
  providerId: string;
  from: string;
  to: string;
  sort: LaunchSortField;
  direction: SortDirection;
  view: ViewMode;
}

export const DEFAULT_FILTERS: ExplorerFilters = {
  text: '',
  when: 'all',
  statuses: [],
  providerId: '',
  from: '',
  to: '',
  sort: 'time',
  direction: 'asc',
  view: 'grid',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Parses untrusted query params, dropping anything invalid. */
export function filtersFromParams(params: Params): ExplorerFilters {
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : '');
  const statuses = str('status')
    .split(',')
    .filter((s): s is LaunchStatus => s in STATUS_INFO);

  return {
    text: str('q').slice(0, 100),
    when: oneOf(params['when'], ['all', 'upcoming', 'past'], 'all'),
    statuses,
    providerId: str('provider'),
    from: ISO_DATE.test(str('from')) ? str('from') : '',
    to: ISO_DATE.test(str('to')) ? str('to') : '',
    sort: oneOf(params['sort'], ['time', 'name', 'provider'], 'time'),
    direction: oneOf(params['dir'], ['asc', 'desc'], 'asc'),
    view: oneOf(params['view'], ['grid', 'list'], 'grid'),
  };
}

/** Only non-default values are written, keeping URLs short. */
export function filtersToParams(f: ExplorerFilters): Params {
  return {
    q: f.text.trim() || null,
    when: f.when !== 'all' ? f.when : null,
    status: f.statuses.length ? f.statuses.join(',') : null,
    provider: f.providerId || null,
    from: f.from || null,
    to: f.to || null,
    sort: f.sort !== 'time' ? f.sort : null,
    dir: f.direction !== 'asc' ? f.direction : null,
    view: f.view !== 'grid' ? f.view : null,
  };
}

export function statusesFor(when: When): readonly LaunchStatus[] {
  if (when === 'upcoming') return UPCOMING_STATUSES;
  if (when === 'past') return OUTCOME_STATUSES;
  return [...UPCOMING_STATUSES, ...OUTCOME_STATUSES];
}

export function toLaunchQuery(f: ExplorerFilters): LaunchQuery {
  const allowed = statusesFor(f.when);
  const chosen = f.statuses.filter((s) => allowed.includes(s));
  return {
    text: f.text.trim() || undefined,
    statuses: chosen.length ? chosen : f.when === 'all' ? undefined : [...allowed],
    providerIds: f.providerId ? [f.providerId] : undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    sort: f.sort,
    direction: f.direction,
  };
}

export function activeFilterCount(f: ExplorerFilters): number {
  return [f.text.trim(), f.when !== 'all', f.statuses.length, f.providerId, f.from, f.to].filter(
    Boolean,
  ).length;
}
