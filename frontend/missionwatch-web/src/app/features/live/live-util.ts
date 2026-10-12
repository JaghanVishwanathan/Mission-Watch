import { LaunchStatus, MissionMilestone } from '../../core/models';
import { ConfiguredEvent, StreamState, TimelineEvent, TimelineEventStatus } from './live.models';

const YT_ID = /^[\w-]{11}$/;

/** Pasted embed code (<iframe src=…>, <blockquote><a href=…>) reduced to its first URL. */
export function extractUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || !v.includes('<')) return v;
  return v.match(/(?:src|href)="([^"]+)"/)?.[1];
}

/** Accepts a bare video ID, a watch, youtu.be, /live/, /embed/ or /shorts/ URL, or YouTube's embed code. */
export function parseYoutubeId(value: string | undefined): string | undefined {
  const v = extractUrl(value);
  if (!v) return undefined;
  if (YT_ID.test(v)) return v;
  try {
    const url = new URL(v);
    if (!/(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/.test(url.hostname)) return undefined;
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && YT_ID.test(fromQuery)) return fromQuery;
    const last = url.pathname.split('/').filter(Boolean).at(-1);
    return last && YT_ID.test(last) ? last : undefined;
  } catch {
    return undefined;
  }
}

/** The numeric post ID from an x.com or twitter.com status URL. */
export function parseXPostId(value: string | undefined): string | undefined {
  const v = extractUrl(value);
  if (!v) return undefined;
  try {
    const url = new URL(v);
    if (!/(^|\.)(x|twitter)\.com$/.test(url.hostname)) return undefined;
    return url.pathname.match(/\/status(?:es)?\/(\d+)/)?.[1];
  } catch {
    return undefined;
  }
}

/** The broadcast ID from an x.com/i/broadcasts/… URL or X's twitter-broadcast embed code. */
export function parseXBroadcastId(value: string | undefined): string | undefined {
  const fromAttr = value?.match(/data-broadcast-id="(\w+)"/)?.[1];
  if (fromAttr) return fromAttr;
  const v = extractUrl(value);
  if (!v) return undefined;
  try {
    const url = new URL(v);
    if (!/(^|\.)(x|twitter)\.com$/.test(url.hostname)) return undefined;
    return url.pathname.match(/^\/i\/broadcasts\/(\w+)/)?.[1];
  } catch {
    return undefined;
  }
}

/** Only absolute https links from config are rendered as hrefs. */
export function safeHttpsUrl(value: string | undefined): string | undefined {
  const v = extractUrl(value);
  if (!v) return undefined;
  try {
    return new URL(v).protocol === 'https:' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Planned events within this window before their time are flagged as imminent. */
export const IMMINENT_MS = 10 * 60_000;

/** LL2 statuses that confirm the vehicle has left the pad. */
const LIFTED_OFF: readonly LaunchStatus[] = [
  'in-flight',
  'deployed',
  'success',
  'partial-failure',
  'failure',
];

export interface TimelineInput {
  missionId: string;
  /** Current T-0, or undefined when no time is known. */
  t0?: string;
  launchStatus?: LaunchStatus;
  milestones?: MissionMilestone[];
  configured?: ConfiguredEvent[];
  source: string;
  updatedAt: string;
  now: number;
}

/**
 * Builds the mission timeline (SRS §4). Rules:
 * - an event is `completed` only with a confirmed `actualAt`, never because its time passed;
 * - planned times derive from T-0 + offset, so a schedule change moves every event;
 * - liftoff is confirmed only when the launch data source reports the vehicle has flown.
 */
export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const { missionId, t0, now, updatedAt } = input;
  const t0Ms = t0 ? Date.parse(t0) : NaN;
  const at = (offset?: number) =>
    offset === undefined || Number.isNaN(t0Ms)
      ? null
      : new Date(t0Ms + offset * 1000).toISOString();

  const configured = input.configured?.filter((e) => e.title) ?? [];
  const lifted = !!input.launchStatus && LIFTED_OFF.includes(input.launchStatus);
  const held = input.launchStatus === 'hold';

  let events: TimelineEvent[];
  if (configured.length) {
    events = configured.map((e) => {
      const plannedAt = e.plannedAt ?? at(e.offsetSeconds);
      return {
        id: e.id,
        missionId,
        title: e.title,
        plannedAt,
        actualAt: e.actualAt ?? null,
        status: e.actualAt ? 'completed' : (e.status ?? timeStatus(plannedAt, now)),
        source: 'Mission Watch (manual)',
        updatedAt,
        offsetSeconds: e.offsetSeconds,
      };
    });
  } else {
    const milestones = [...(input.milestones ?? [])];
    if (!milestones.some((m) => m.offsetSeconds === 0)) {
      milestones.push({
        id: `${missionId}-liftoff`,
        name: 'Liftoff',
        offsetSeconds: 0,
        estimated: false,
      });
    }
    events = milestones.map((m) => {
      const plannedAt = at(m.offsetSeconds);
      const isLiftoff = m.offsetSeconds === 0;
      // Only liftoff is confirmed by launch status; later milestones need their own source.
      const actualAt = isLiftoff && lifted ? plannedAt : null;
      let status: TimelineEventStatus;
      if (actualAt) status = 'completed';
      else if (held && (m.offsetSeconds ?? 0) >= 0) status = 'delayed';
      else status = timeStatus(plannedAt, now);
      return {
        id: m.id,
        missionId,
        title: m.name,
        description: m.description,
        plannedAt,
        actualAt,
        status,
        source: m.source ?? input.source,
        updatedAt,
        offsetSeconds: m.offsetSeconds,
      };
    });
  }

  return events.sort(
    (a, b) =>
      (a.plannedAt ? Date.parse(a.plannedAt) : Infinity) -
      (b.plannedAt ? Date.parse(b.plannedAt) : Infinity),
  );
}

/** Status from time alone: past-due events are "unknown" until confirmed, not completed. */
function timeStatus(plannedAt: string | null, now: number): TimelineEventStatus {
  if (!plannedAt) return 'unknown';
  const diff = Date.parse(plannedAt) - now;
  if (diff < 0) return 'unknown';
  return diff <= IMMINENT_MS ? 'imminent' : 'planned';
}

export const EVENT_STATUS_LABEL: Record<TimelineEventStatus, string> = {
  planned: 'Planned',
  imminent: 'Imminent',
  completed: 'Confirmed',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  unknown: 'Awaiting confirmation',
};

export type Coverage = 'live' | 'scheduled' | 'unverified' | 'none';

/** Overall coverage for the header, from the individual stream states. */
export function coverageOf(states: StreamState[]): Coverage {
  if (states.includes('LIVE')) return 'live';
  if (states.includes('SCHEDULED')) return 'scheduled';
  if (states.length && states.every((s) => s === 'UNAVAILABLE' || s === 'OFFLINE')) return 'none';
  return 'unverified';
}

export const STREAM_STATE_LABEL: Record<StreamState, string> = {
  LOADING: 'Loading',
  LIVE: 'Live',
  SCHEDULED: 'Scheduled',
  OFFLINE: 'Offline',
  UNAVAILABLE: 'Unavailable',
  UNKNOWN: 'Status unverified',
};
