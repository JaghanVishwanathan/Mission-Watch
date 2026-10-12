import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LAUNCH_DATA, LaunchDataSource } from '../../core/data';
import { DataResponse, Launch } from '../../core/models';
import { makeLaunch } from '../../core/testing/fixtures';
import { MissionDetail } from './mission-detail';

const META = { source: 'Test', lastRefresh: new Date().toISOString(), warnings: [], isMock: true };

function setup(getLaunch: (id: string) => Observable<DataResponse<Launch | null>>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LAUNCH_DATA, useValue: { getLaunch } as Partial<LaunchDataSource> },
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
    });
    const fixture = setup(() => of({ data: sparse, meta: META }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Sparse Mission');
    expect(el.textContent).toContain('No mission description is available.');
    expect(el.textContent).toContain('No milestone information is available');
    expect(el.textContent).toContain('No schedule snapshots have been recorded');
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

  it('shows a not-found state for an unknown id', async () => {
    const fixture = setup(() => of({ data: null, meta: META }));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mission not found');
  });

  it('shows an error state when loading fails', async () => {
    const fixture = setup(() => throwError(() => new Error('network')));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
  });
});
