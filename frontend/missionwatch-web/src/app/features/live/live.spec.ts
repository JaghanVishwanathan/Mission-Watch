import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { DataSourceError, LAUNCH_DATA, LaunchDataSource } from '../../core/data';
import { DataResponse, Launch } from '../../core/models';
import { makeLaunch } from '../../core/testing/fixtures';
import { Live } from './live';

const META = { source: 'Test', lastRefresh: new Date().toISOString(), warnings: [], isMock: false };

function setup(
  getUpcoming: () => Observable<DataResponse<Launch[]>>,
  getLaunch: () => Observable<DataResponse<Launch | null>> = () => of({ data: null, meta: META }),
) {
  localStorage.removeItem('mw-live-consent');
  localStorage.removeItem('mw-live-layout');
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LAUNCH_DATA, useValue: { getUpcoming, getLaunch } as Partial<LaunchDataSource> },
    ],
  });
  return TestBed.createComponent(Live);
}

describe('Live', () => {
  it('shows all three broadcast panels and loads no third-party content before consent', async () => {
    const launch = makeLaunch({
      provider: { id: '1', externalId: '1', name: 'SpaceX' },
      scheduledTime: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const fixture = setup(
      () => of({ data: [launch], meta: META }),
      () => of({ data: launch, meta: META }),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const cards = el.querySelectorAll('mw-stream-card');
    expect(cards.length).toBe(3);
    expect(el.textContent).toContain('Everyday Astronaut');
    expect(el.textContent).toContain('NASASpaceflight');
    expect(el.textContent).toContain('SpaceX');
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector('mw-youtube-player')).toBeNull();
    expect(el.textContent).toContain('Load YouTube and X content');
    // Every panel offers a way to watch on the original platform.
    expect(el.querySelectorAll('mw-stream-card a.ext[target="_blank"]').length).toBe(3);
    expect(el.querySelector('h1')?.textContent).toContain(launch.missionName);
    expect(el.textContent).toContain('Liftoff');
  });

  it('keeps the dashboard and timeline when launch data fails', async () => {
    const fixture = setup(() =>
      throwError(() => new DataSourceError('network', 'Launch Library 2', 'offline')),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('mw-stream-card').length).toBe(3);
    expect(el.querySelector('mw-mission-timeline')).not.toBeNull();
    expect(el.querySelector('mw-community-panel')).not.toBeNull();
    expect(el.textContent).toContain('Target time not yet known');
  });

  it('defaults to the focus layout with floating chat, and switches to the grid', async () => {
    const fixture = setup(() => of({ data: [], meta: META }));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.streams--focus')).not.toBeNull();
    expect(el.querySelector('aside.chat-pop mw-community-panel')).not.toBeNull();
    // The configured NASASpaceflight stream has a link, so it takes the main tile.
    const area = (name: string) =>
      [...el.querySelectorAll<HTMLElement>('mw-stream-card')].find((c) =>
        c.textContent?.includes(name),
      )!.style.gridArea;
    expect(area('NASASpaceflight')).toContain('main');

    // Chat starts minimised so it never covers the side videos.
    expect(el.querySelector<HTMLElement>('aside.chat-pop')!.hidden).toBe(true);
    el.querySelector<HTMLButtonElement>('.chat-fab')!.click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLElement>('aside.chat-pop')!.hidden).toBe(false);
    el.querySelector<HTMLButtonElement>('[aria-label="Minimise community chat"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLElement>('aside.chat-pop')!.hidden).toBe(true);
    expect(el.querySelector('.chat-fab')).not.toBeNull();

    el.querySelector<HTMLButtonElement>(
      '[aria-label="Make Everyday Astronaut the main video"]',
    )!.click();
    await fixture.whenStable();
    expect(area('Everyday Astronaut')).toContain('main');
    expect(JSON.parse(localStorage.getItem('mw-live-layout')!).order[0]).toBe('everyday-astronaut');

    el.querySelector<HTMLInputElement>('input[name="layout"][value="grid"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.streams--grid .community mw-community-panel')).not.toBeNull();
    expect(el.querySelector('aside.chat-pop')).toBeNull();
  });
});
