import {
  isExactTime,
  mapCategory,
  mapLaunch,
  mapLaunchPage,
  mapStatus,
  parseDuration,
} from './ll2-mapper';
import { Ll2Launch } from './ll2-types';

/** Trimmed from a real LL2 2.3.0 detailed response. */
function raw(overrides: Partial<Ll2Launch> = {}): Ll2Launch {
  return {
    id: '97c6f5e1-299e-4652-b72d-9618ac047076',
    name: 'Falcon 9 Block 5 | Starlink Group 15-25',
    status: { id: 1, name: 'Go for Launch', abbrev: 'Go' },
    last_updated: '2026-10-12T12:57:26Z',
    net: '2026-10-13T00:11:47Z',
    net_precision: { id: 0, name: 'Second', abbrev: 'SEC' },
    window_start: '2026-10-12T23:00:00Z',
    window_end: '2026-10-13T03:00:00Z',
    image: {
      image_url: 'https://example.org/full.jpg',
      thumbnail_url: 'https://example.org/thumb.jpg',
      credit: 'SpaceX',
      license: { name: 'CC BY-NC 2.0', link: 'https://creativecommons.org/licenses/by-nc/2.0/' },
    },
    launch_service_provider: {
      id: 121,
      name: 'SpaceX',
      abbrev: 'SpX',
      type: { name: 'Commercial' },
      country: [{ alpha_2_code: 'US' }],
    },
    rocket: {
      configuration: {
        id: 164,
        name: 'Falcon 9',
        full_name: 'Falcon 9 Block 5',
        families: [{ name: 'Falcon' }],
        reusable: true,
        length: 70,
        diameter: 3.65,
        leo_capacity: 22800,
        max_stage: 2,
      },
    },
    mission: {
      name: 'Starlink Group 15-25',
      type: 'Communications',
      description: 'A batch of 27 satellites.',
      orbit: { name: 'Low Earth Orbit', celestial_body: { name: 'Earth' } },
      agencies: [{ name: 'SpaceX' }],
    },
    pad: {
      id: 16,
      name: 'Space Launch Complex 4E',
      latitude: 34.632,
      longitude: '-120.611',
      country: { alpha_2_code: 'US' },
      location: { name: 'Vandenberg SFB, CA, USA' },
    },
    timeline: [
      { type: { id: 2, abbrev: 'Liftoff', description: 'Up' }, relative_time: 'PT0S' },
      { type: { id: 1, abbrev: 'GO for Prop Load' }, relative_time: '-PT38M' },
      { type: { id: 3, abbrev: 'SECO-1' }, relative_time: 'PT8M39S' },
    ],
    updates: [
      { id: 1, comment: 'Added launch.', created_on: '2026-09-19T23:07:00Z', created_by: 'x' },
      {
        id: 2,
        comment: 'Now targeting Oct 13 at 00:11 UTC',
        created_on: '2026-10-12T00:28:00Z',
        info_url: 'https://www.spacex.com/launches/sl-15-25',
      },
    ],
    info_urls: [{ title: 'SpaceX', url: 'https://www.spacex.com/', priority: 10 }],
    vid_urls: [
      { title: 'Low priority stream', url: 'https://youtube.com/a', priority: 1 },
      { title: 'Official webcast', url: 'https://x.com/spacex', priority: 9 },
    ],
    flightclub_url: 'https://flightclub.io/result?llId=1',
    ...overrides,
  };
}

