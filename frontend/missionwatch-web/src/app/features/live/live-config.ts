import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { ConfiguredEvent, LiveMissionConfig, StreamConfig } from './live.models';
import { parseXBroadcastId, parseXPostId, parseYoutubeId, safeHttpsUrl } from './live-util';

/**
 * Loads and validates the Live Mission Control configuration.
 *
 * The stream links live in `public/config/live-missions.json` (see docs/live-streams.md), so
 * updating them before a launch means editing JSON, not code. The file is fetched at runtime and
 * checked here. A bad entry is reported and skipped instead of breaking the page.
 */

/** Relative to the base href, like the GCAT snapshot. */
export const LIVE_CONFIG_URL = 'config/live-missions.json';

export interface LiveConfig {
  missions: LiveMissionConfig[];
  /** Human-readable problems found in the file. Empty when it is valid. */
  problems: string[];
}

/** Used when the file is missing or has no usable mission: follow SpaceX's next launch, no streams. */
export const FALLBACK_MISSION: LiveMissionConfig = {
  id: 'next-launch',
  launch: { nextFromProvider: 'SpaceX' },
  streams: [],
  events: [],
};

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const optStr = (o: Obj, key: string): string | undefined => str(o[key])?.trim() || undefined;

function isoProblem(value: string | undefined, where: string): string | undefined {
  return value && Number.isNaN(Date.parse(value))
    ? `${where} is not a valid ISO-8601 time.`
    : undefined;
}

function parseStream(raw: unknown, where: string, problems: string[]): StreamConfig | undefined {
  if (!isObj(raw)) {
    problems.push(`${where} is not an object; skipped.`);
    return undefined;
  }
  const id = optStr(raw, 'id');
  const broadcaster = optStr(raw, 'broadcaster');
  if (!id || !broadcaster) {
    problems.push(`${where} needs an "id" and a "broadcaster"; skipped.`);
    return undefined;
  }
  const at = `${where} (${id})`;
  const scheduledStart = optStr(raw, 'scheduledStart');
  const timeProblem = isoProblem(scheduledStart, `${at} scheduledStart`);
  if (timeProblem) problems.push(timeProblem);

  // Invalid links are kept: the panel then explains that the configured link is not valid.
  if (raw['platform'] === 'youtube') {
    const video = str(raw['video'])?.trim() ?? '';
    const channelUrl = str(raw['channelUrl'])?.trim() ?? '';
    if (video && !parseYoutubeId(video)) problems.push(`${at} video is not a YouTube link or ID.`);
    if (!safeHttpsUrl(channelUrl)) problems.push(`${at} channelUrl must be an https:// link.`);
    return { platform: 'youtube', id, broadcaster, video, channelUrl, scheduledStart };
  }
  if (raw['platform'] === 'x') {
    const postUrl = str(raw['postUrl'])?.trim() ?? '';
    const broadcastUrl = str(raw['broadcastUrl'])?.trim() || undefined;
    const profileUrl = str(raw['profileUrl'])?.trim() ?? '';
    if (postUrl && !parseXPostId(postUrl)) problems.push(`${at} postUrl is not an X post link.`);
    if (broadcastUrl && !parseXBroadcastId(broadcastUrl)) {
      problems.push(`${at} broadcastUrl is not an X broadcast link.`);
    }
    if (!safeHttpsUrl(profileUrl)) problems.push(`${at} profileUrl must be an https:// link.`);
    return { platform: 'x', id, broadcaster, postUrl, broadcastUrl, profileUrl, scheduledStart };
  }
  problems.push(
    `${at} has platform "${String(raw['platform'])}"; expected "youtube" or "x". Skipped.`,
  );
  return undefined;
}

