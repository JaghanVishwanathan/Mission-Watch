import { formatShift, scheduleChanges } from './schedule';
import { countdownParts, formatOffset, relativeTime } from './time';

describe('scheduleChanges', () => {
  it('returns an empty list for missing history', () => {
    expect(scheduleChanges(undefined)).toEqual([]);
    expect(scheduleChanges([])).toEqual([]);
  });

  it('orders by observation time and computes shifts', () => {
    const changes = scheduleChanges([
      {
        observedAt: '2026-01-10T00:00:00Z',
        scheduledTime: '2026-02-03T00:00:00Z',
        status: 'hold',
        source: 's',
      },
      {
        observedAt: '2026-01-01T00:00:00Z',
        scheduledTime: '2026-02-01T00:00:00Z',
        status: 'go',
        source: 's',
      },
    ]);
    expect(changes[0].isOriginal).toBe(true);
    expect(changes[0].deltaMs).toBeNull();
    expect(changes[1].isLatest).toBe(true);
    expect(changes[1].deltaMs).toBe(2 * 86_400_000);
    expect(changes[1].statusChanged).toBe(true);
  });
});

describe('formatShift', () => {
  it('formats shifts in days and hours', () => {
    expect(formatShift(null)).toBe('First observation');
    expect(formatShift(0)).toBe('No change');
    expect(formatShift(26 * 3_600_000)).toBe('+1d 2h');
    expect(formatShift(-6 * 3_600_000)).toBe('−6h');
    expect(formatShift(60_000)).toBe('+<1h');
  });
});

describe('time utilities', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');

  it('splits a countdown into parts', () => {
    expect(countdownParts('2026-01-02T01:02:03Z', now)).toEqual({
      sign: 'T-',
      days: 1,
      hours: 1,
      minutes: 2,
      seconds: 3,
    });
    expect(countdownParts('2025-12-31T23:59:00Z', now).sign).toBe('T+');
  });

  it('formats T± offsets', () => {
    expect(formatOffset(0)).toBe('T+00:00');
    expect(formatOffset(154)).toBe('T+02:34');
    expect(formatOffset(-2100)).toBe('T-35:00');
    expect(formatOffset(3600)).toBe('T+1:00:00');
  });

  it('describes relative time', () => {
    expect(relativeTime('2026-01-01T00:00:10Z', now)).toBe('just now');
    expect(relativeTime('2025-12-31T22:00:00Z', now)).toMatch(/2 hours ago/);
    expect(relativeTime('2026-01-04T00:00:00Z', now)).toMatch(/in 3 days/);
  });
});