describe('LL2 mapper', () => {
  it('maps a detailed record into the normalised model', () => {
    const l = mapLaunch(raw(), 'full')!;
    expect(l.missionName).toBe('Starlink Group 15-25');
    expect(l.status).toBe('go');
    expect(l.category).toBe('communications');
    expect(l.timePrecision).toBeUndefined();
    expect(l.provider).toMatchObject({
      id: '121',
      abbrev: 'SpX',
      countryCode: 'US',
      type: 'commercial',
    });
    expect(l.rocket).toMatchObject({ name: 'Falcon 9 Block 5', family: 'Falcon' });
    expect(l.rocket.specs).toMatchObject({ heightM: 70, leoCapacityKg: 22800, reusable: true });
    expect(l.site).toMatchObject({ latitude: 34.632, longitude: -120.611, countryCode: 'US' });
    expect(l.payload).toMatchObject({ orbit: 'Low Earth Orbit', destination: 'Earth' });
    expect(l.imageCredit).toMatchObject({ credit: 'SpaceX', license: 'CC BY-NC 2.0' });
    expect(l.thumbnailUrl).toBe('https://example.org/thumb.jpg');
    expect(l.detailLevel).toBe('full');
  });

  it('orders the timeline by T-offset and marks it as sourced, not estimated', () => {
    const m = mapLaunch(raw(), 'full')!.milestones!;
    expect(m.map((x) => x.offsetSeconds)).toEqual([-2280, 0, 519]);
    expect(m.every((x) => !x.estimated)).toBe(true);
  });

  it('orders updates newest first and keeps their sources', () => {
    const u = mapLaunch(raw(), 'full')!.updates!;
    expect(u[0].comment).toContain('Oct 13');
    expect(u[0].infoUrl).toBe('https://www.spacex.com/launches/sl-15-25');
  });

  it('orders links by priority within each kind', () => {
    const links = mapLaunch(raw(), 'full')!.links!;
    expect(links.map((l) => l.kind)).toEqual(['official', 'webcast', 'webcast', 'data']);
    expect(links[1].label).toBe('Official webcast');
  });

  it('omits rocket specs for summary records', () => {
    expect(mapLaunch(raw(), 'summary')!.rocket.specs).toBeUndefined();
  });

  it('keeps coarse date precision so the UI does not invent a time', () => {
    const l = mapLaunch(raw({ net_precision: { id: 7, name: 'Month' } }), 'summary')!;
    expect(l.timePrecision).toBe('Month');
  });

  it('rejects records missing required fields instead of throwing', () => {
    expect(mapLaunch(raw({ net: 'not a date' }), 'summary')).toBeUndefined();
    expect(mapLaunch(raw({ status: null }), 'summary')).toBeUndefined();
    expect(mapLaunch(raw({ pad: null }), 'summary')).toBeUndefined();
    const page = mapLaunchPage([raw(), raw({ id: '' }), raw({ rocket: null })], 'summary');
    expect(page.launches).toHaveLength(1);
    expect(page.skipped).toBe(2);
  });

  it('tolerates missing optional sections', () => {
    const l = mapLaunch(
      raw({
        mission: null,
        image: null,
        timeline: null,
        updates: null,
        info_urls: null,
        vid_urls: null,
        flightclub_url: null,
      }),
      'full',
    )!;
    expect(l.missionName).toBe('Starlink Group 15-25');
    expect(l.description).toBeUndefined();
    expect(l.links).toBeUndefined();
    expect(l.milestones).toBeUndefined();
  });

  it('maps statuses by abbreviation, then by id', () => {
    expect(mapStatus({ id: 7, name: 'x', abbrev: 'Partial Failure' })).toBe('partial-failure');
    expect(mapStatus({ id: 9, name: 'x', abbrev: 'Deployed' })).toBe('deployed');
    expect(mapStatus({ id: 6, name: 'x', abbrev: 'Something new' })).toBe('in-flight');
    expect(mapStatus({ id: 99, name: 'x', abbrev: 'Unknown' })).toBeUndefined();
  });

  it('derives categories from mission types', () => {
    expect(mapCategory('Human Exploration')).toBe('human-spaceflight');
    expect(mapCategory('Planetary Science')).toBe('science');
    expect(mapCategory('Government/Top Secret')).toBe('government');
    expect(mapCategory('Dedicated Rideshare')).toBeUndefined();
  });

  it('parses signed ISO-8601 durations', () => {
    expect(parseDuration('-PT38M')).toBe(-2280);
    expect(parseDuration('PT2M30S')).toBe(150);
    expect(parseDuration('P1DT2H')).toBe(93600);
    expect(parseDuration('PT0S')).toBe(0);
    expect(parseDuration('nonsense')).toBeUndefined();
    expect(parseDuration(null)).toBeUndefined();
  });

  it('treats only second/minute precision as exact', () => {
    expect(isExactTime(undefined)).toBe(true);
    expect(isExactTime('Minute')).toBe(true);
    expect(isExactTime('Hour')).toBe(false);
  });
});
