import { makeLaunch } from '../../core/testing/fixtures';
import { groupBySite } from './globe-util';

describe('groupBySite', () => {
  it('groups launches by pad, soonest site first, and skips missing coordinates', () => {
    const pad = (id: string, latitude?: number, longitude?: number) => ({
      id,
      name: `Pad ${id}`,
      location: 'Somewhere',
      latitude,
      longitude,
    });
    const { sites, withoutCoordinates } = groupBySite([
      makeLaunch({ site: pad('b', 10, 20), scheduledTime: '2026-12-05T00:00:00Z' }),
      makeLaunch({ site: pad('a', 28.5, -80.6), scheduledTime: '2026-12-03T00:00:00Z' }),
      makeLaunch({ site: pad('a', 28.5, -80.6), scheduledTime: '2026-12-01T00:00:00Z' }),
      makeLaunch({ site: pad('c') }),
      makeLaunch({ site: pad('d', 95, 0) }),
    ]);
    expect(sites.map((s) => s.id)).toEqual(['a', 'b']);
    expect(sites[0].launches.map((l) => l.scheduledTime)).toEqual([
      '2026-12-01T00:00:00Z',
      '2026-12-03T00:00:00Z',
    ]);
    expect(withoutCoordinates).toBe(2);
  });

  it('returns no sites for no launches', () => {
    expect(groupBySite([])).toEqual({ sites: [], withoutCoordinates: 0 });
  });
});
