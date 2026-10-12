/**
 * Formats a NET (no earlier than) time at the precision the source actually knows,
 * so "Month"-precision launches never show an invented hour and minute.
 * Times are shown in the viewer's local timezone (SRS §5.7).
 */
export function formatLaunchTime(iso: string, precision?: string, locale?: string): string {
  const date = new Date(iso);
  const fmt = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(date);
  const day = () => fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const p = precision?.toLowerCase() ?? '';

  if (!p || p === 'second' || p === 'minute') {
    return fmt({
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (p === 'hour') return `${day()}, around ${fmt({ hour: '2-digit', minute: '2-digit' })}`;
  if (p === 'morning' || p === 'afternoon') return `${day()} (${p})`;
  if (p === 'day') return day();
  if (p === 'week') return `Week of ${fmt({ day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (p === 'month') return fmt({ month: 'long', year: 'numeric' });
  return `${fmt({ month: 'long', year: 'numeric' })} or later (${precision})`;
}

/** Short, human description of a non-exact precision for badges, e.g. "Date: month". */
export function precisionLabel(precision?: string): string | undefined {
  if (!precision) return undefined;
  const p = precision.toLowerCase();
  if (p === 'second' || p === 'minute') return undefined;
  return `Time known to the ${p.startsWith('quarter') || p.startsWith('half') || p.includes('year') ? 'period' : p}`;
}
