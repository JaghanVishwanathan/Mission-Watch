/**
 * The subset of Launch Library 2 (v2.3.0) response fields MissionWatch reads.
 * Everything is optional-by-default in practice; the mapper validates before use.
 * Docs: https://ll.thespacedevs.com/docs/
 */

export interface Ll2Page<T> {
  count: number;
  next: string | null;
  results: T[];
}

export interface Ll2Named {
  id: number;
  name: string;
  abbrev?: string;
  description?: string;
}

export interface Ll2Country {
  name?: string;
  alpha_2_code?: string;
}

export interface Ll2Image {
  image_url?: string | null;
  thumbnail_url?: string | null;
  credit?: string | null;
  license?: { name?: string; link?: string | null } | null;
}

export interface Ll2Agency {
  id: number;
  name: string;
  abbrev?: string | null;
  type?: { name?: string } | null;
  country?: Ll2Country[] | null;
}

export interface Ll2LauncherConfig {
  id: number;
  name: string;
  full_name?: string | null;
  variant?: string | null;
  families?: { name: string }[] | null;
  reusable?: boolean | null;
  length?: number | null;
  diameter?: number | null;
  leo_capacity?: number | null;
  max_stage?: number | null;
}

export interface Ll2Pad {
  id: number;
  name: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  country?: Ll2Country | null;
  location?: { name?: string; country?: Ll2Country | null } | null;
}

export interface Ll2Link {
  title?: string | null;
  url: string;
  source?: string | null;
  publisher?: string | null;
  priority?: number | null;
}

export interface Ll2Mission {
  name?: string | null;
  type?: string | null;
  description?: string | null;
  orbit?: { name?: string | null; celestial_body?: { name?: string } | null } | null;
  agencies?: { name: string }[] | null;
  info_urls?: Ll2Link[] | null;
  vid_urls?: Ll2Link[] | null;
}

export interface Ll2TimelineEvent {
  type?: { id: number; abbrev?: string; description?: string } | null;
  relative_time?: string | null;
}

export interface Ll2Update {
  id: number;
  comment?: string | null;
  info_url?: string | null;
  created_by?: string | null;
  created_on?: string | null;
}

export interface Ll2Launch {
  id: string;
  name: string;
  status?: Ll2Named | null;
  last_updated?: string | null;
  net?: string | null;
  net_precision?: Ll2Named | null;
  window_start?: string | null;
  window_end?: string | null;
  image?: Ll2Image | null;
  launch_service_provider?: Ll2Agency | null;
  rocket?: { configuration?: Ll2LauncherConfig | null } | null;
  mission?: Ll2Mission | null;
  pad?: Ll2Pad | null;
  // Detailed mode only:
  info_urls?: Ll2Link[] | null;
  vid_urls?: Ll2Link[] | null;
  timeline?: Ll2TimelineEvent[] | null;
  updates?: Ll2Update[] | null;
  flightclub_url?: string | null;
}
