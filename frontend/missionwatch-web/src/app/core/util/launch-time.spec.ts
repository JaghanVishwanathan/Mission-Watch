import { formatLaunchTime, precisionLabel } from './launch-time';

describe('formatLaunchTime', () => {
  const iso = '2026-10-15T12:00:00Z';

  it('shows hours and minutes only for exact times', () => {
    expect(formatLaunchTime(iso, undefined, 'en-GB')).toMatch(/\d{2}:\d{2}/);
    expect(formatLaunchTime(iso, 'Day', 'en-GB')).not.toMatch(/\d{2}:\d{2}/);
  });

  it('reduces to the month for month precision', () => {
    expect(formatLaunchTime(iso, 'Month', 'en-GB')).toBe('October 2026');
  });

  it('labels hour precision as approximate', () => {
    expect(formatLaunchTime(iso, 'Hour', 'en-GB')).toContain('around');
  });

  it('flags coarse periods as "or later"', () => {
    expect(formatLaunchTime(iso, 'Quarter (Q4)', 'en-GB')).toBe(
      'October 2026 or later (Quarter (Q4))',
    );
  });

  it('only labels non-exact precisions', () => {
    expect(precisionLabel(undefined)).toBeUndefined();
    expect(precisionLabel('Second')).toBeUndefined();
    expect(precisionLabel('Month')).toBe('Time known to the month');
  });
});
