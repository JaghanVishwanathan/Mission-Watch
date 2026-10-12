/**
 * Normalised domain models. These mirror the SRS §9 entities and are what every
 * feature consumes — provider-specific shapes are mapped into these by data adapters.
 * All timestamps are ISO-8601 strings in UTC.
 */

export type LaunchStatus =
  | 'go'
  | 'tbc'
  | 'tbd'
  | 'hold'
  | 'in-flight'
  | 'deployed'
  | 'success'
  | 'partial-failure'
  | 'failure';

export const UPCOMING_STATUSES: readonly LaunchStatus[] = ['go', 'tbc', 'tbd', 'hold', 'in-flight'];
export const OUTCOME_STATUSES: readonly LaunchStatus[] = ['success', 'partial-failure', 'failure'];
/** Launched, with the final outcome not yet recorded (LL2 "Payload Deployed"). */
export const PAST_STATUSES: readonly LaunchStatus[] = ['deployed', ...OUTCOME_STATUSES];

export type MissionCategory =
  | 'communications'
  | 'earth-observation'
  | 'navigation'
  | 'science'
  | 'human-spaceflight'
  | 'resupply'
  | 'technology'
  | 'government';

export interface Provider {
  id: string;
  externalId: string;
  name: string;
  abbrev?: string;
  countryCode?: string;
  type?: 'commercial' | 'government' | 'multinational';
}

export interface RocketSpecs {
  heightM?: number;
  diameterM?: number;
  leoCapacityKg?: number;
  stages?: number;
  reusable?: boolean;
}

export interface Rocket {
  id: string;
  name: string;
  family?: string;
  variant?: string;
  providerId: string;
  specs?: RocketSpecs;
}

export interface LaunchSite {
  id: string;
  name: string;
  location: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface Payload {
  name?: string;
  type?: string;
  massKg?: number;
  customer?: string;
  orbit?: string;
  destination?: string;
}

export interface MissionMilestone {
  id: string;
  name: string;
  description?: string;
  /** Seconds relative to liftoff (T+); negative for pre-launch events. */
  offsetSeconds?: number;
  /** True when timing comes from a generic profile rather than mission-specific data. */
  estimated: boolean;
  source?: string;
}

/** One observation of a launch's schedule (FR-07). */
export interface LaunchSnapshot {
  observedAt: string;
  scheduledTime: string;
  status: LaunchStatus;
  source: string;
  /** Only set when a reliable source states a reason; never inferred. */
  sourcedReason?: string;
}

/** A sourced, timestamped note about a launch (e.g. "Now targeting Oct 13"). */
export interface LaunchUpdate {
  id: string;
  comment: string;
  createdOn: string;
  infoUrl?: string;
  author?: string;
}

export interface MediaCredit {
  credit?: string;
  license?: string;
  licenseUrl?: string;
}

export interface SourceLink {
  label: string;
  url: string;
  kind: 'official' | 'webcast' | 'article' | 'data';
}

export interface Launch {
  id: string;
  externalId: string;
  name: string;
  missionName: string;
  description?: string;
  objectives?: string[];
  category?: MissionCategory;
  /** Source wording for the mission type, e.g. 'Planetary Science'. */
  missionType?: string;
  /** NET (no earlier than) time. Read together with timePrecision. */
  scheduledTime: string;
  /** Source precision label ('Second', 'Day', 'Month'…). Absent means exact. */
  timePrecision?: string;
  windowStart?: string;
  windowEnd?: string;
  status: LaunchStatus;
  provider: Provider;
  rocket: Rocket;
  site: LaunchSite;
  payload?: Payload;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageCredit?: MediaCredit;
  links?: SourceLink[];
  milestones?: MissionMilestone[];
  scheduleHistory?: LaunchSnapshot[];
  updates?: LaunchUpdate[];
  featured?: boolean;
  lastUpdated: string;
  /** Which source record shape produced this object. */
  detailLevel?: 'summary' | 'full';
}

/** Provenance that travels with every payload (SRS §5.7, §8.2). */
export interface DataMeta {
  source: string;
  lastRefresh: string;
  dataTimestamp?: string;
  warnings: string[];
  /** True while the app runs on bundled demo data instead of a live source. */
  isMock: boolean;
  /** True when a refresh failed and previously cached data is being shown instead. */
  stale?: boolean;
  sourceUrl?: string;
}

export interface DataResponse<T> {
  data: T;
  meta: DataMeta;
}
