import {
  AnalyticsFilter,
  AnalyticsRecord,
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

export function launchToRecord(launch: Launch): AnalyticsRecord {
  return {
    time: launch.scheduledTime,
    status: launch.status,
    providerId: launch.provider.id,
    providerName: launch.provider.name,
    providerAbbrev: launch.provider.abbrev,
    siteId: launch.site.id,
    siteName: launch.site.name,
  };
}

/** Years are read from the leading "yyyy" so date-only and full timestamps behave alike. */
function yearOf(time: string): number {
  return Number(time.slice(0, 4));
}

export function applyAnalyticsFilter(
  records: readonly AnalyticsRecord[],
  filter: AnalyticsFilter,
): AnalyticsRecord[] {
  return records.filter((r) => {
    const year = yearOf(r.time);
    if (filter.fromYear !== undefined && year < filter.fromYear) return false;
    if (filter.toYear !== undefined && year > filter.toYear) return false;
    if (filter.providerIds?.length && !filter.providerIds.includes(r.providerId)) return false;
    return true;
  });
}

function countBy(
  records: readonly AnalyticsRecord[],
  keyOf: (r: AnalyticsRecord) => string,
  labelOf: (r: AnalyticsRecord) => string,
): CountBucket[] {
  const buckets = new Map<string, CountBucket>();
  for (const record of records) {
    const key = keyOf(record);
    const bucket = buckets.get(key) ?? { key, label: labelOf(record), count: 0 };
    bucket.count++;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

/** Aggregates completed launches only — upcoming launches have no outcome yet. */
export function computeAnalytics(records: readonly AnalyticsRecord[]): AnalyticsSummary {
  const completed = records
    .filter((r) => OUTCOME_STATUSES.includes(r.status))
    .sort((a, b) => a.time.localeCompare(b.time));

  const year = (r: AnalyticsRecord) => r.time.slice(0, 4);
  const byYear = countBy(completed, year, year).sort((a, b) => a.key.localeCompare(b.key));

  const monthKey = (r: AnalyticsRecord) => r.time.slice(0, 7);
  const monthLabel = (r: AnalyticsRecord) =>
    `${MONTH_LABELS[Number(r.time.slice(5, 7)) - 1]} ${r.time.slice(0, 4)}`;
  const byMonth = countBy(completed, monthKey, monthLabel).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  const providers = new Map<string, ProviderStats>();
  for (const record of completed) {
    const stats = providers.get(record.providerId) ?? {
      providerId: record.providerId,
      name: record.providerName,
      abbrev: record.providerAbbrev,
      launches: 0,
      successes: 0,
      successRate: null,
    };
    stats.launches++;
    if (record.status === 'success') stats.successes++;
    providers.set(record.providerId, stats);
  }
  const byProvider = [...providers.values()]
    .map((s) => ({
      ...s,
      successRate: s.launches >= MIN_SAMPLE_FOR_RATE ? s.successes / s.launches : null,
    }))
    .sort((a, b) => b.launches - a.launches);

  const bySite = countBy(
    completed,
    (r) => r.siteId,
    (r) => r.siteName,
  ).sort((a, b) => b.count - a.count);

  const outcomes = OUTCOME_STATUSES.map((status: LaunchStatus) => ({
    status,
    count: completed.filter((r) => r.status === status).length,
  }));

  return {
    total: completed.length,
    firstLaunch: completed[0]?.time,
    lastLaunch: completed.at(-1)?.time,
    byYear,
    byMonth,
    byProvider,
    bySite,
    outcomes,
  };
}
