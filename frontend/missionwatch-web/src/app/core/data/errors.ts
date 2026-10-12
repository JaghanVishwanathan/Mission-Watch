import { HttpErrorResponse } from '@angular/common/http';

export type DataErrorKind =
  'rate-limit' | 'network' | 'not-found' | 'invalid-response' | 'unavailable';

/** A normalised failure from any external source, safe to show to users via describeError(). */
export class DataSourceError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    readonly source: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

/** LL2 reports throttling as e.g. "Request was throttled. Expected available in 1234 seconds." */
function retryAfterFrom(error: HttpErrorResponse): number | undefined {
  const header = Number(error.headers?.get('Retry-After'));
  if (Number.isFinite(header) && header > 0) return header;
  const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
  const match = /available in (\d+) second/.exec(detail);
  return match ? Number(match[1]) : undefined;
}

export function toDataSourceError(error: unknown, source: string): DataSourceError {
  if (error instanceof DataSourceError) return error;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 429) {
      return new DataSourceError(
        'rate-limit',
        source,
        `${source} rate limit reached`,
        retryAfterFrom(error),
      );
    }
    if (error.status === 0)
      return new DataSourceError('network', source, `${source} could not be reached`);
    if (error.status === 404)
      return new DataSourceError('not-found', source, `${source}: not found`);
    return new DataSourceError('unavailable', source, `${source} returned HTTP ${error.status}`);
  }
  return new DataSourceError(
    'unavailable',
    source,
    error instanceof Error ? error.message : String(error),
  );
}

/** User-facing explanation for an error state. */
export function describeError(error: unknown): string {
  if (!(error instanceof DataSourceError))
    return 'The data could not be loaded. Check your connection and try again.';
  switch (error.kind) {
    case 'rate-limit': {
      const minutes = error.retryAfterSeconds
        ? Math.max(1, Math.ceil(error.retryAfterSeconds / 60))
        : undefined;
      return `${error.source} limits free access to a small number of requests per hour, and that limit has been reached.${
        minutes
          ? ` Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
          : ' Try again later.'
      }`;
    }
    case 'network':
      return `${error.source} could not be reached. Check your connection and try again.`;
    case 'not-found':
      return `${error.source} has no record for this request.`;
    case 'invalid-response':
      return `${error.source} returned data MissionWatch could not read.`;
    default:
      return `${error.source} is unavailable right now. Try again later.`;
  }
}