function parseEvent(raw: unknown, where: string, problems: string[]): ConfiguredEvent | undefined {
  if (!isObj(raw) || !optStr(raw, 'id') || !optStr(raw, 'title')) {
    problems.push(`${where} needs an "id" and a "title"; skipped.`);
    return undefined;
  }
  const event: ConfiguredEvent = { id: optStr(raw, 'id')!, title: optStr(raw, 'title')! };
  if (typeof raw['offsetSeconds'] === 'number') event.offsetSeconds = raw['offsetSeconds'];
  for (const key of ['plannedAt', 'actualAt'] as const) {
    const value = optStr(raw, key);
    const problem = isoProblem(value, `${where} ${key}`);
    if (problem) problems.push(problem);
    else if (value) event[key] = value;
  }
  if (raw['status'] === 'delayed' || raw['status'] === 'cancelled') event.status = raw['status'];
  return event;
}

function parseMission(
  raw: unknown,
  where: string,
  problems: string[],
): LiveMissionConfig | undefined {
  if (!isObj(raw) || !optStr(raw, 'id')) {
    problems.push(`${where} needs an "id"; skipped.`);
    return undefined;
  }
  const id = optStr(raw, 'id')!;
  const at = `Mission "${id}"`;
  const launch = isObj(raw['launch']) ? raw['launch'] : {};
  const fallbackT0 = optStr(launch, 'fallbackT0');
  const t0Problem = isoProblem(fallbackT0, `${at} launch.fallbackT0`);
  if (t0Problem) problems.push(t0Problem);

  const streams: StreamConfig[] = [];
  for (const [i, s] of (Array.isArray(raw['streams']) ? raw['streams'] : []).entries()) {
    const stream = parseStream(s, `${at} stream ${i + 1}`, problems);
    if (!stream) continue;
    if (streams.some((x) => x.id === stream.id)) {
      problems.push(`${at} has two streams with id "${stream.id}"; the second is skipped.`);
      continue;
    }
    streams.push(stream);
  }
  const events = (Array.isArray(raw['events']) ? raw['events'] : [])
    .map((e, i) => parseEvent(e, `${at} event ${i + 1}`, problems))
    .filter((e): e is ConfiguredEvent => !!e);

  return {
    id,
    name: optStr(raw, 'name'),
    vehicle: optStr(raw, 'vehicle'),
    launch: {
      ll2LaunchId: optStr(launch, 'll2LaunchId'),
      nextFromProvider: optStr(launch, 'nextFromProvider'),
      fallbackT0: t0Problem ? undefined : fallbackT0,
    },
    streams,
    events,
    xDiscussionUrl: optStr(raw, 'xDiscussionUrl'),
  };
}

/** Validates the parsed JSON file. Never throws; always returns at least one mission. */
export function parseLiveConfig(raw: unknown): LiveConfig {
  const problems: string[] = [];
  const missions: LiveMissionConfig[] = [];
  const list = isObj(raw) && Array.isArray(raw['missions']) ? raw['missions'] : undefined;
  if (!list) problems.push('The file needs a "missions" list.');

  for (const [i, m] of (list ?? []).entries()) {
    const mission = parseMission(m, `Mission ${i + 1}`, problems);
    if (!mission) continue;
    if (missions.some((x) => x.id === mission.id)) {
      problems.push(`Two missions have id "${mission.id}"; the second is skipped.`);
      continue;
    }
    missions.push(mission);
  }
  if (!missions.length) {
    if (list) problems.push('No usable mission found.');
    missions.push(FALLBACK_MISSION);
  }
  return { missions, problems };
}

/**
 * Fetches the configuration. The timestamp parameter skips the browser and CDN caches
 * (GitHub Pages caches for 10 minutes) so freshly deployed links show at once.
 */
export function loadLiveConfig(http: HttpClient, now = Date.now()): Observable<LiveConfig> {
  return http.get<unknown>(LIVE_CONFIG_URL, { params: { t: now } }).pipe(
    map(parseLiveConfig),
    catchError(() =>
      of<LiveConfig>({
        missions: [FALLBACK_MISSION],
        problems: ['The stream configuration could not be loaded.'],
      }),
    ),
  );
}

/** Route resolver: the /live page opens with its configuration already loaded. */
export const liveConfigResolver: ResolveFn<LiveConfig> = () => loadLiveConfig(inject(HttpClient));
