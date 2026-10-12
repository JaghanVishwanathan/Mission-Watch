import { LaunchSnapshot } from '../models';

export interface ScheduleChange extends LaunchSnapshot {
  /** Shift relative to the previous observation in ms; null for the first observation. */
  deltaMs: number | null;
  statusChanged: boolean;
  isOriginal: boolean;
  isLatest: boolean;
}

/**
 * Orders snapshots by observation time and annotates each with how it differs from the
 * previous one. Describes *what* changed only — causes are never inferred (FR-07).
 */
export function scheduleChanges(
  snapshots: readonly LaunchSnapshot[] | undefined,
): ScheduleChange[] {
  if (!snapshots?.length) return [];
  const ordered = [...snapshots].sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  return ordered.map((snap, i) => {
    const prev = ordered[i - 1];
    return {
      ...snap,
      deltaMs: prev ? Date.parse(snap.scheduledTime) - Date.parse(prev.scheduledTime) : null,
      statusChanged: prev ? prev.status !== snap.status : false,
      isOriginal: i === 0,
      isLatest: i === ordered.length - 1,
    };
  });
}

/** "+2d 4h", "-6h", "No change". */
export function formatShift(deltaMs: number | null): string {
  if (deltaMs === null) return 'First observation';
  if (deltaMs === 0) return 'No change';
  const sign = deltaMs > 0 ? '+' : '−';
  const totalHours = Math.round(Math.abs(deltaMs) / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const parts = [days ? `${days}d` : '', hours ? `${hours}h` : ''].filter(Boolean);
  return `${sign}${parts.join(' ') || '<1h'}`;
}
