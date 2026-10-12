import { Launch, LaunchStatus } from '../../models';
import { PROVIDERS, ROCKETS, SITES } from './reference-data';

/**
 * Seeded, synthetic launch history used only to give the Phase 1 analytics page realistic
 * volume. It is NOT real launch history and is labelled as synthetic in the UI.
 */

/** Deterministic PRNG (mulberry32) so charts and tests are stable between runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  provider: (typeof PROVIDERS)[keyof typeof PROVIDERS];
  rockets: (typeof ROCKETS)[keyof typeof ROCKETS][];
  sites: (typeof SITES)[keyof typeof SITES][];
  /** Launches per year, indexed from FIRST_YEAR. */
  cadence: number[];
  failureRate: number;
}

const FIRST_YEAR = 2016;

const PROFILES: Profile[] = [
  {
    provider: PROVIDERS.spacex,
    rockets: [ROCKETS.falcon9, ROCKETS.falcon9, ROCKETS.falcon9, ROCKETS.falconHeavy],
    sites: [SITES.slc40, SITES.lc39a, SITES.slc4e],
    cadence: [8, 18, 21, 13, 26, 31, 61, 96, 120, 130, 140],
    failureRate: 0.01,
  },
  {
    provider: PROVIDERS.casc,
    rockets: [ROCKETS.longMarch2d, ROCKETS.longMarch5],
    sites: [SITES.jiuquan, SITES.wenchang],
    cadence: [20, 16, 37, 27, 35, 48, 53, 47, 54, 60, 65],
    failureRate: 0.04,
  },
  {
    provider: PROVIDERS.rocketlab,
    rockets: [ROCKETS.electron],
    sites: [SITES.mahia],
    cadence: [0, 1, 3, 6, 7, 6, 9, 10, 16, 18, 20],
    failureRate: 0.08,
  },
  {
    provider: PROVIDERS.roscosmos,
    rockets: [ROCKETS.soyuz],
    sites: [SITES.baikonur],
    cadence: [17, 19, 17, 22, 15, 22, 21, 17, 15, 14, 14],
    failureRate: 0.03,
  },
  {
    provider: PROVIDERS.arianespace,
    rockets: [ROCKETS.ariane6],
    sites: [SITES.kourou],
    cadence: [11, 11, 11, 9, 5, 6, 5, 3, 3, 5, 6],
    failureRate: 0.04,
  },
  {
    provider: PROVIDERS.ula,
    rockets: [ROCKETS.vulcan],
    sites: [SITES.slc41, SITES.slc4e],
    cadence: [12, 8, 8, 5, 6, 5, 8, 3, 5, 6, 8],
    failureRate: 0.01,
  },
  {
    provider: PROVIDERS.isro,
    rockets: [ROCKETS.pslv, ROCKETS.lvm3],
    sites: [SITES.sriharikota],
    cadence: [7, 5, 7, 6, 2, 2, 5, 7, 5, 6, 6],
    failureRate: 0.07,
  },
  {
    provider: PROVIDERS.jaxa,
    rockets: [ROCKETS.h3],
    sites: [SITES.tanegashima],
    cadence: [4, 7, 6, 2, 4, 3, 1, 3, 4, 4, 4],
    failureRate: 0.08,
  },
  {
    provider: PROVIDERS.blueorigin,
    rockets: [ROCKETS.newGlenn],
    sites: [SITES.lc36],
    cadence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4],
    failureRate: 0.2,
  },
];

export function buildSyntheticHistory(now: number, seed = 20_261_012): Launch[] {
  const random = mulberry32(seed);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const launches: Launch[] = [];

  for (const profile of PROFILES) {
    profile.cadence.forEach((count, yearIndex) => {
      const year = FIRST_YEAR + yearIndex;
      for (let n = 0; n < count; n++) {
        const time = Date.UTC(year, 0, 1) + random() * 365 * 86_400_000;
        if (time >= now) continue;

        const roll = random();
        const status: LaunchStatus =
          roll < profile.failureRate
            ? 'failure'
            : roll < profile.failureRate * 1.4
              ? 'partial-failure'
              : 'success';
        const rocket = pick(profile.rockets);
        const id = `syn-${profile.provider.id}-${year}-${n}`;

        launches.push({
          id,
          externalId: id,
          name: `${rocket.name} | Synthetic ${year}-${n + 1}`,
          missionName: `Synthetic ${year}-${n + 1}`,
          scheduledTime: new Date(time).toISOString(),
          status,
          provider: profile.provider,
          rocket,
          site: pick(profile.sites),
          lastUpdated: new Date(now).toISOString(),
        });
      }
    });
  }

  return launches.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}
