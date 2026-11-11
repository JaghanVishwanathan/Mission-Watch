import { makeLaunch } from '../../core/testing/fixtures';
import {
  ascentAzimuth,
  groupBySite,
  illustrativeAscent,
  pointAlong,
  storyStops,
} from './globe-util';

const CAPE = { latitude: 28.56, longitude: -80.58 };
const VANDENBERG = { latitude: 34.63, longitude: -120.61 };

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
});

describe('ascentAzimuth', () => {
  it('heads east for high and escape orbits', () => {
    for (const orbit of [
      'Geostationary Transfer Orbit',
      'Lunar',
      'Heliocentric N/A',
      'Medium Earth Orbit',
    ]) {
      expect(ascentAzimuth(orbit, CAPE.latitude)?.azimuthDeg).toBe(90);
    }
  });

  it('heads roughly south from northern pads for polar and sun-synchronous orbits', () => {
    expect(ascentAzimuth('Sun-Synchronous Orbit', VANDENBERG.latitude)).toEqual({
      kind: 'polar',
      azimuthDeg: 188,
    });
    expect(ascentAzimuth('Polar Orbit', -5)?.azimuthDeg).toBe(352);
  });

  it('uses a station-like inclination for low Earth orbit', () => {
    const az = ascentAzimuth('Low Earth Orbit', CAPE.latitude)!.azimuthDeg;
    // Launch azimuth to 51.6° from Cape Canaveral is about 45° (north-east).
    expect(az).toBeGreaterThan(40);
    expect(az).toBeLessThan(50);
  });

  it('draws nothing when the orbit is unknown', () => {
    expect(ascentAzimuth(undefined, 0)).toBeUndefined();
    expect(ascentAzimuth('Sub-Orbital', 0)).toBeUndefined();
  });
});

describe('illustrativeAscent', () => {
  it('starts on the pad, climbs and moves downrange in the launch direction', () => {
    const path = illustrativeAscent(CAPE, 'Geostationary Transfer Orbit')!;
    expect(path.illustrative).toBe(true);
    const first = path.points[0];
    const last = path.points.at(-1)!;
    expect(first.latitude).toBeCloseTo(CAPE.latitude, 5);
    expect(first.longitude).toBeCloseTo(CAPE.longitude, 5);
    expect(first.altitudeKm).toBe(0);
    expect(last.altitudeKm).toBeCloseTo(200, 5);
    expect(last.longitude).toBeGreaterThan(CAPE.longitude + 15); // eastwards
    expect(pointAlong(path, 0.5).altitudeKm).toBeGreaterThan(0);
  });

  it('returns nothing without a known orbit', () => {
    expect(illustrativeAscent(CAPE, undefined)).toBeUndefined();
  });
});

describe('storyStops', () => {
  const milestones = [
    { id: 'm3', name: 'SECO-1', offsetSeconds: 519, estimated: false },
    { id: 'm1', name: 'Prop load', offsetSeconds: -2280, estimated: false },
    { id: 'm2', name: 'Liftoff', offsetSeconds: 0, estimated: false },
    { id: 'm4', name: 'Deploy', estimated: false },
  ];

  it('orders steps by time, keeps pre-launch steps on the pad and ends the arc at the last step', () => {
    const stops = storyStops(milestones, '2026-12-01T10:00:00Z', true);
    expect(stops.map((s) => s.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(stops.map((s) => s.fraction)).toEqual([0, 0, 1, 0]);
    expect(stops[2].plannedAt).toBe('2026-12-01T10:08:39.000Z');
    expect(stops[3].plannedAt).toBeUndefined();
  });

  it('gives no clock times when the launch time is not exact', () => {
    expect(storyStops(milestones, '2026-12-01T00:00:00Z', false).every((s) => !s.plannedAt)).toBe(
      true,
    );
  });

  it('handles missions without milestones', () => {
    expect(storyStops(undefined, '2026-12-01T00:00:00Z', true)).toEqual([]);
  });
});
