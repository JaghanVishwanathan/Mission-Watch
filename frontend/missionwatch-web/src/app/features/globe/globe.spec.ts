import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { LAUNCH_DATA, LaunchDataSource } from '../../core/data';
import { DataResponse, Launch } from '../../core/models';
import { makeLaunch } from '../../core/testing/fixtures';
import { Globe } from './globe';
import {
  GLOBE_RENDERER,
  GlobeMarker,
  GlobePath,
  GlobeRenderer,
  GlobeTarget,
} from './globe-renderer';

const META = { source: 'Test', lastRefresh: new Date().toISOString(), warnings: [], isMock: false };

class FakeRenderer implements GlobeRenderer {
  markers: GlobeMarker[] = [];
  paths: (GlobePath | null)[] = [];
  focuses: { target: GlobeTarget; animate: boolean }[] = [];
  select?: (id: string) => void;
  destroyed = false;
  constructor(private readonly fail = false) {}
  init(): Promise<void> {
    return this.fail ? Promise.reject(new Error('no WebGL')) : Promise.resolve();
  }
  setMarkers(m: GlobeMarker[]): void {
    this.markers = m;
  }
  setPath(p: GlobePath | null): void {
    this.paths.push(p);
  }
  focus(target: GlobeTarget, animate: boolean): void {
    this.focuses.push({ target, animate });
  }
  onSelect(handler: (id: string) => void): void {
    this.select = handler;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

const cape = {
  id: 'cape',
  name: 'SLC-40',
  location: 'Cape Canaveral',
  latitude: 28.56,
  longitude: -80.58,
};
const vandenberg = {
  id: 'vsfb',
  name: 'SLC-4E',
  location: 'Vandenberg',
  latitude: 34.63,
  longitude: -120.61,
};

const starlink = makeLaunch({
  id: 'starlink',
  missionName: 'Starlink Group 1',
  site: cape,
  scheduledTime: '2026-12-01T10:00:00Z',
  payload: { orbit: 'Low Earth Orbit' },
});
const gps = makeLaunch({
  id: 'gps',
  missionName: 'GPS III',
  site: cape,
  scheduledTime: '2026-12-03T10:00:00Z',
});
const sentinel = makeLaunch({
  id: 'sentinel',
  missionName: 'Sentinel',
  site: vandenberg,
  scheduledTime: '2026-12-02T10:00:00Z',
  payload: { orbit: 'Sun-Synchronous Orbit' },
});
const starlinkFull: Launch = {
  ...starlink,
  milestones: [
    { id: 'm1', name: 'Liftoff', offsetSeconds: 0, estimated: false },
    { id: 'm0', name: 'Prop load', offsetSeconds: -2280, estimated: false },
    { id: 'm2', name: 'SECO-1', offsetSeconds: 519, estimated: false },
  ],
};

async function setup(url: string, renderer = new FakeRenderer()) {
  const data: Partial<LaunchDataSource> = {
    getUpcoming: () => of<DataResponse<Launch[]>>({ data: [starlink, gps, sentinel], meta: META }),
    getPrevious: () => of<DataResponse<Launch[]>>({ data: [], meta: META }),
    getLaunch: (id: string) =>
      of<DataResponse<Launch | null>>({
        data:
          id === 'starlink'
            ? starlinkFull
            : ([starlink, gps, sentinel].find((l) => l.id === id) ?? null),
        meta: META,
      }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'globe', component: Globe }], withComponentInputBinding()),
      { provide: LAUNCH_DATA, useValue: data },
      { provide: GLOBE_RENDERER, useValue: () => Promise.resolve(renderer) },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return {
    harness,
    renderer,
    el: harness.routeNativeElement as HTMLElement,
    router: TestBed.inject(Router),
  };
}

const buttons = (el: HTMLElement, selector: string) => [
  ...el.querySelectorAll<HTMLButtonElement>(selector),
];

describe('Globe', () => {
  it('lists launch sites and sends them to the globe as markers', async () => {
    const { el, renderer } = await setup('/globe');
    expect(
      buttons(el, 'button.site').map((b) => b.querySelector('.site-name')?.textContent),
    ).toEqual(['SLC-40', 'SLC-4E']);
    expect(renderer.markers.map((m) => [m.id, m.count])).toEqual([
      ['cape', 2],
      ['vsfb', 1],
    ]);
    // Starts with the whole world in view.
    expect(renderer.focuses.at(-1)?.target.heightKm).toBeGreaterThan(10_000);
  });

  it('selecting a site from the globe or the list shows its launches and focuses it', async () => {
    const { el, renderer, harness } = await setup('/globe');
    renderer.select!('cape');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(buttons(el, 'button.launch').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Starlink Group 1'),
      expect.stringContaining('GPS III'),
    ]);
    expect(renderer.markers.find((m) => m.id === 'cape')?.selected).toBe(true);
    expect(renderer.focuses.at(-1)?.target).toMatchObject({ latitude: 28.56, longitude: -80.58 });
  });

  it('selecting a launch puts it in the URL and shows its card and illustrative path', async () => {
    const { el, harness, router, renderer } = await setup('/globe');
    buttons(el, 'button.site')[1].click();
    harness.detectChanges();
    buttons(el, 'button.launch')[0].click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(router.url).toBe('/globe?launch=sentinel');
    expect(el.querySelector('#sel-title')?.textContent).toContain('Sentinel');
    expect(el.textContent).toContain('Illustrative path, not a computed trajectory');
    expect(renderer.paths.at(-1)?.label).toContain('Illustrative');
  });

  it('story mode steps through the mission milestones and moves the marker along the path', async () => {
    const { el, harness, renderer } = await setup('/globe?launch=starlink&story=1');
    const steps = () => buttons(el, 'button.step');
    expect(steps().map((b) => b.querySelector('.step-title')?.textContent)).toEqual([
      'Prop load',
      'Liftoff',
      'SECO-1',
    ]);
    expect(renderer.paths.at(-1)?.progress).toBe(0);

    steps()[2].click();
    harness.detectChanges();
    expect(renderer.paths.at(-1)?.progress).toBe(1);
    expect(el.textContent).toContain('Step 3 of 3');

    const panel = el.querySelector<HTMLElement>('.story')!;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    harness.detectChanges();
    expect(el.textContent).toContain('Step 2 of 3');
    expect(steps()[1].getAttribute('aria-current')).toBe('step');
  });

  it('keeps the list usable when the 3D globe cannot start', async () => {
    const { el } = await setup('/globe', new FakeRenderer(true));
    expect(el.textContent).toContain('WebGL is unavailable');
    expect(buttons(el, 'button.site').length).toBe(2);
  });

  it('filters sites by text', async () => {
    const { el } = await setup('/globe?q=sentinel');
    expect(
      buttons(el, 'button.site').map((b) => b.querySelector('.site-name')?.textContent),
    ).toEqual(['SLC-4E']);
  });
});
