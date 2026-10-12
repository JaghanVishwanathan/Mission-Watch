const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "in 3 days", "2 hours ago", "now". */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

export interface CountdownParts {
  sign: 'T-' | 'T+';
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownParts(targetIso: string, now = Date.now()): CountdownParts {
  const diff = Date.parse(targetIso) - now;
  let s = Math.floor(Math.abs(diff) / 1000);
  const days = Math.floor(s / 86_400);
  s -= days * 86_400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { sign: diff >= 0 ? 'T-' : 'T+', days, hours, minutes, seconds: s - minutes * 60 };
}

/** Formats a T± offset in seconds, e.g. 154 → "T+02:34", -2100 → "T-35:00". */
export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? 'T-' : 'T+';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${sign}${h}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`;
}
