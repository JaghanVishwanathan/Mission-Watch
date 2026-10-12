/**
 * Viewer-arranged stream positions. Position 0 is the main tile. Players are never moved
 * in the DOM (that would reload their iframes); each card is placed with a CSS grid area.
 */

export type LayoutMode = 'focus' | 'grid';

/** Grid area for each position; extra streams beyond these flow automatically. */
const AREAS = ['main', 'side1', 'side2'];

export interface SavedLayout {
  mode?: LayoutMode;
  order?: string[];
  chatOpen?: boolean;
}

const STORAGE_KEY = 'mw-live-layout';

/** Per-viewer convenience only, so storage failures fall back to defaults. */
export function readLayout(): SavedLayout {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLayout(layout: SavedLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable: the arrangement lasts for this visit only.
  }
}

/**
 * Saved order first (dropping IDs no longer configured), then the rest. Without a saved
 * order, streams that have a link come first so the main tile is not an empty panel.
 */
export function initialOrder(ids: string[], playable: Set<string>, saved?: string[]): string[] {
  const kept = (Array.isArray(saved) ? saved : []).filter(
    (id, i, all) => ids.includes(id) && all.indexOf(id) === i,
  );
  const rest = ids.filter((id) => !kept.includes(id));
  if (!kept.length) rest.sort((a, b) => Number(playable.has(b)) - Number(playable.has(a)));
  return [...kept, ...rest];
}

/** Swaps the stream into position 0. */
export function makeMain(order: string[], id: string): string[] {
  return swap(order, order.indexOf(id), 0);
}

/** Moves a stream one position earlier (-1) or later (+1). */
export function move(order: string[], id: string, delta: -1 | 1): string[] {
  const i = order.indexOf(id);
  return swap(order, i, i + delta);
}

export function areaOf(order: string[], id: string): string {
  return AREAS[order.indexOf(id)] ?? 'auto';
}

function swap(order: string[], a: number, b: number): string[] {
  if (a < 0 || b < 0 || a >= order.length || b >= order.length || a === b) return order;
  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
