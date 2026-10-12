import { firstValueFrom } from 'rxjs';
import { OUTCOME_STATUSES, UPCOMING_STATUSES } from '../../models';
import { MockLaunchDataService } from './mock-launch-data.service';
import { buildSyntheticHistory } from './synthetic-history';

describe('MockLaunchDataService', () => {
  const service = new MockLaunchDataService(0);

  it('returns upcoming launches in chronological order, all in the future', async () => {
    const { data, meta } = await firstValueFrom(service.getUpcoming());
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((l) => UPCOMING_STATUSES.includes(l.status))).toBe(true);
    const times = data.map((l) => Date.parse(l.scheduledTime));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(meta.isMock).toBe(true);
  });

  it('returns previous launches newest first', async () => {
    const { data } = await firstValueFrom(service.getPrevious());
    expect(data.every((l) => OUTCOME_STATUSES.includes(l.status))).toBe(true);
    const times = data.map((l) => Date.parse(l.scheduledTime));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('respects limits', async () => {
    const { data } = await firstValueFrom(service.getUpcoming(2));
    expect(data).toHaveLength(2);
  });

  it('returns null for an unknown launch', async () => {
    const { data } = await firstValueFrom(service.getLaunch('does-not-exist'));
    expect(data).toBeNull();
  });

  it('warns when a launch has no schedule snapshots', async () => {
    const { data, meta } = await firstValueFrom(service.getLaunch('demo-vulcan-nssl'));
    expect(data?.scheduleHistory).toBeUndefined();
    expect(meta.warnings.length).toBe(1);
  });

  it('labels analytics as synthetic', async () => {
    const { data, meta } = await firstValueFrom(service.getAnalytics({}));
    expect(data.total).toBeGreaterThan(100);
    expect(meta.warnings.join(' ')).toMatch(/synthetic/i);
  });

  it('lists providers alphabetically without duplicates', async () => {
    const { data } = await firstValueFrom(service.getProviders());
    const names = data.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('generates deterministic synthetic history that never lies in the future', () => {
    const now = Date.UTC(2026, 5, 1);
    const a = buildSyntheticHistory(now);
    const b = buildSyntheticHistory(now);
    expect(a).toEqual(b);
    expect(a.every((l) => Date.parse(l.scheduledTime) < now)).toBe(true);
  });
});
