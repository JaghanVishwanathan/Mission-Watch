import { LIVE_MISSIONS } from './live-mission.config';
import {
  buildTimeline,
  coverageOf,
  parseXBroadcastId,
  parseXPostId,
  parseYoutubeId,
  safeHttpsUrl,
} from './live-util';

describe('parseYoutubeId', () => {
  it('accepts bare IDs and common URL shapes', () => {
    expect(parseYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://www.youtube.com/live/dQw4w9WgXcQ?si=x')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects empty values and other hosts', () => {
    expect(parseYoutubeId('')).toBeUndefined();
    expect(parseYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(parseYoutubeId('https://www.youtube.com/@NASASpaceflight/live')).toBeUndefined();
  });
});

describe('parseXPostId', () => {
  it('extracts status IDs from x.com and twitter.com', () => {
    expect(parseXPostId('https://x.com/SpaceX/status/1845000000000000000')).toBe(
      '1845000000000000000',
    );
    expect(parseXPostId('https://twitter.com/SpaceX/status/123?s=20')).toBe('123');
  });

  it('rejects broadcasts, profiles and other hosts', () => {
    expect(parseXPostId('https://x.com/i/broadcasts/1abc')).toBeUndefined();
    expect(parseXPostId('https://x.com/SpaceX')).toBeUndefined();
    expect(parseXPostId('https://evil.com/SpaceX/status/123')).toBeUndefined();
  });
});

describe('pasted embed codes', () => {
  it('reads the video ID from a YouTube iframe snippet', () => {
    const iframe =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/KwOyWO98vGI?si=c4LswoqdRQ1P2UoI" title="YouTube video player" allowfullscreen></iframe>';
    expect(parseYoutubeId(iframe)).toBe('KwOyWO98vGI');
  });

  it('reads the broadcast ID from an X broadcast snippet or URL', () => {
    const quote =
      '<blockquote class="twitter-broadcast" data-broadcast-id="1yKAPwdemygxb"><a href="https://x.com/i/broadcasts/1yKAPwdemygxb">Broadcast</a></blockquote> <script async src="https://platform.x.com/widgets.js" charset="utf-8"></script>';
    expect(parseXBroadcastId(quote)).toBe('1yKAPwdemygxb');
    expect(parseXBroadcastId('https://x.com/i/broadcasts/1yKAPwdemygxb')).toBe('1yKAPwdemygxb');
    expect(parseXBroadcastId('https://x.com/SpaceX/status/123')).toBeUndefined();
    expect(safeHttpsUrl(quote)).toBe('https://x.com/i/broadcasts/1yKAPwdemygxb');
  });
});

describe('safeHttpsUrl', () => {
  it('only allows https', () => {
    expect(safeHttpsUrl('https://x.com/SpaceX')).toBe('https://x.com/SpaceX');
    expect(safeHttpsUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpsUrl('')).toBeUndefined();
  });
});

describe('buildTimeline', () => {
  const t0 = '2026-10-14T12:00:00.000Z';
  const base = {
    missionId: 'm',
    t0,
    source: 'LL2',
    updatedAt: '2026-10-14T11:00:00.000Z',
  };
  const milestones = [
    { id: 'meco', name: 'MECO', offsetSeconds: 150, estimated: false },
    { id: 'go', name: 'Go for launch', offsetSeconds: -2100, estimated: false },
  ];

  it('derives planned times from T-0 and adds liftoff', () => {
    const events = buildTimeline({ ...base, milestones, now: Date.parse(t0) - 3_600_000 });
    expect(events.map((e) => e.title)).toEqual(['Go for launch', 'Liftoff', 'MECO']);
    expect(events[2].plannedAt).toBe('2026-10-14T12:02:30.000Z');
    expect(events.every((e) => e.status === 'planned')).toBe(true);
  });

  it('never marks past-due events completed without confirmation', () => {
    const events = buildTimeline({ ...base, milestones, now: Date.parse(t0) + 600_000 });
    expect(events.some((e) => e.status === 'completed')).toBe(false);
    expect(events.every((e) => e.actualAt === null)).toBe(true);
    expect(events[0].status).toBe('unknown');
  });

  it('confirms liftoff only from launch status', () => {
    const events = buildTimeline({
      ...base,
      milestones,
      launchStatus: 'in-flight',
      now: Date.parse(t0) + 600_000,
    });
    const liftoff = events.find((e) => e.title === 'Liftoff')!;
    expect(liftoff.status).toBe('completed');
    expect(liftoff.actualAt).toBe(t0);
    expect(events.find((e) => e.title === 'MECO')!.status).toBe('unknown');
  });

  it('flags imminent events and follows schedule changes', () => {
    const now = Date.parse(t0) - 5 * 60_000;
    expect(buildTimeline({ ...base, now }).find((e) => e.title === 'Liftoff')!.status).toBe(
      'imminent',
    );
    const slipped = buildTimeline({ ...base, t0: '2026-10-15T12:00:00.000Z', now });
    expect(slipped[0].plannedAt).toBe('2026-10-15T12:00:00.000Z');
    expect(slipped[0].status).toBe('planned');
  });

  it('marks post-T-0 events delayed during a hold', () => {
    const events = buildTimeline({ ...base, milestones, launchStatus: 'hold', now: 0 });
    expect(events.find((e) => e.title === 'Liftoff')!.status).toBe('delayed');
    expect(events.find((e) => e.title === 'Go for launch')!.status).toBe('planned');
  });

  it('uses configured events instead of the source timeline', () => {
    const events = buildTimeline({
      ...base,
      milestones,
      configured: [
        { id: 'a', title: 'Landing', offsetSeconds: 480, actualAt: '2026-10-14T12:08:05Z' },
        { id: 'b', title: 'Deploy', offsetSeconds: 3600, status: 'cancelled' },
      ],
      now: 0,
    });
    expect(events.map((e) => [e.title, e.status])).toEqual([
      ['Landing', 'completed'],
      ['Deploy', 'cancelled'],
    ]);
  });

  it('handles an unknown T-0', () => {
    const [liftoff] = buildTimeline({ ...base, t0: undefined, now: 0 });
    expect(liftoff.plannedAt).toBeNull();
    expect(liftoff.status).toBe('unknown');
  });
});

describe('coverageOf', () => {
  it('summarises stream states', () => {
    expect(coverageOf(['UNKNOWN', 'LIVE'])).toBe('live');
    expect(coverageOf(['SCHEDULED', 'UNKNOWN'])).toBe('scheduled');
    expect(coverageOf(['UNAVAILABLE', 'OFFLINE'])).toBe('none');
    expect(coverageOf(['LOADING', 'UNAVAILABLE'])).toBe('unverified');
  });
});

describe('LIVE_MISSIONS config', () => {
  it('has unique mission and stream IDs and valid links', () => {
    expect(LIVE_MISSIONS.length).toBeGreaterThan(0);
    expect(new Set(LIVE_MISSIONS.map((m) => m.id)).size).toBe(LIVE_MISSIONS.length);
    for (const m of LIVE_MISSIONS) {
      expect(new Set(m.streams.map((s) => s.id)).size).toBe(m.streams.length);
      for (const s of m.streams) {
        if (s.platform === 'youtube') {
          if (s.video) expect(parseYoutubeId(s.video)).toBeDefined();
          expect(safeHttpsUrl(s.channelUrl)).toBeDefined();
        } else {
          if (s.postUrl) expect(parseXPostId(s.postUrl)).toBeDefined();
          if (s.broadcastUrl) expect(parseXBroadcastId(s.broadcastUrl)).toBeDefined();
          expect(safeHttpsUrl(s.profileUrl)).toBeDefined();
        }
      }
    }
  });
});
