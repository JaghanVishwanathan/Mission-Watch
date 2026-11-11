import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { makeLaunch } from '../../testing/fixtures';
import { DataSourceError } from '../errors';
import { LAUNCH_DATA, LaunchDataSource } from '../launch-data-source';
import { provideBackendLaunchData } from './backend-launch-data.service';

const API = 'http://api.test';
const META = {
  source: 'Launch Library 2 (The Space Devs)',
  lastRefresh: '2026-11-11T10:00:00Z',
  warnings: [],
  isMock: false,
};

describe('BackendLaunchDataService', () => {
  let data: LaunchDataSource;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideBackendLaunchData(API)],
    });
    data = TestBed.inject(LAUNCH_DATA);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('passes the API envelope through unchanged', async () => {
    const launch = makeLaunch();
    const result = firstValueFrom(data.getUpcoming(10));
    http.expectOne(`${API}/api/launches/upcoming?limit=10`).flush({ data: [launch], meta: META });
    expect(await result).toEqual({ data: [launch], meta: META });
  });

  it('sends search criteria as query parameters', async () => {
    const result = firstValueFrom(
      data.search({
        text: ' starlink ',
        statuses: ['go', 'hold'],
        providerIds: ['121'],
        from: '2026-01-01',
        sort: 'provider',
        direction: 'desc',
      }),
    );
    const req = http.expectOne((r) => r.url === `${API}/api/launches/search`);
    expect(req.request.params.get('q')).toBe('starlink');
    expect(req.request.params.getAll('status')).toEqual(['go', 'hold']);
    expect(req.request.params.getAll('provider')).toEqual(['121']);
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.get('sort')).toBe('provider');
    expect(req.request.params.get('direction')).toBe('desc');
    req.flush({ data: [], meta: META });
    expect((await result).data).toEqual([]);
  });

  it('reports an unknown launch as null data, not an error', async () => {
    const result = firstValueFrom(data.getLaunch('nope'));
    http
      .expectOne(`${API}/api/launches/nope`)
      .flush({ status: 404, error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect((await result).data).toBeNull();
  });

  it('maps other failures to user-facing errors', async () => {
    const list = firstValueFrom(data.getUpcoming());
    http.expectOne(`${API}/api/launches/upcoming?limit=50`).error(new ProgressEvent('error'));
    await expect(list).rejects.toBeInstanceOf(DataSourceError);

    const detail = firstValueFrom(data.getLaunch('x'));
    http.expectOne(`${API}/api/launches/x`).flush('', { status: 503, statusText: 'Unavailable' });
    await expect(detail).rejects.toMatchObject({ kind: 'unavailable', source: 'MissionWatch API' });
  });
});
