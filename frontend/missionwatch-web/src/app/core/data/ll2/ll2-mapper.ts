import {
  Launch,
  LaunchStatus,
  LaunchUpdate,
  MissionCategory,
  MissionMilestone,
  Payload,
  SourceLink,
} from '../../models';
import { Ll2Launch, Ll2Link } from './ll2-types';

/**
 * LL2 status abbreviations → internal statuses (SRS §5.7: map provider statuses
 * carefully). "Deployed" means the payload separated but LL2 has not yet recorded a
 * final outcome, so it is kept distinct rather than counted as a success.
 */
const STATUS_BY_ABBREV: Record<string, LaunchStatus> = {
  go: 'go',
  tbd: 'tbd',
  tbc: 'tbc',
  hold: 'hold',
  'in flight': 'in-flight',
  deployed: 'deployed',
  success: 'success',
  failure: 'failure',
  'partial failure': 'partial-failure',
};

const STATUS_BY_ID: Record<number, LaunchStatus> = {
  1: 'go',
  2: 'tbd',
  3: 'success',
  4: 'failure',
  5: 'hold',
  6: 'in-flight',
  7: 'partial-failure',
  8: 'tbc',
  9: 'deployed',
};

export function mapStatus(status: Ll2Launch['status']): LaunchStatus | undefined {
  if (!status) return undefined;
  return STATUS_BY_ABBREV[status.abbrev?.trim().toLowerCase() ?? ''] ?? STATUS_BY_ID[status.id];
}

const CATEGORY_RULES: [RegExp, MissionCategory][] = [
  [/human|crew|tourism/i, 'human-spaceflight'],
  [/resupply|cargo/i, 'resupply'],
  [/communication/i, 'communications'],
  [/earth science|earth observation|meteorolog/i, 'earth-observation'],
  [/navigation/i, 'navigation'],
  [/planetary|astrophysics|heliophysics|science|lunar|robotic exploration/i, 'science'],
  [/government|military|top secret/i, 'government'],
  [/test|technology|demonstrat/i, 'technology'],
];

export function mapCategory(type: string | null | undefined): MissionCategory | undefined {
  if (!type) return undefined;
  return CATEGORY_RULES.find(([pattern]) => pattern.test(type))?.[1];
}

/** Precisions at which a countdown to the second is meaningful. */
const EXACT_PRECISIONS = new Set(['second', 'minute']);

export function isExactTime(precision: string | undefined): boolean {
  return !precision || EXACT_PRECISIONS.has(precision.toLowerCase());
}

/** ISO-8601 duration with optional sign ("-PT38M", "PT2M30S", "P1DT2H") → seconds. */
export function parseDuration(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const m =
    /^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      value.trim(),
    );
  if (!m || value.trim() === 'P' || value.trim() === '-P') return undefined;
  const [, sign, d, h, min, s] = m;
  const total =
    Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
  return Math.round(sign ? -total : total);
}

