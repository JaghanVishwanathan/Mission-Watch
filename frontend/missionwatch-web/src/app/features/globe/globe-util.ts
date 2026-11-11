import { Launch } from '../../core/models';

/**
 * Pure grouping for the Mission Globe (FR-04). Nothing here touches Cesium, so it is unit-tested
 * directly.
 */

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
