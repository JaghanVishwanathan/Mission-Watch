import { LiveMissionConfig } from './live.models';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE MISSION CONTROL: EDIT THIS FILE BEFORE EACH LAUNCH                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Every embed link used by the /live page lives here and nowhere else.
 * Before a launch, update:
 *   1. `video` for Everyday Astronaut and NASASpaceflight. Paste the YouTube
 *      URL, the 11-character video ID, or YouTube's whole <iframe> embed code.
 *   2. `broadcastUrl` for SpaceX: the x.com/i/broadcasts/… link, or X's whole
 *      <blockquote class="twitter-broadcast"> embed code. Without a broadcast,
 *      `postUrl` (x.com/SpaceX/status/…) embeds a post instead.
 *   3. Optionally `launch.ll2LaunchId` to pin a specific launch. Otherwise
 *      the page follows the next upcoming launch from `nextFromProvider`.
 *
 * Empty values are fine: a panel without a link shows "Unavailable" with a
 * button that opens the broadcaster's channel instead.
 *
 * The first mission in the list is shown by default. Add more entries to get a
 * mission selector (e.g. two launches on the same day).
 */
export const LIVE_MISSIONS: LiveMissionConfig[] = [
  {
    id: 'next-spacex',
    // Leave empty to use the names from Launch Library 2.
    name: '',
    vehicle: '',
    launch: {
      ll2LaunchId: '',
      nextFromProvider: 'SpaceX',
      fallbackT0: '',
    },
    streams: [
      {
        platform: 'youtube',
        id: 'everyday-astronaut',
        broadcaster: 'Everyday Astronaut',
        video: '',
        channelUrl: 'https://www.youtube.com/@EverydayAstronaut/live',
      },
      {
        platform: 'youtube',
        id: 'nasaspaceflight',
        broadcaster: 'NASASpaceflight',
        video: 'https://www.youtube.com/embed/KwOyWO98vGI',
        channelUrl: 'https://www.youtube.com/@NASASpaceflight/live',
      },
      {
        platform: 'x',
        id: 'spacex',
        broadcaster: 'SpaceX',
        postUrl: '',
        broadcastUrl: 'https://x.com/i/broadcasts/1yKAPwdemygxb',
        profileUrl: 'https://x.com/SpaceX',
      },
    ],
    // Leave empty to use the Launch Library 2 timeline. Example override:
    // events: [
    //   { id: 'liftoff', title: 'Liftoff', offsetSeconds: 0 },
    //   { id: 'meco', title: 'Main engine cutoff', offsetSeconds: 150 },
    //   { id: 'landing', title: 'Booster landing', offsetSeconds: 480, actualAt: '2026-10-14T12:08:05Z' },
    // ],
    events: [],
  },
];
