import {
  Launch,
  LaunchSnapshot,
  LaunchStatus,
  MissionCategory,
  MissionMilestone,
  Payload,
  SourceLink,
} from '../../models';
import { PROVIDERS, ROCKETS, SITES } from './reference-data';

/**
 * Hand-written demo launches used during Phase 1. Times are relative to "now" so the
 * dataset always has upcoming and recent entries. Every record is illustrative — the UI
 * labels it as demo data — and several are deliberately incomplete to exercise the
 * "Unavailable" paths required by FR-03.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];
type Rocket = (typeof ROCKETS)[keyof typeof ROCKETS];
type Site = (typeof SITES)[keyof typeof SITES];

interface Seed {
  id: string;
  name: string;
  missionName: string;
  provider: Provider;
  rocket: Rocket;
  site: Site;
  /** Offset of the scheduled time from "now", in hours. */
  offsetHours: number;
  status: LaunchStatus;
  category?: MissionCategory;
  description?: string;
  objectives?: string[];
  payload?: Payload;
  featured?: boolean;
  windowHours?: number;
  milestones?: MissionMilestone[];
  /** Earlier observed schedules, as hour offsets from "now" and observation ages in days. */
  history?: {
    scheduledOffsetHours: number;
    observedDaysAgo: number;
    status: LaunchStatus;
    sourcedReason?: string;
  }[];
  links?: SourceLink[];
}

const DEMO_SOURCE = 'MissionWatch demo dataset';

/** Generic two-stage-to-orbit profile. Always flagged as estimated (FR-05). */
function genericOrbitalProfile(
  prefix: string,
  opts: { boosterLanding?: boolean; deployLabel?: string } = {},
): MissionMilestone[] {
  const steps: [string, string, number][] = [
    ['Propellant loading', 'Vehicle is fuelled in the final hour of the count.', -2100],
    ['Liftoff', 'Engines ignite and the vehicle clears the tower.', 0],
    ['Max-Q', 'Point of maximum aerodynamic pressure on the vehicle.', 72],
    ['Main engine cutoff', 'First stage engines shut down.', 150],
    ['Stage separation', 'First and second stages separate.', 154],
    [
      'Fairing separation',
      'Payload fairing halves are jettisoned once the atmosphere is thin enough.',
      200,
    ],
  ];
  if (opts.boosterLanding)
    steps.push(['Booster landing', 'First stage attempts a propulsive landing.', 510]);
  steps.push([
    'Orbital insertion',
    'Upper stage engine cutoff places the stack in its initial orbit.',
    530,
  ]);
  steps.push([
    opts.deployLabel ?? 'Payload deployment',
    'Spacecraft separates from the upper stage.',
    3600,
  ]);

  return steps.map(([name, description, offsetSeconds], i) => ({
    id: `${prefix}-m${i}`,
    name,
    description,
    offsetSeconds,
    estimated: true,
    source: 'Generic vehicle profile',
  }));
}

