import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  toLaunchQuery,
} from './explorer-state';

describe('explorer state', () => {
  it('round-trips filters through query params', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      text: 'starlink',
      when: 'upcoming' as const,
      statuses: ['go' as const, 'hold' as const],
      providerId: 'spacex',
      from: '2026-01-01',
      sort: 'name' as const,
      view: 'list' as const,
    };
    const params = Object.fromEntries(
      Object.entries(filtersToParams(filters)).filter(([, v]) => v !== null),
    );
    expect(filtersFromParams(params)).toEqual(filters);
  });

  it('omits default values from the URL', () => {
    expect(Object.values(filtersToParams(DEFAULT_FILTERS)).every((v) => v === null)).toBe(true);
  });

  it('drops invalid params', () => {
    const f = filtersFromParams({
      when: 'yesterday',
      status: 'go,bogus',
      from: '01/02/2026',
      sort: 'random',
      view: 'map',
    });
    expect(f.when).toBe('all');
    expect(f.statuses).toEqual(['go']);
    expect(f.from).toBe('');
    expect(f.sort).toBe('time');
    expect(f.view).toBe('grid');
  });

  it('maps the timeframe to statuses when none are chosen', () => {
    expect(toLaunchQuery({ ...DEFAULT_FILTERS, when: 'past' }).statuses).toEqual([
      'deployed',
      'success',
      'partial-failure',
      'failure',
    ]);
    expect(toLaunchQuery(DEFAULT_FILTERS).statuses).toBeUndefined();
  });

  it('ignores chosen statuses that conflict with the timeframe', () => {
    const q = toLaunchQuery({ ...DEFAULT_FILTERS, when: 'upcoming', statuses: ['go', 'success'] });
    expect(q.statuses).toEqual(['go']);
  });

  it('counts active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...DEFAULT_FILTERS, text: 'x', providerId: 'p', statuses: ['go'] }),
    ).toBe(3);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, text: '   ' })).toBe(0);
  });
});
