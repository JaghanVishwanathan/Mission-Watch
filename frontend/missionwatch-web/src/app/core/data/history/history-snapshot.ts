import { AnalyticsOptions, AnalyticsRecord, LaunchStatus } from '../../models';

/** Shape written by scripts/build-history.mjs (schema 1). */
export interface HistorySnapshot {
  schema: 1;
  source: {
    name: string;
    author: string;
    url: string;
    license: string;
    licenseUrl: string;
    updated: string | null;
  };
  generatedAt: string;
  notes: string[];
  columns: ['time', 'provider', 'site', 'outcome', 'vehicle'];
  /** [code, shortName, name, stateCode] */
  providers: [string, string, string, string][];
  /** [code, shortName, name] */
  sites: [string, string, string][];
  vehicles: string[];
  /** [isoTime, providerIndex, siteIndex, outcome (0 success, 1 partial, 2 failure), vehicleIndex] */
  launches: [string, number, number, 0 | 1 | 2, number][];
}

const OUTCOMES: LaunchStatus[] = ['success', 'partial-failure', 'failure'];

export interface DecodedHistory {
  records: AnalyticsRecord[];
  options: AnalyticsOptions;
}

export function isHistorySnapshot(value: unknown): value is HistorySnapshot {
  const v = value as HistorySnapshot | null;
  return (
    !!v &&
    v.schema === 1 &&
    Array.isArray(v.launches) &&
    Array.isArray(v.providers) &&
    Array.isArray(v.sites)
  );
}

/** Expands the dictionary-encoded snapshot. Rows with out-of-range references are dropped. */
export function decodeHistory(snapshot: HistorySnapshot): DecodedHistory {
  const records: AnalyticsRecord[] = [];
  const counts = new Map<number, number>();

  for (const [time, p, s, outcome] of snapshot.launches) {
    const provider = snapshot.providers[p];
    const site = snapshot.sites[s];
    const status = OUTCOMES[outcome];
    if (!provider || !site || !status || typeof time !== 'string') continue;
    records.push({
      time,
      status,
      providerId: provider[0],
      providerName: provider[2],
      providerAbbrev: provider[1],
      siteId: site[0],
      siteName: site[1],
    });
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }

  const years = records.map((r) => Number(r.time.slice(0, 4)));
  const providers = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([index, launches]) => ({
      id: snapshot.providers[index][0],
      name:
        snapshot.providers[index][1] === snapshot.providers[index][2]
          ? snapshot.providers[index][2]
          : `${snapshot.providers[index][1]} (${snapshot.providers[index][2]})`,
      launches,
    }));

  return {
    records,
    options: {
      firstYear: years.length ? Math.min(...years) : new Date().getUTCFullYear(),
      lastYear: years.length ? Math.max(...years) : new Date().getUTCFullYear(),
      providers,
      notes: snapshot.notes ?? [],
    },
  };
}