function num(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validDate(value: string | null | undefined): string | undefined {
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

function links(
  list: Ll2Link[] | null | undefined,
  kind: SourceLink['kind'],
  max: number,
): SourceLink[] {
  return (list ?? [])
    .filter((l) => typeof l?.url === 'string' && /^https?:\/\//.test(l.url))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, max)
    .map((l) => ({
      label: str(l.title) ?? str(l.publisher) ?? str(l.source) ?? new URL(l.url).hostname,
      url: l.url,
      kind,
    }));
}

function dedupeLinks(list: SourceLink[]): SourceLink[] {
  const seen = new Set<string>();
  return list.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
}

/**
 * Validates and normalises one LL2 launch. Returns undefined for records missing
 * required fields so a single bad record never breaks a page (SRS §5.7).
 */
export function mapLaunch(raw: Ll2Launch, detailLevel: 'summary' | 'full'): Launch | undefined {
  const status = mapStatus(raw?.status);
  const net = validDate(raw?.net);
  const provider = raw?.launch_service_provider;
  const config = raw?.rocket?.configuration;
  const pad = raw?.pad;
  if (!raw?.id || !raw.name || !status || !net || !provider?.name || !config?.name || !pad?.name)
    return undefined;

  const mission = raw.mission ?? undefined;
  const missionName = str(mission?.name) ?? raw.name.split('|').at(-1)!.trim();
  const countryCode = pad.country?.alpha_2_code ?? pad.location?.country?.alpha_2_code ?? undefined;

  const payload: Payload | undefined =
    mission?.orbit?.name || mission?.agencies?.length
      ? {
          type: str(mission?.type),
          orbit: str(mission?.orbit?.name),
          destination: str(mission?.orbit?.celestial_body?.name),
          customer: mission?.agencies?.map((a) => a.name).join(', ') || undefined,
        }
      : undefined;

  const milestones: MissionMilestone[] | undefined = raw.timeline?.length
    ? raw.timeline
        .map((event, i) => ({
          id: `${raw.id}-t${i}`,
          name: str(event.type?.abbrev) ?? 'Event',
          description: str(event.type?.description),
          offsetSeconds: parseDuration(event.relative_time),
          estimated: false,
          source: 'Launch Library 2 timeline',
        }))
        .sort((a, b) => (a.offsetSeconds ?? 0) - (b.offsetSeconds ?? 0))
    : undefined;

  const updates: LaunchUpdate[] | undefined = raw.updates?.length
    ? raw.updates
        .filter((u) => str(u.comment) && validDate(u.created_on))
        .map((u) => ({
          id: String(u.id),
          comment: u.comment!.trim(),
          createdOn: u.created_on!,
          infoUrl: str(u.info_url),
          author: str(u.created_by),
        }))
        .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
    : undefined;

  const allLinks = dedupeLinks([
    ...links(raw.info_urls ?? mission?.info_urls, 'official', 4),
    ...links(raw.vid_urls ?? mission?.vid_urls, 'webcast', 3),
    ...(raw.flightclub_url
      ? [
          {
            label: 'Flight Club trajectory simulation',
            url: raw.flightclub_url,
            kind: 'data' as const,
          },
        ]
      : []),
  ]);

  const precision = str(raw.net_precision?.name);

  return {
    id: raw.id,
    externalId: raw.id,
    name: raw.name,
    missionName,
    description: str(mission?.description),
    category: mapCategory(mission?.type),
    missionType: str(mission?.type),
    scheduledTime: net,
    timePrecision: precision && !isExactTime(precision) ? precision : undefined,
    windowStart: validDate(raw.window_start),
    windowEnd: validDate(raw.window_end),
    status,
    provider: {
      id: String(provider.id),
      externalId: String(provider.id),
      name: provider.name,
      abbrev: str(provider.abbrev),
      countryCode: provider.country?.[0]?.alpha_2_code ?? undefined,
      type: /government/i.test(provider.type?.name ?? '')
        ? 'government'
        : /multinational/i.test(provider.type?.name ?? '')
          ? 'multinational'
          : provider.type?.name
            ? 'commercial'
            : undefined,
    },
    rocket: {
      id: String(config.id),
      name: str(config.full_name) ?? config.name,
      family: config.families?.[0]?.name,
      variant: str(config.variant),
      providerId: String(provider.id),
      specs:
        detailLevel === 'full'
          ? {
              heightM: num(config.length),
              diameterM: num(config.diameter),
              leoCapacityKg: num(config.leo_capacity),
              stages: num(config.max_stage),
              reusable: config.reusable ?? undefined,
            }
          : undefined,
    },
    site: {
      id: String(pad.id),
      name: pad.name,
      location: str(pad.location?.name) ?? 'Unknown location',
      countryCode,
      latitude: num(pad.latitude),
      longitude: num(pad.longitude),
    },
    payload,
    imageUrl: str(raw.image?.image_url ?? undefined),
    thumbnailUrl:
      str(raw.image?.thumbnail_url ?? undefined) ?? str(raw.image?.image_url ?? undefined),
    imageCredit: raw.image
      ? {
          credit: str(raw.image.credit ?? undefined),
          license: str(raw.image.license?.name),
          licenseUrl: str(raw.image.license?.link ?? undefined),
        }
      : undefined,
    links: allLinks.length ? allLinks : undefined,
    milestones,
    updates: updates?.length ? updates : undefined,
    lastUpdated: validDate(raw.last_updated) ?? net,
    detailLevel,
  };
}

export interface MappedPage {
  launches: Launch[];
  skipped: number;
}

export function mapLaunchPage(
  results: Ll2Launch[] | undefined,
  detailLevel: 'summary' | 'full',
): MappedPage {
  const launches: Launch[] = [];
  let skipped = 0;
  for (const raw of results ?? []) {
    const mapped = mapLaunch(raw, detailLevel);
    if (mapped) launches.push(mapped);
    else skipped++;
  }
  return { launches, skipped };
}
