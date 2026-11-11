import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import shipped from '../../../../public/config/live-missions.json';
import { FALLBACK_MISSION, LIVE_CONFIG_URL, loadLiveConfig, parseLiveConfig } from './live-config';

describe('public/config/live-missions.json', () => {
  // Guards every edit of the stream links: a mistake fails CI before it is deployed.
  it('is valid', () => {
    const { missions, problems } = parseLiveConfig(shipped);
    expect(problems).toEqual([]);
    expect(missions.length).toBe(shipped.missions.length);
  });
});

describe('parseLiveConfig', () => {
  const yt = {
    platform: 'youtube',
    id: 'a',
    broadcaster: 'A',
    video: 'dQw4w9WgXcQ',
    channelUrl: 'https://www.youtube.com/@a/live',
  };

  it('falls back to a stream-less mission when the file has no missions', () => {
    for (const raw of [null, {}, { missions: [] }, { missions: [{ name: 'no id' }] }]) {
      const cfg = parseLiveConfig(raw);
      expect(cfg.missions).toEqual([FALLBACK_MISSION]);
      expect(cfg.problems.length).toBeGreaterThan(0);
    }
  });

  it('skips duplicate and malformed entries but keeps the rest', () => {
    const cfg = parseLiveConfig({
      missions: [
        {
          id: 'm',
          launch: { nextFromProvider: 'SpaceX' },
          streams: [yt, { ...yt }, { platform: 'twitch', id: 't', broadcaster: 'T' }, 'junk'],
          events: [{ id: 'liftoff', title: 'Liftoff', offsetSeconds: 0 }, { id: 'x' }],
        },
        { id: 'm', launch: {}, streams: [] },
      ],
    });
    expect(cfg.missions.length).toBe(1);
    expect(cfg.missions[0].streams.map((s) => s.id)).toEqual(['a']);
    expect(cfg.missions[0].events).toEqual([{ id: 'liftoff', title: 'Liftoff', offsetSeconds: 0 }]);
    expect(cfg.problems.length).toBe(5);
  });

  it('keeps streams with invalid links, reporting them, so the panel can explain', () => {
    const cfg = parseLiveConfig({
      missions: [
        {
          id: 'm',
          launch: { fallbackT0: 'soon' },
          streams: [
            { ...yt, video: 'not a video', channelUrl: 'http://insecure' },
            {
              platform: 'x',
              id: 'x',
              broadcaster: 'X',
              postUrl: 'https://example.com/post',
              broadcastUrl: 'https://x.com/SpaceX',
              profileUrl: 'https://x.com/SpaceX',
            },
          ],
        },
      ],
    });
    expect(cfg.missions[0].streams.length).toBe(2);
    expect(cfg.missions[0].launch.fallbackT0).toBeUndefined();
    expect(cfg.problems).toHaveLength(5);
  });

  it('accepts pasted embed code', () => {
    const cfg = parseLiveConfig({
      missions: [
        {
          id: 'm',
          launch: {},
          streams: [
            {
              ...yt,
              video: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="x"></iframe>',
            },
          ],
        },
      ],
    });
    expect(cfg.problems).toEqual([]);
  });
});

describe('loadLiveConfig', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
  }

  it('fetches the file past the cache and validates it', async () => {
    const { http, ctrl } = setup();
    const result = firstValueFrom(loadLiveConfig(http, 42));
    ctrl.expectOne(`${LIVE_CONFIG_URL}?t=42`).flush(shipped);
    expect((await result).missions[0].id).toBe(shipped.missions[0].id);
  });

  it('keeps the page usable when the file cannot be loaded', async () => {
    const { http, ctrl } = setup();
    const result = firstValueFrom(loadLiveConfig(http, 1));
    ctrl.expectOne(`${LIVE_CONFIG_URL}?t=1`).flush('', { status: 404, statusText: 'Not Found' });
    const cfg = await result;
    expect(cfg.missions).toEqual([FALLBACK_MISSION]);
    expect(cfg.problems[0]).toContain('could not be loaded');
  });
});
