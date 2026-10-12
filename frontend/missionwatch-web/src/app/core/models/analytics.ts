import { LaunchStatus } from './launch';

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