const SEEDS: Seed[] = [
  // ── Upcoming ────────────────────────────────────────────────────────────────
  {
    id: 'demo-starlink-12-7',
    name: 'Falcon 9 | Starlink Group 12-7',
    missionName: 'Starlink Group 12-7',
    provider: PROVIDERS.spacex,
    rocket: ROCKETS.falcon9,
    site: SITES.slc40,
    offsetHours: 7,
    status: 'go',
    category: 'communications',
    description: 'A batch of Starlink broadband satellites launched to a low Earth orbit shell.',
    objectives: [
      'Deploy a batch of broadband satellites',
      'Recover the first stage on a droneship',
    ],
    payload: {
      name: 'Starlink V2 Mini (batch)',
      type: 'Communications constellation',
      orbit: 'Low Earth Orbit',
      destination: 'LEO shell, ~530 km',
      customer: 'SpaceX',
    },
    windowHours: 4,
    milestones: genericOrbitalProfile('sl127', {
      boosterLanding: true,
      deployLabel: 'Satellite deployment',
    }),
    history: [
      { scheduledOffsetHours: -17, observedDaysAgo: 9, status: 'tbc' },
      { scheduledOffsetHours: 7, observedDaysAgo: 2, status: 'go' },
    ],
    links: [
      { label: 'Provider mission page', url: 'https://www.spacex.com/launches/', kind: 'official' },
    ],
  },
  {
    id: 'demo-artemis-cargo',
    name: 'Falcon Heavy | Lunar Gateway Logistics Demo',
    missionName: 'Lunar Gateway Logistics Demo',
    provider: PROVIDERS.spacex,
    rocket: ROCKETS.falconHeavy,
    site: SITES.lc39a,
    offsetHours: 3 * 24 + 5,
    status: 'tbc',
    category: 'science',
    description:
      'Illustrative heavy-lift mission carrying a cargo demonstrator toward cislunar space. Included in the demo dataset to exercise destination and milestone layouts.',
    objectives: [
      'Demonstrate cargo delivery beyond low Earth orbit',
      'Validate rendezvous sensors in cislunar space',
    ],
    payload: {
      name: 'Cargo demonstrator',
      type: 'Logistics spacecraft',
      orbit: 'Trans-lunar injection',
      destination: 'Near-rectilinear halo orbit (Moon)',
      massKg: 14000,
    },
    featured: true,
    windowHours: 2,
    milestones: genericOrbitalProfile('alc', { deployLabel: 'Spacecraft separation' }),
    history: [
      { scheduledOffsetHours: -9 * 24, observedDaysAgo: 40, status: 'tbd' },
      { scheduledOffsetHours: -2 * 24, observedDaysAgo: 21, status: 'tbc' },
      {
        scheduledOffsetHours: 3 * 24 + 5,
        observedDaysAgo: 6,
        status: 'tbc',
        sourcedReason:
          'Provider statement: additional payload integration time requested by customer.',
      },
    ],
  },
  {
    id: 'demo-electron-bluebird',
    name: 'Electron | Earth Observation Rideshare 4',
    missionName: 'Earth Observation Rideshare 4',
    provider: PROVIDERS.rocketlab,
    rocket: ROCKETS.electron,
    site: SITES.mahia,
    offsetHours: 2 * 24 + 1,
    status: 'go',
    category: 'earth-observation',
    description: 'Small-satellite rideshare to sun-synchronous orbit.',
    payload: {
      name: 'SAR microsatellites (x3)',
      type: 'Earth observation',
      orbit: 'Sun-synchronous orbit',
    },
    milestones: genericOrbitalProfile('eor4', { deployLabel: 'Kick stage deployment' }),
  },
  {
    id: 'demo-vulcan-nssl',
    name: 'Vulcan | USSF Demonstration Payload',
    missionName: 'USSF Demonstration Payload',
    provider: PROVIDERS.ula,
    rocket: ROCKETS.vulcan,
    site: SITES.slc41,
    offsetHours: 9 * 24,
    status: 'tbd',
    category: 'government',
    description: 'National security payload. Mission details are limited by the customer.',
    // Payload intentionally omitted: classified missions often lack payload data.
  },
  {
    id: 'demo-ariane6-galileo',
    name: 'Ariane 62 | Galileo L15',
    missionName: 'Galileo L15',
    provider: PROVIDERS.arianespace,
    rocket: ROCKETS.ariane6,
    site: SITES.kourou,
    offsetHours: 12 * 24 + 3,
    status: 'go',
    category: 'navigation',
    description: 'Two navigation satellites for the European Galileo constellation.',
    objectives: [
      'Deliver two satellites to medium Earth orbit',
      'Strengthen constellation redundancy',
    ],
    payload: {
      name: 'Galileo FOC (x2)',
      type: 'Navigation',
      orbit: 'Medium Earth Orbit',
      destination: 'MEO, ~23,200 km',
      customer: 'European Commission / ESA',
      massKg: 1450,
    },
    featured: true,
    milestones: genericOrbitalProfile('gal15', { deployLabel: 'Satellite separation' }),
  },
  {
    id: 'demo-pslv-eos',
    name: 'PSLV-XL | EOS-N1',
    missionName: 'EOS-N1',
    provider: PROVIDERS.isro,
    rocket: ROCKETS.pslv,
    site: SITES.sriharikota,
    offsetHours: 15 * 24,
    status: 'hold',
    category: 'earth-observation',
    description: 'Earth observation satellite for land and ocean monitoring.',
    payload: { name: 'EOS-N1', type: 'Earth observation', orbit: 'Sun-synchronous orbit' },
    history: [
      { scheduledOffsetHours: 4 * 24, observedDaysAgo: 18, status: 'go' },
      { scheduledOffsetHours: 15 * 24, observedDaysAgo: 3, status: 'hold' },
    ],
  },
  {
    id: 'demo-lm5-tianwen',
    name: 'Long March 5 | Deep Space Technology Mission',
    missionName: 'Deep Space Technology Mission',
    provider: PROVIDERS.casc,
    rocket: ROCKETS.longMarch5,
    site: SITES.wenchang,
    offsetHours: 21 * 24,
    status: 'tbd',
    category: 'science',
    payload: { name: 'Technology demonstrator', destination: 'Heliocentric orbit' },
  },
  {
    id: 'demo-new-glenn',
    name: 'New Glenn | Commercial GEO Demonstration',
    missionName: 'Commercial GEO Demonstration',
    provider: PROVIDERS.blueorigin,
    rocket: ROCKETS.newGlenn,
    site: SITES.lc36,
    offsetHours: 27 * 24,
    status: 'tbc',
    category: 'communications',
    description: 'Heavy-lift launch of a geostationary communications satellite.',
    payload: { name: 'GEO comsat', type: 'Communications', orbit: 'Geostationary transfer orbit' },
    featured: true,
  },
  {
    id: 'demo-h3-qzs',
    name: 'H3-22S | QZS-7',
    missionName: 'QZS-7',
    provider: PROVIDERS.jaxa,
    rocket: ROCKETS.h3,
    site: SITES.tanegashima,
    offsetHours: 33 * 24,
    status: 'tbd',
    category: 'navigation',
    payload: {
      name: 'QZS-7',
      type: 'Navigation',
      orbit: 'Inclined geosynchronous orbit',
      customer: 'Cabinet Office, Japan',
    },
  },
  {
    id: 'demo-soyuz-progress',
    name: 'Soyuz 2.1a | Progress MS-34',
    missionName: 'Progress MS-34',
    provider: PROVIDERS.roscosmos,
    rocket: ROCKETS.soyuz,
    site: SITES.baikonur,
    offsetHours: 40 * 24,
    status: 'go',
    category: 'resupply',
    description: 'Uncrewed cargo resupply flight to the International Space Station.',
    payload: {
      name: 'Progress MS-34',
      type: 'Cargo spacecraft',
      orbit: 'Low Earth Orbit',
      destination: 'International Space Station',
    },
  },
  {
    id: 'demo-crew-13',
    name: 'Falcon 9 | Crew-13',
    missionName: 'Crew-13',
    provider: PROVIDERS.spacex,
    rocket: ROCKETS.falcon9,
    site: SITES.lc39a,
    offsetHours: 46 * 24,
    status: 'tbc',
    category: 'human-spaceflight',
    description:
      'Crew rotation flight carrying four astronauts to the International Space Station.',
    objectives: ['Deliver four crew members to the ISS', 'Return the previous expedition crew'],
    payload: {
      name: 'Crew Dragon',
      type: 'Crewed spacecraft',
      orbit: 'Low Earth Orbit',
      destination: 'International Space Station',
      customer: 'NASA',
    },
    featured: true,
    milestones: genericOrbitalProfile('crew13', {
      boosterLanding: true,
      deployLabel: 'Dragon separation',
    }),
  },

  // ── Recent ──────────────────────────────────────────────────────────────────
  {
    id: 'demo-starlink-11-2',
    name: 'Falcon 9 | Starlink Group 11-2',
    missionName: 'Starlink Group 11-2',
    provider: PROVIDERS.spacex,
    rocket: ROCKETS.falcon9,
    site: SITES.slc4e,
    offsetHours: -30,
    status: 'success',
    category: 'communications',
    description: 'Broadband satellite batch launched from the West Coast.',
    payload: {
      name: 'Starlink V2 Mini (batch)',
      type: 'Communications constellation',
      orbit: 'Low Earth Orbit',
    },
    milestones: genericOrbitalProfile('sl112', {
      boosterLanding: true,
      deployLabel: 'Satellite deployment',
    }),
  },
  {
    id: 'demo-electron-recent',
    name: 'Electron | Ocean Monitor Pathfinder',
    missionName: 'Ocean Monitor Pathfinder',
    provider: PROVIDERS.rocketlab,
    rocket: ROCKETS.electron,
    site: SITES.mahia,
    offsetHours: -3 * 24,
    status: 'success',
    category: 'earth-observation',
    payload: { name: 'Pathfinder microsat', orbit: 'Sun-synchronous orbit' },
  },
  {
    id: 'demo-lm2d-recent',
    name: 'Long March 2D | Remote Sensing Group 7',
    missionName: 'Remote Sensing Group 7',
    provider: PROVIDERS.casc,
    rocket: ROCKETS.longMarch2d,
    site: SITES.jiuquan,
    offsetHours: -5 * 24,
    status: 'success',
    category: 'earth-observation',
  },
  {
    id: 'demo-lvm3-oneweb',
    name: 'LVM3 | Commercial Broadband Batch',
    missionName: 'Commercial Broadband Batch',
    provider: PROVIDERS.isro,
    rocket: ROCKETS.lvm3,
    site: SITES.sriharikota,
    offsetHours: -9 * 24,
    status: 'success',
    category: 'communications',
    description: 'Commercial launch of broadband satellites for a polar constellation.',
    payload: {
      name: 'Broadband satellites (x36)',
      type: 'Communications constellation',
      orbit: 'Polar LEO',
      massKg: 5800,
    },
  },
  {
    id: 'demo-h3-partial',
    name: 'H3-22S | Technology Demonstration Satellite',
    missionName: 'Technology Demonstration Satellite',
    provider: PROVIDERS.jaxa,
    rocket: ROCKETS.h3,
    site: SITES.tanegashima,
    offsetHours: -14 * 24,
    status: 'partial-failure',
    category: 'technology',
    description:
      'Payload reached a lower-than-planned orbit. Investigation details are pending from the provider.',
    payload: { name: 'Tech demo sat', orbit: 'Sun-synchronous orbit (planned)' },
    history: [
      { scheduledOffsetHours: -18 * 24, observedDaysAgo: 30, status: 'go' },
      { scheduledOffsetHours: -15 * 24, observedDaysAgo: 18, status: 'go' },
      { scheduledOffsetHours: -14 * 24, observedDaysAgo: 15, status: 'go' },
    ],
  },
  {
    id: 'demo-ariane-recent',
    name: 'Ariane 62 | Weather Satellite Third Generation',
    missionName: 'Weather Satellite Third Generation',
    provider: PROVIDERS.arianespace,
    rocket: ROCKETS.ariane6,
    site: SITES.kourou,
    offsetHours: -19 * 24,
    status: 'success',
    category: 'earth-observation',
    description: 'Meteorological satellite delivered to geostationary transfer orbit.',
    payload: {
      name: 'Weather satellite',
      type: 'Meteorology',
      orbit: 'Geostationary transfer orbit',
      customer: 'EUMETSAT',
    },
    featured: true,
  },
  {
    id: 'demo-failure',
    name: 'Electron | Rideshare Mission 52',
    missionName: 'Rideshare Mission 52',
    provider: PROVIDERS.rocketlab,
    rocket: ROCKETS.electron,
    site: SITES.mahia,
    offsetHours: -26 * 24,
    status: 'failure',
    category: 'technology',
    description:
      'Vehicle anomaly during second-stage burn. The provider has not yet published a root cause.',
  },
  {
    id: 'demo-crs-recent',
    name: 'Falcon 9 | CRS-33',
    missionName: 'CRS-33',
    provider: PROVIDERS.spacex,
    rocket: ROCKETS.falcon9,
    site: SITES.slc40,
    offsetHours: -33 * 24,
    status: 'success',
    category: 'resupply',
    description: 'Cargo Dragon resupply mission to the International Space Station.',
    payload: {
      name: 'Cargo Dragon',
      type: 'Cargo spacecraft',
      destination: 'International Space Station',
      customer: 'NASA',
      massKg: 2900,
    },
    milestones: genericOrbitalProfile('crs33', {
      boosterLanding: true,
      deployLabel: 'Dragon separation',
    }),
  },
];

