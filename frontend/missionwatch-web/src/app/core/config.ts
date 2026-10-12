/** External endpoints. All are public, keyless and CORS-enabled; no secrets live in the frontend. */
export const LL2_BASE_URL = 'https://ll.thespacedevs.com/2.3.0';
export const NASA_IMAGES_URL = 'https://images-api.nasa.gov';

/** Build-time GCAT snapshot, relative to the base href so it works under a GitHub Pages subpath. */
export const HISTORY_SNAPSHOT_URL = 'data/launch-history.json';

/** How many launches each list request fetches. Search and filters run over these locally. */
export const LL2_LIST_LIMIT = 40;

const MINUTE = 60_000;

/** LL2 allows ~15 anonymous requests per hour per visitor, so cache generously. */
export const CACHE_POLICY = {
  lists: { ttlMs: 15 * MINUTE, maxStaleMs: 7 * 24 * 60 * MINUTE },
  detail: { ttlMs: 30 * MINUTE, maxStaleMs: 7 * 24 * 60 * MINUTE },
  media: { ttlMs: 24 * 60 * MINUTE, maxStaleMs: 30 * 24 * 60 * MINUTE },
} as const;
