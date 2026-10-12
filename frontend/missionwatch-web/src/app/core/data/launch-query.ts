import { Launch, LaunchQuery } from '../models';

const DAY_MS = 86_400_000;

function startOfDayUtc(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

/** Case-insensitive match against mission name, launch name, provider and rocket. */
export function matchesText(launch: Launch, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    launch.name,
    launch.missionName,
    launch.provider.name,
    launch.provider.abbrev,
    launch.rocket.name,
    launch.rocket.family,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(needle));
}

export function filterLaunches(launches: readonly Launch[], query: LaunchQuery): Launch[] {
  const from = query.from ? startOfDayUtc(query.from) : undefined;
  const toExclusive = query.to ? startOfDayUtc(query.to) + DAY_MS : undefined;

  return launches.filter((launch) => {
    if (query.text && !matchesText(launch, query.text)) return false;
    if (query.statuses?.length && !query.statuses.includes(launch.status)) return false;
    if (query.providerIds?.length && !query.providerIds.includes(launch.provider.id)) return false;

    const time = Date.parse(launch.scheduledTime);
    if (from !== undefined && time < from) return false;
    if (toExclusive !== undefined && time >= toExclusive) return false;
    return true;
  });
}

export function sortLaunches(launches: readonly Launch[], query: LaunchQuery): Launch[] {
  const field = query.sort ?? 'time';
  const sign = query.direction === 'desc' ? -1 : 1;

  const compare = (a: Launch, b: Launch): number => {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'provider':
        return (
          a.provider.name.localeCompare(b.provider.name) ||
          a.scheduledTime.localeCompare(b.scheduledTime)
        );
      default:
        return Date.parse(a.scheduledTime) - Date.parse(b.scheduledTime);
    }
  };

  return [...launches].sort((a, b) => sign * compare(a, b));
}

export function queryLaunches(launches: readonly Launch[], query: LaunchQuery): Launch[] {
  return sortLaunches(filterLaunches(launches, query), query);
}
