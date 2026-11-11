import { Launch, MissionMilestone } from '../../core/models';

/**
 * Pure geometry and grouping for the Mission Globe (FR-04, FR-05). Nothing here touches Cesium, so
 * it is unit-tested directly. Every path produced here is illustrative: a plausible direction and
 * distance for teaching purposes, never a computed trajectory (FR-04).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** Height above the surface in kilometres. */
  altitudeKm: number;
}

export interface LaunchSiteGroup {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  /** Launches at this site, soonest first. */
  launches: Launch[];
}

export interface SiteGrouping {
  sites: LaunchSiteGroup[];
  /** Launches left off the globe because the source gave no coordinates (never guessed). */
  withoutCoordinates: number;
}

const isCoordinate = (v: number | undefined, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

/** Groups launches by pad. Sites are ordered by their next launch time. */
export function groupBySite(launches: readonly Launch[]): SiteGrouping {
  const byId = new Map<string, LaunchSiteGroup>();
  let withoutCoordinates = 0;
  for (const launch of launches) {
    const { site } = launch;
    if (!isCoordinate(site.latitude, 90) || !isCoordinate(site.longitude, 180)) {
      withoutCoordinates++;
      continue;
    }
    let group = byId.get(site.id);
    if (!group) {
      group = {
        id: site.id,
        name: site.name,
        location: site.location,
        latitude: site.latitude,
        longitude: site.longitude,
        launches: [],
      };
      byId.set(site.id, group);
    }
    group.launches.push(launch);
  }
  const time = (l: Launch) => Date.parse(l.scheduledTime);
  const sites = [...byId.values()];
  for (const s of sites) s.launches.sort((a, b) => time(a) - time(b));
  sites.sort((a, b) => time(a.launches[0]) - time(b.launches[0]));
  return { sites, withoutCoordinates };
}

// ── Illustrative ascent ────────────────────────────────────────────────────

/** Rough downrange distance and height at orbital insertion, for scale only. */
const ASCENT_DISTANCE_KM = 2200;
const INSERTION_ALTITUDE_KM = 200;
const EARTH_RADIUS_KM = 6371;
const PATH_POINTS = 48;
/** Typical crewed and space-station inclination, used when only "Low Earth Orbit" is known. */
const ISS_INCLINATION_DEG = 51.6;

export type AscentKind = 'polar' | 'eastward' | 'inclined';

export interface IllustrativePath {
  kind: AscentKind;
  /** Launch azimuth in degrees clockwise from north. */
  azimuthDeg: number;
  points: GeoPoint[];
  /** Always true: shown with an "illustrative" label, never as real data. */
  illustrative: true;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Launch azimuth for an orbit inclination from a given latitude (prograde, northern branch). */
function azimuthFor(inclinationDeg: number, latitudeDeg: number): number {
  const ratio = Math.cos(toRad(inclinationDeg)) / Math.cos(toRad(latitudeDeg));
  if (Math.abs(ratio) >= 1) return 90; // Inclination below the site latitude: head due east.
  return toDeg(Math.asin(ratio));
}

/**
 * The general direction an ascent to this orbit would take from the pad, or undefined when the
 * orbit is unknown or too unusual to illustrate honestly.
 */
export function ascentAzimuth(
  orbit: string | undefined,
  latitudeDeg: number,
): { kind: AscentKind; azimuthDeg: number } | undefined {
  const o = orbit?.toLowerCase() ?? '';
  if (!o) return undefined;
  if (/polar|sun-?synchronous|\bsso\b/.test(o)) {
    // Slightly retrograde, away from the equator's nearest pole crossing.
    return { kind: 'polar', azimuthDeg: latitudeDeg >= 0 ? 188 : 352 };
  }
  if (
    /geosynchronous|geostationary|\bgto\b|\bgeo\b|transfer|medium earth|\bmeo\b|heliocentric|lunar|moon|mars|escape|l1|l2|interplanetary/.test(
      o,
    )
  ) {
    return { kind: 'eastward', azimuthDeg: 90 };
  }
  if (/low earth|\bleo\b/.test(o)) {
    return { kind: 'inclined', azimuthDeg: azimuthFor(ISS_INCLINATION_DEG, latitudeDeg) };
  }
  return undefined;
}

/** A great-circle point at the given distance and bearing from a start point. */
function destination(
  latDeg: number,
  lonDeg: number,
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const d = distanceKm / EARTH_RADIUS_KM;
  const lat1 = toRad(latDeg);
  const lon1 = toRad(lonDeg);
  const brg = toRad(bearingDeg);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  const lon = ((toDeg(lon2) + 540) % 360) - 180;
  return [toDeg(lat2), lon];
}

/** A short, labelled ascent arc from the pad, or undefined when the orbit is not known. */
export function illustrativeAscent(
  site: { latitude: number; longitude: number },
  orbit: string | undefined,
): IllustrativePath | undefined {
  const heading = ascentAzimuth(orbit, site.latitude);
  if (!heading) return undefined;
  const points: GeoPoint[] = [];
  for (let i = 0; i <= PATH_POINTS; i++) {
    const f = i / PATH_POINTS;
    // Steep climb early, flattening towards insertion, as real ascents do.
    const [latitude, longitude] = destination(
      site.latitude,
      site.longitude,
      heading.azimuthDeg,
      ASCENT_DISTANCE_KM * f * f,
    );
    points.push({ latitude, longitude, altitudeKm: INSERTION_ALTITUDE_KM * Math.sqrt(f) });
  }
  return { ...heading, points, illustrative: true };
}

/** The point at a fraction (0 = pad, 1 = end of the arc) along a path. */
export function pointAlong(path: { points: readonly GeoPoint[] }, fraction: number): GeoPoint {
  const f = Math.min(1, Math.max(0, fraction));
  const exact = f * (path.points.length - 1);
  const i = Math.floor(exact);
  const a = path.points[i];
  const b = path.points[Math.min(i + 1, path.points.length - 1)];
  const t = exact - i;
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
    altitudeKm: a.altitudeKm + (b.altitudeKm - a.altitudeKm) * t,
  };
}

// ── Mission Story Mode ─────────────────────────────────────────────────────

/** If no milestone is after liftoff, the arc is scaled to a typical time to orbit. */
const DEFAULT_ASCENT_SECONDS = 540;

export interface StoryStop {
  id: string;
  name: string;
  description?: string;
  /** Seconds from liftoff; undefined when the source gives no time. */
  offsetSeconds?: number;
  /** Where the marker sits on the illustrative arc for this step (0 = on the pad). */
  fraction: number;
  /** Absolute time, only when the launch time is exact and the offset is known. */
  plannedAt?: string;
  estimated: boolean;
}

/**
 * Turns a mission's milestones into story steps in time order. Only the mission's own milestones
 * are used (FR-05); none are added. Pre-launch steps sit on the pad; the arc ends at the last
 * milestone after liftoff.
 */
export function storyStops(
  milestones: readonly MissionMilestone[] | undefined,
  scheduledTime: string,
  exactTime: boolean,
): StoryStop[] {
  const list = [...(milestones ?? [])].sort(
    (a, b) => (a.offsetSeconds ?? Infinity) - (b.offsetSeconds ?? Infinity),
  );
  const lastOffset = Math.max(0, ...list.map((m) => m.offsetSeconds ?? 0));
  const span = lastOffset > 0 ? lastOffset : DEFAULT_ASCENT_SECONDS;
  const t0 = Date.parse(scheduledTime);
  return list.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    offsetSeconds: m.offsetSeconds,
    fraction: m.offsetSeconds === undefined ? 0 : Math.max(0, m.offsetSeconds) / span,
    plannedAt:
      exactTime && m.offsetSeconds !== undefined && Number.isFinite(t0)
        ? new Date(t0 + m.offsetSeconds * 1000).toISOString()
        : undefined,
    estimated: m.estimated,
  }));
}