export function buildMockCatalog(now: number): Launch[] {
  const iso = (ms: number) => new Date(ms).toISOString();

  return SEEDS.map((seed): Launch => {
    const scheduled = now + seed.offsetHours * HOUR;
    const history: LaunchSnapshot[] | undefined = seed.history?.map((h) => ({
      observedAt: iso(now - h.observedDaysAgo * DAY),
      scheduledTime: iso(now + h.scheduledOffsetHours * HOUR),
      status: h.status,
      source: DEMO_SOURCE,
      sourcedReason: h.sourcedReason,
    }));

    return {
      id: seed.id,
      externalId: seed.id,
      name: seed.name,
      missionName: seed.missionName,
      description: seed.description,
      objectives: seed.objectives,
      category: seed.category,
      scheduledTime: iso(scheduled),
      windowStart: seed.windowHours ? iso(scheduled) : undefined,
      windowEnd: seed.windowHours ? iso(scheduled + seed.windowHours * HOUR) : undefined,
      status: seed.status,
      provider: seed.provider,
      rocket: seed.rocket,
      site: seed.site,
      payload: seed.payload,
      links: seed.links,
      milestones: seed.milestones,
      scheduleHistory: history,
      featured: seed.featured,
      lastUpdated: iso(now - 2 * HOUR),
    };
  });
}
