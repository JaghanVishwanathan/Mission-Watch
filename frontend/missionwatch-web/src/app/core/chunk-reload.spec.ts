import { NavigationError } from '@angular/router';
import { isChunkLoadError, ReloadDeps, reloadOnChunkError } from './chunk-reload';

function deps(now = 1_000_000) {
  const store = new Map<string, string>();
  const assigned: string[] = [];
  const d: ReloadDeps & { assigned: string[]; clock: { now: number } } = {
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    clock: { now },
    now: () => d.clock.now,
    assign: (url) => assigned.push(url),
    baseUri: 'https://missionwatch.jaghan.com/',
    assigned,
  };
  return d;
}

const failed = (url: string) =>
  new NavigationError(
    1,
    url,
    new TypeError(
      'Failed to fetch dynamically imported module: https://missionwatch.jaghan.com/chunk-OLD.js',
    ),
  );

describe('chunk reload', () => {
  it('recognises chunk load failures from the major browsers', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: x'))).toBe(
      true,
    );
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Something else'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it('reloads once at the target URL, then not again within a minute', () => {
    const d = deps();
    expect(reloadOnChunkError(failed('/launches/abc'), d)).toBe(true);
    expect(d.assigned).toEqual(['https://missionwatch.jaghan.com/launches/abc']);

    expect(reloadOnChunkError(failed('/launches/abc'), d)).toBe(false);
    d.clock.now += 61_000;
    expect(reloadOnChunkError(failed('/launches/abc'), d)).toBe(true);
  });

  it('ignores other navigation errors', () => {
    const d = deps();
    expect(reloadOnChunkError(new NavigationError(1, '/x', new Error('guard failed')), d)).toBe(
      false,
    );
    expect(d.assigned).toEqual([]);
  });

  it('respects a sub-path base href', () => {
    const d = { ...deps(), baseUri: 'https://user.github.io/Mission-Watch/' };
    reloadOnChunkError(failed('/globe?launch=1'), d);
    expect(d.assigned.at(-1)).toBe('https://user.github.io/Mission-Watch/globe?launch=1');
  });
});
