import { makeLaunch } from '../testing/fixtures';
import { filterLaunches, matchesText, queryLaunches, sortLaunches } from './launch-query';

describe('launch query', () => {
  const falcon = makeLaunch({
    id: 'falcon',
    name: 'Falcon 9 | Starlink 1',
    missionName: 'Starlink 1',
    scheduledTime: '2026-03-10T10:00:00Z',
    status: 'go',
    provider: { id: 'spacex', externalId: 's', name: 'SpaceX' },
    rocket: { id: 'f9', name: 'Falcon 9', family: 'Falcon', providerId: 'spacex' },
  });
  const electron = makeLaunch({
    id: 'electron',
    name: 'Electron | Ocean Sat',
    missionName: 'Ocean Sat',
    scheduledTime: '2026-03-05T22:00:00Z',
    status: 'success',
    provider: { id: 'rl', externalId: 'r', name: 'Rocket Lab' },
    rocket: { id: 'el', name: 'Electron', providerId: 'rl' },
  });
  const ariane = makeLaunch({
    id: 'ariane',
    name: 'Ariane 6 | Galileo',
    missionName: 'Galileo',
    scheduledTime: '2026-03-20T01:00:00Z',
    status: 'tbd',
    provider: { id: 'ae', externalId: 'a', name: 'Arianespace' },
    rocket: { id: 'a6', name: 'Ariane 62', family: 'Ariane', providerId: 'ae' },
  });
  const all = [falcon, electron, ariane];

  describe('matchesText', () => {
    it('matches mission name, provider and rocket case-insensitively', () => {
      expect(matchesText(falcon, 'starlink')).toBe(true);
      expect(matchesText(falcon, 'SPACEX')).toBe(true);
      expect(matchesText(falcon, 'falcon')).toBe(true);
      expect(matchesText(falcon, 'ariane')).toBe(false);
    });

    it('treats blank text as a match', () => {
      expect(matchesText(falcon, '   ')).toBe(true);
    });

    it('tolerates missing optional fields', () => {
      const bare = makeLaunch({
        rocket: { id: 'x', name: 'X', providerId: 'p' },
        provider: { id: 'p', externalId: 'p', name: 'P' },
      });
      expect(matchesText(bare, 'family')).toBe(false);
    });
  });

  describe('filterLaunches', () => {
    it('filters by status', () => {
      expect(filterLaunches(all, { statuses: ['success'] }).map((l) => l.id)).toEqual(['electron']);
    });

    it('filters by provider', () => {
      expect(
        filterLaunches(all, { providerIds: ['ae', 'rl'] })
          .map((l) => l.id)
          .sort(),
      ).toEqual(['ariane', 'electron']);
    });

    it('applies inclusive UTC date bounds', () => {
      const ids = filterLaunches(all, { from: '2026-03-05', to: '2026-03-10' })
        .map((l) => l.id)
        .sort();
      expect(ids).toEqual(['electron', 'falcon']);
    });

    it('combines criteria', () => {
      expect(filterLaunches(all, { text: 'a', statuses: ['tbd'] }).map((l) => l.id)).toEqual([
        'ariane',
      ]);
    });

    it('returns everything for an empty query', () => {
      expect(filterLaunches(all, {})).toHaveLength(3);
    });
  });

  describe('sortLaunches', () => {
    it('sorts by time ascending by default', () => {
      expect(sortLaunches(all, {}).map((l) => l.id)).toEqual(['electron', 'falcon', 'ariane']);
    });

    it('sorts by time descending', () => {
      expect(sortLaunches(all, { sort: 'time', direction: 'desc' }).map((l) => l.id)).toEqual([
        'ariane',
        'falcon',
        'electron',
      ]);
    });

    it('sorts by name and provider', () => {
      expect(sortLaunches(all, { sort: 'name' }).map((l) => l.id)).toEqual([
        'ariane',
        'electron',
        'falcon',
      ]);
      expect(sortLaunches(all, { sort: 'provider' }).map((l) => l.provider.name)).toEqual([
        'Arianespace',
        'Rocket Lab',
        'SpaceX',
      ]);
    });

    it('does not mutate the input', () => {
      const copy = [...all];
      sortLaunches(all, { sort: 'name' });
      expect(all).toEqual(copy);
    });
  });

  it('queryLaunches filters then sorts', () => {
    expect(
      queryLaunches(all, { statuses: ['go', 'tbd'], direction: 'desc' }).map((l) => l.id),
    ).toEqual(['ariane', 'falcon']);
  });
});
