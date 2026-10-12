import { decodeHistory, HistorySnapshot, isHistorySnapshot } from './history-snapshot';

const SNAPSHOT: HistorySnapshot = {
  schema: 1,
  source: {
    name: 'GCAT',
    author: 'J. C. McDowell',
    url: 'https://planet4589.org/space/gcat',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    updated: '2026 Oct 11',
  },
  generatedAt: '2026-10-12T00:00:00Z',
  notes: ['Orbital-class launch attempts only.'],
  columns: ['time', 'provider', 'site', 'outcome', 'vehicle'],
  providers: [
    ['SPX', 'SpaceX', 'SpaceX', 'US'],
    ['CASC', 'CASC', 'China Aerospace Science and Technology Corporation', 'CN'],
  ],
  sites: [
    ['CC', 'Canaveral', 'Cape Canaveral'],
    ['JQ', 'Jiuquan', 'Jiuquan Space Center'],
  ],
  vehicles: ['Falcon 9', 'Chang Zheng 2D'],
  launches: [
    ['1999-05-01', 1, 1, 0, 1],
    ['2025-01-02T10:00Z', 0, 0, 0, 0],
    ['2025-02-02T10:00Z', 0, 0, 2, 0],
    ['2026-03-02T10:00Z', 0, 0, 1, 0],
    ['2026-03-03T10:00Z', 9, 0, 0, 0], // invalid provider index: dropped
  ],
};

describe('history snapshot', () => {
  it('validates the schema', () => {
    expect(isHistorySnapshot(SNAPSHOT)).toBe(true);
    expect(isHistorySnapshot({ schema: 2 })).toBe(false);
    expect(isHistorySnapshot(null)).toBe(false);
  });

  it('expands dictionary-encoded rows into analytics records', () => {
    const { records } = decodeHistory(SNAPSHOT);
    expect(records).toHaveLength(4);
    expect(records[1]).toEqual({
      time: '2025-01-02T10:00Z',
      status: 'success',
      providerId: 'SPX',
      providerName: 'SpaceX',
      providerAbbrev: 'SpaceX',
      siteId: 'CC',
      siteName: 'Canaveral',
    });
    expect(records.map((r) => r.status)).toEqual([
      'success',
      'success',
      'failure',
      'partial-failure',
    ]);
  });

  it('derives filter options ordered by launch count', () => {
    const { options } = decodeHistory(SNAPSHOT);
    expect(options.firstYear).toBe(1999);
    expect(options.lastYear).toBe(2026);
    expect(options.providers[0]).toEqual({ id: 'SPX', name: 'SpaceX', launches: 3 });
    expect(options.providers[1].name).toBe(
      'CASC (China Aerospace Science and Technology Corporation)',
    );
    expect(options.notes).toEqual(SNAPSHOT.notes);
  });
});
