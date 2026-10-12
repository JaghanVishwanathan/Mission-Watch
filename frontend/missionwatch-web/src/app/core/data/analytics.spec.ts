import { LaunchStatus } from '../models';
import { makeLaunch } from '../testing/fixtures';
import { applyAnalyticsFilter, computeAnalytics, MIN_SAMPLE_FOR_RATE } from './analytics';

describe('analytics', () => {
  const at = (iso: string, status: LaunchStatus, providerId = 'a') =>
    makeLaunch({
      scheduledTime: iso,
      status,
      provider: { id: providerId, externalId: providerId, name: `Provider ${providerId}` },
    });

  it('ignores launches without an outcome', () => {
    const summary = computeAnalytics([
      at('2024-01-01T00:00:00Z', 'success'),
      at('2030-01-01T00:00:00Z', 'go'),
    ]);
    expect(summary.total).toBe(1);
  });

  it('counts by year and month in chronological order', () => {
    const summary = computeAnalytics([
      at('2025-02-01T00:00:00Z', 'success'),
      at('2024-06-15T00:00:00Z', 'success'),
      at('2024-06-20T00:00:00Z', 'failure'),
    ]);
    expect(summary.byYear.map((b) => [b.key, b.count])).toEqual([
      ['2024', 2],
      ['2025', 1],
    ]);
    expect(summary.byMonth.map((b) => [b.key, b.count])).toEqual([
      ['2024-06', 2],
      ['2025-02', 1],
    ]);
    expect(summary.byMonth[0].label).toBe('Jun 2024');
    expect(summary.firstLaunch).toBe('2024-06-15T00:00:00Z');
    expect(summary.lastLaunch).toBe('2025-02-01T00:00:00Z');
  });

  it('reports every outcome bucket, including zero counts', () => {
    const summary = computeAnalytics([at('2024-01-01T00:00:00Z', 'success')]);
    expect(summary.outcomes).toEqual([
      { status: 'success', count: 1 },
      { status: 'partial-failure', count: 0 },
      { status: 'failure', count: 0 },
    ]);
  });

  it('withholds success rates below the minimum sample size', () => {
    const big = Array.from({ length: MIN_SAMPLE_FOR_RATE }, (_, i) =>
      at(
        `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        i === 0 ? 'failure' : 'success',
        'big',
      ),
    );
    const small = [at('2024-02-01T00:00:00Z', 'success', 'small')];
    const summary = computeAnalytics([...big, ...small]);

    const bigStats = summary.byProvider.find((p) => p.providerId === 'big')!;
    const smallStats = summary.byProvider.find((p) => p.providerId === 'small')!;
    expect(bigStats.successRate).toBeCloseTo(0.9);
    expect(smallStats.successRate).toBeNull();
    expect(summary.byProvider[0].providerId).toBe('big');
  });

  it('handles an empty dataset', () => {
    const summary = computeAnalytics([]);
    expect(summary.total).toBe(0);
    expect(summary.firstLaunch).toBeUndefined();
    expect(summary.byYear).toEqual([]);
  });

  it('filters by year range and provider', () => {
    const launches = [
      at('2020-05-01T00:00:00Z', 'success', 'a'),
      at('2022-05-01T00:00:00Z', 'success', 'b'),
      at('2024-05-01T00:00:00Z', 'success', 'a'),
    ];
    expect(applyAnalyticsFilter(launches, { fromYear: 2021 })).toHaveLength(2);
    expect(applyAnalyticsFilter(launches, { toYear: 2022, providerIds: ['a'] })).toHaveLength(1);
  });
});
