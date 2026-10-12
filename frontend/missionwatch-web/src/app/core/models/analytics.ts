import { LaunchStatus } from './launch';

/** The minimal per-launch shape analytics needs; any source can be mapped into it. */
export interface AnalyticsRecord {
  time: string;
  status: LaunchStatus;
  providerId: string;
  providerName: string;
  providerAbbrev?: string;
  siteId: string;
  siteName: string;
}

export interface CountBucket {
  key: string;
  label: string;
  count: number;
}

export interface ProviderStats {
  providerId: string;
  name: string;
  abbrev?: string;
  launches: number;
  successes: number;
  /** null when the sample is too small to report a rate responsibly. */
  successRate: number | null;
}

export interface AnalyticsSummary {
  total: number;
  firstLaunch?: string;
  lastLaunch?: string;
  byYear: CountBucket[];
  byMonth: CountBucket[];
  byProvider: ProviderStats[];
  bySite: CountBucket[];
  outcomes: { status: LaunchStatus; count: number }[];
}

export interface AnalyticsFilter {
  fromYear?: number;
  toYear?: number;
  providerIds?: string[];
}

/** What the analytics dataset can be filtered by. */
export interface AnalyticsOptions {
  firstYear: number;
  lastYear: number;
  /** Ordered by launch count, most active first. */
  providers: { id: string; name: string; launches: number }[];
  /** Methodology notes from the dataset, shown alongside the charts. */
  notes: string[];
}
