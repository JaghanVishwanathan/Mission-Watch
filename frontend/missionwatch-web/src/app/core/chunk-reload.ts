import { NavigationError } from '@angular/router';

/**
 * Recovers from stale code after a deploy. Each deploy replaces the hashed JavaScript files, so a
 * tab opened earlier (or an index.html still in the browser or CDN cache) can ask for files that
 * no longer exist. Loading a page then fails with a 404 and the click appears to do nothing.
 * Reloading at the target URL fetches the current version. One reload per URL per minute, so a
 * real outage cannot cause a reload loop.
 */

const RELOAD_KEY = 'mw-chunk-reload';
const RELOAD_WINDOW_MS = 60_000;

const CHUNK_ERRORS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return CHUNK_ERRORS.some((pattern) => pattern.test(text));
}

export interface ReloadDeps {
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined;
  now: () => number;
  /** Full page navigation to an absolute URL. */
  assign: (url: string) => void;
  baseUri: string;
}

/** Returns true when a reload was started. */
export function reloadOnChunkError(event: NavigationError, deps: ReloadDeps): boolean {
  if (!isChunkLoadError(event.error)) return false;
  const target = new URL(event.url.replace(/^\//, ''), deps.baseUri).href;
  try {
    const last = JSON.parse(deps.storage?.getItem(RELOAD_KEY) ?? 'null') as {
      url: string;
      at: number;
    } | null;
    if (last && last.url === target && deps.now() - last.at < RELOAD_WINDOW_MS) return false;
    deps.storage?.setItem(RELOAD_KEY, JSON.stringify({ url: target, at: deps.now() }));
  } catch {
    // Storage unavailable: reload anyway; the browser cache makes a loop very unlikely.
  }
  deps.assign(target);
  return true;
}

/** For withNavigationErrorHandler in app.config.ts. */
export function handleNavigationError(event: NavigationError): void {
  let storage: Storage | undefined;
  try {
    storage = sessionStorage;
  } catch {
    storage = undefined;
  }
  reloadOnChunkError(event, {
    storage,
    now: () => Date.now(),
    assign: (url) => location.assign(url),
    baseUri: document.baseURI,
  });
}
