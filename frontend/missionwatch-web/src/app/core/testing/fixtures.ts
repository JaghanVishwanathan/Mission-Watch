import { Launch } from '../models';

let seq = 0;

/** Minimal valid launch for tests; override only what a test cares about. */
export function makeLaunch(overrides: Partial<Launch> = {}): Launch {
  seq++;
  return {
    id: `test-${seq}`,
    externalId: `ext-${seq}`,
    name: `Rocket | Mission ${seq}`,
    missionName: `Mission ${seq}`,
    scheduledTime: '2026-01-01T12:00:00.000Z',
    status: 'go',
    provider: { id: 'prov-a', externalId: 'pa', name: 'Alpha Launch', abbrev: 'AL' },
    rocket: { id: 'rocket-a', name: 'Alpha One', family: 'Alpha', providerId: 'prov-a' },
    site: { id: 'site-a', name: 'Pad A', location: 'Somewhere' },
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
