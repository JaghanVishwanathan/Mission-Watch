import {
  AnalyticsFilter,
  AnalyticsSummary,
  CountBucket,
  Launch,
  LaunchStatus,
  OUTCOME_STATUSES,
  ProviderStats,
} from '../models';

/** Below this many launches a provider's success rate is withheld (FR-06: no small-sample rankings). */
export const MIN_SAMPLE_FOR_RATE = 10;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function applyAnalyticsFilter(
  launches: readonly Launch[],
  filter: AnalyticsFilter,
): Launch[] {
  return launches.filter((launch) => {
    const year = new Date(launch.scheduledTime).getUTCFullYear();
    if (filter.fromYear !== undefined && year < filter.fromYear) return false;
    if (filter.toYear !== undefined && year > filter.toYear) return false;
    if (filter.providerIds?.length && !filter.providerIds.includes(launch.provider.id))
      return false;
    return true;
  });
}

function countBy(
  launches: readonly Launch[],
  keyOf: (l: Launch) => string,
  labelOf: (l: Launch) => string,
): CountBucket[] {
  const buckets = new Map<string, CountBucket>();
  for (const launch of launches) {
    const key = keyOf(launch);
    const bucket = buckets.get(key) ?? { key, label: labelOf(launch), count: 0 };
    bucket.count++;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

/** Aggregates completed launches only — upcoming launches have no outcome yet. */
export function computeAnalytics(launches: readonly Launch[]): AnalyticsSummary {
  const completed = launches
    .filter((l) => OUTCOME_STATUSES.includes(l.status))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const yearOf = (l: Launch) => String(new Date(l.scheduledTime).getUTCFullYear());
  const byYear = countBy(completed, yearOf, yearOf).sort((a, b) => a.key.localeCompare(b.key));

  const monthKey = (l: Launch) => l.scheduledTime.slice(0, 7);
  const monthLabel = (l: Launch) => {
    const d = new Date(l.scheduledTime);
    return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };
  const byMonth = countBy(completed, monthKey, monthLabel).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  const providers = new Map<string, ProviderStats>();
  for (const launch of completed) {
    const stats = providers.get(launch.provider.id) ?? {
      providerId: launch.provider.id,
      name: launch.provider.name,
      abbrev: launch.provider.abbrev,
      launches: 0,
      successes: 0,
      successRate: null,
    };
    stats.launches++;
    if (launch.status === 'success') stats.successes++;
    providers.set(launch.provider.id, stats);
  }
  const byProvider = [...providers.values()]
    .map((s) => ({
      ...s,
      successRate: s.launches >= MIN_SAMPLE_FOR_RATE ? s.successes / s.launches : null,
    }))
    .sort((a, b) => b.launches - a.launches);

  const bySite = countBy(
    completed,
    (l) => l.site.id,
    (l) => l.site.name,
  ).sort((a, b) => b.count - a.count);

  const outcomes = OUTCOME_STATUSES.map((status: LaunchStatus) => ({
    status,
    count: completed.filter((l) => l.status === status).length,
  }));

  return {
    total: completed.length,
    firstLaunch: completed[0]?.scheduledTime,
    lastLaunch: completed.at(-1)?.scheduledTime,
    byYear,
    byMonth,
    byProvider,
    bySite,
    outcomes,
  };
}
