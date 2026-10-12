import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { DataSourceError, LAUNCH_DATA, LaunchDataSource } from '../../core/data';
import { NasaMediaService } from '../../core/data/media/nasa-media.service';
import { DataResponse, Launch } from '../../core/models';
import { makeLaunch } from '../../core/testing/fixtures';
import { MissionDetail } from './mission-detail';

const META = { source: 'Test', lastRefresh: new Date().toISOString(), warnings: [], isMock: false };

function setup(getLaunch: (id: string) => Observable<DataResponse<Launch | null>>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LAUNCH_DATA, useValue: { getLaunch } as Partial<LaunchDataSource> },
      {
        provide: NasaMediaService,
        useValue: { related: () => of({ data: { items: [] }, meta: META }) },
      },
    ],
  });
  const fixture = TestBed.createComponent(MissionDetail);
  fixture.componentRef.setInput('id', 'x');
  return fixture;
}

describe('MissionDetail', () => {
  it('renders a sparse record with explicit "Unavailable" markers', async () => {
    const sparse = makeLaunch({
      missionName: 'Sparse Mission',
      description: undefined,
      payload: undefined,
      milestones: undefined,
      detailLevel: 'full',
    });
    const fixture = setup(() => of({ data: sparse, meta: META }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Sparse Mission');
    expect(el.textContent).toContain('No mission description is available.');
    expect(el.textContent).toContain('No timeline has been published');
    expect(el.textContent).toContain('No schedule snapshots are available yet');
    expect(el.querySelectorAll('.unavailable').length).toBeGreaterThan(5);
  });

  it('marks estimated milestone timings', async () => {
    const launch = makeLaunch({
      milestones: [{ id: 'm1', name: 'Liftoff', offsetSeconds: 0, estimated: true }],
    });
    const fixture = setup(() => of({ data: launch, meta: META }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Estimated timings');
    expect(el.querySelector('.timeline')?.textContent).toContain('T+00:00');
  });

  it('shows sourced launch updates', async () => {
    const launch = makeLaunch({
      updates: [{ id: 'u1', comment: 'Now targeting Oct 13', createdOn: '2026-10-12T00:28:00Z' }],
    });
    const fixture = setup(() => of({ data: launch, meta: META }));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.updates')?.textContent).toContain(
      'Now targeting Oct 13',
    );
  });

  it('never shows a countdown for a month-precision date', async () => {
    const launch = makeLaunch({
      status: 'tbd',
      scheduledTime: '2099-10-01T00:00:00Z',
      timePrecision: 'Month',
    });
    const fixture = setup(() => of({ data: launch, meta: META }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mw-countdown')).toBeNull();
    expect(el.textContent).toContain('No earlier than');
    expect(el.querySelector('.when')?.textContent).toMatch(/2099/);
  });

  it('shows a not-found state for an unknown id', async () => {
    const fixture = setup(() => of({ data: null, meta: META }));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mission not found');
  });

  it('explains a rate-limit failure', async () => {
    const fixture = setup(() =>
      throwError(() => new DataSourceError('rate-limit', 'Launch Library 2', 'limited', 600)),
    );
    await fixture.whenStable();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Try again in about 10 minutes');
  });
});
