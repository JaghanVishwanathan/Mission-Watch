import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { HISTORY_SNAPSHOT_URL, LL2_BASE_URL } from '../../config';
import { LAUNCH_DATA, LaunchDataSource } from '../launch-data-source';
import { provideLiveLaunchData } from './live-launch-data.service';
import { Ll2Launch } from './ll2-types';

function ll2(id: string, net: string, status = { id: 1, name: 'Go', abbrev: 'Go' }): Ll2Launch {
  return {
    id,
    name: `Falcon 9 | Mission ${id}`,
    status,
    net,
    launch_service_provider: { id: 121, name: 'SpaceX', abbrev: 'SpX' },
    rocket: { configuration: { id: 1, name: 'Falcon 9' } },
    pad: { id: 1, name: 'SLC-40' },
    mission: { name: `Mission ${id}`, type: 'Planetary Science' },
  };
}

const page = (results: Ll2Launch[]) => ({ count: results.length, next: null, results });
const isList = (kind: string) => (r: { url: string }) =>
  r.url === `${LL2_BASE_URL}/launches/${kind}/`;
const throttled = { status: 429, statusText: 'Too Many Requests' };

describe('LiveLaunchDataService', () => {
  let data: LaunchDataSource;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideLiveLaunchData()],
    });
    data = TestBed.inject(LAUNCH_DATA);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches upcoming launches once, then serves them from cache', async () => {
    const first = firstValueFrom(data.getUpcoming());
    const req = http.expectOne(isList('upcoming'));
    expect(req.request.params.get('mode')).toBe('normal');
    req.flush(page([ll2('b', '2030-01-02T00:00:00Z'), ll2('a', '2030-01-01T00:00:00Z')]));

    const { data: launches, meta } = await first;
    expect(launches.map((l) => l.id)).toEqual(['a', 'b']);
    expect(meta.isMock).toBe(false);

    const second = await firstValueFrom(data.getUpcoming());
    expect(second.data).toHaveLength(2);
    http.expectNone(isList('upcoming'));
  });

  it('searches across both windows and survives one window failing', async () => {
    const result = firstValueFrom(data.search({ text: 'mission' }));
    http.expectOne(isList('upcoming')).flush(page([ll2('up', '2030-01-01T00:00:00Z')]));
    http
      .expectOne(isList('previous'))
      .flush({ detail: 'Request was throttled. Expected available in 900 seconds.' }, throttled);

    const { data: launches, meta } = await result;
    expect(launches.map((l) => l.id)).toEqual(['up']);
    expect(meta.warnings.join(' ')).toContain('Recent launches are missing');
    expect(meta.warnings.join(' ')).toContain('15 minutes');
  });

  it('shows the cached summary first, then the full record', async () => {
    const upcoming = firstValueFrom(data.getUpcoming());
    http.expectOne(isList('upcoming')).flush(page([ll2('a', '2030-01-01T00:00:00Z')]));
    await upcoming;

    const emissions = firstValueFrom(data.getLaunch('a').pipe(toArray()));
    const detail = http.expectOne(`${LL2_BASE_URL}/launches/a/?mode=detailed`);
    detail.flush({
      ...ll2('a', '2030-01-01T00:00:00Z'),
      timeline: [{ type: { id: 1, abbrev: 'Liftoff' }, relative_time: 'PT0S' }],
    });

    const [summary, full] = await emissions;
    expect(summary.data?.detailLevel).toBe('summary');
    expect(full.data?.detailLevel).toBe('full');
    expect(full.data?.milestones?.[0].name).toBe('Liftoff');
  });

  it('keeps the summary with a warning when the full record is rate limited', async () => {
    const upcoming = firstValueFrom(data.getUpcoming());
    http.expectOne(isList('upcoming')).flush(page([ll2('a', '2030-01-01T00:00:00Z')]));
    await upcoming;

    const emissions = firstValueFrom(data.getLaunch('a').pipe(toArray()));
    http.expectOne(`${LL2_BASE_URL}/launches/a/?mode=detailed`).flush({}, throttled);
    const all = await emissions;
    const last = all.at(-1)!;
    expect(last.data?.id).toBe('a');
    expect(last.meta.warnings.join(' ')).toContain('summary is shown');
  });

  it('reports an unknown launch as not found', async () => {
    const result = firstValueFrom(data.getLaunch('missing'));
    http
      .expectOne(`${LL2_BASE_URL}/launches/missing/?mode=detailed`)
      .flush({ detail: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    expect((await result).data).toBeNull();
  });

  it('computes analytics from the GCAT snapshot', async () => {
    const result = firstValueFrom(data.getAnalytics({ fromYear: 2025 }));
    http.expectOne(HISTORY_SNAPSHOT_URL).flush({
      schema: 1,
      source: {
        name: 'GCAT',
        author: 'McDowell',
        url: 'u',
        license: 'CC BY 4.0',
        licenseUrl: 'l',
        updated: '2026 Oct 11',
      },
      generatedAt: '2026-10-12T00:00:00Z',
      notes: [],
      columns: ['time', 'provider', 'site', 'outcome', 'vehicle'],
      providers: [['SPX', 'SpaceX', 'SpaceX', 'US']],
      sites: [['CC', 'Canaveral', 'Cape Canaveral']],
      vehicles: ['Falcon 9'],
      launches: [
        ['2024-01-01T00:00Z', 0, 0, 0, 0],
        ['2025-01-01T00:00Z', 0, 0, 0, 0],
        ['2025-06-01T00:00Z', 0, 0, 2, 0],
      ],
    });
    const { data: summary, meta } = await result;
    expect(summary.total).toBe(2);
    expect(summary.outcomes.find((o) => o.status === 'failure')?.count).toBe(1);
    expect(meta.dataTimestamp).toBe('2026 Oct 11');
  });
});
