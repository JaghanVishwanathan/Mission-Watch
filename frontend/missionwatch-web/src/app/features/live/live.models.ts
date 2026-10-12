/**
 * Types for Live Mission Control (MW-FEAT-LIVE-001). The values themselves live in
 * `live-mission.config.ts`, the single file to edit before each launch.
 */

/** A YouTube broadcast panel (Everyday Astronaut, NASASpaceflight…). */
export interface YoutubeStreamConfig {
  platform: 'youtube';
  /** Stable key, used for the audio selector and chat switcher. */
  id: string;
  /** Broadcaster shown on the panel for attribution (FR-013). */
  broadcaster: string;
  /**
   * The livestream's video ID, or any YouTube URL that contains it
   * (watch?v=…, youtu.be/…, /live/…). Leave empty when no stream is announced yet.
   */
  video: string;
  /** Opened when the stream cannot be played inline, e.g. https://www.youtube.com/@Channel/live */
  channelUrl: string;
  /** Optional ISO-8601 start time. Before it, the panel shows SCHEDULED. */
  scheduledStart?: string;
}

/** The official SpaceX broadcast on X. */
export interface XStreamConfig {
  platform: 'x';
  id: string;
  broadcaster: string;
  /** Live broadcast, x.com/i/broadcasts/… or X's embed code. Embedded inline when set. */
  broadcastUrl?: string;
  /** Post, e.g. https://x.com/SpaceX/status/123. Embedded when there is no broadcast; its replies form the discussion. */
  postUrl: string;
  /** Opened when nothing more specific is configured. */
  profileUrl: string;
  scheduledStart?: string;
}

export type StreamConfig = YoutubeStreamConfig | XStreamConfig;

/** A manually confirmed or planned timeline event, overriding the Launch Library 2 timeline. */
export interface ConfiguredEvent {
  id: string;
  title: string;
  /** Seconds relative to liftoff (negative before). Follows schedule changes automatically. */
  offsetSeconds?: number;
  /** Absolute ISO-8601 time, for events not tied to T-0. */
  plannedAt?: string;
  /** Set only once the event is confirmed by an authoritative source. */
  actualAt?: string;
  status?: 'delayed' | 'cancelled';
}

export interface LiveMissionConfig {
  /** Used in the `?mission=` query parameter. */
  id: string;
  /** Leave empty to use the name from Launch Library 2. */
  name?: string;
  /** Leave empty to use the rocket from Launch Library 2. */
  vehicle?: string;
  /** Where countdown, status and timeline come from. */
  launch: {
    /** Launch Library 2 launch UUID (the id in /launches/<id> on this site). */
    ll2LaunchId?: string;
    /** When no ID is given, follow the provider's next upcoming launch, e.g. 'SpaceX'. */
    nextFromProvider?: string;
    /** ISO-8601 T-0 used only if launch data cannot be loaded at all. */
    fallbackT0?: string;
  };
  streams: StreamConfig[];
  /** Optional; when non-empty, replaces the Launch Library 2 timeline. */
  events?: ConfiguredEvent[];
  /** Post whose replies form the X discussion. Defaults to the X stream's post. */
  xDiscussionUrl?: string;
}

export type StreamState = 'LOADING' | 'LIVE' | 'SCHEDULED' | 'OFFLINE' | 'UNAVAILABLE' | 'UNKNOWN';

export interface StreamStatus {
  state: StreamState;
  /** Human explanation shown under the badge. */
  detail?: string;
}

export type TimelineEventStatus =
  'planned' | 'imminent' | 'completed' | 'delayed' | 'cancelled' | 'unknown';

/** SRS §4.2 event data model. */
export interface TimelineEvent {
  id: string;
  missionId: string;
  title: string;
  description?: string;
  plannedAt: string | null;
  actualAt: string | null;
  status: TimelineEventStatus;
  source: string;
  updatedAt: string;
  offsetSeconds?: number;
}
