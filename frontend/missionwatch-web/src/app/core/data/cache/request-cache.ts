import { Injectable } from '@angular/core';
import { catchError, defer, finalize, map, Observable, of, shareReplay, throwError } from 'rxjs';
import { DataSourceError, toDataSourceError } from '../errors';

export interface CachePolicy {
  /** Serve from cache without a request while younger than this. */
  ttlMs: number;
  /** If a refresh fails, cached data up to this age is served (flagged stale) instead of an error. */
  maxStaleMs: number;
  /** Source name used in error messages. */
  source: string;
}

export interface CachedResult<T> {
  value: T;
  /** When the value was fetched from the source (ISO). */
  fetchedAt: string;
  fromCache: boolean;
  stale: boolean;
  /** The refresh failure, when stale data is being served. */
  error?: DataSourceError;
}

interface Entry {
  value: unknown;
  storedAt: number;
}

const PREFIX = 'mw:cache:v1:';

/**
 * Browser-side cache for external API responses (SRS §8.3, NFR-02). Keeps upstream
 * rate limits in mind: fresh entries never trigger a request, concurrent callers share
 * one in-flight request, and failures fall back to stale data when available.
 * Persisted in localStorage when possible; always mirrored in memory.
 */
@Injectable({ providedIn: 'root' })
export class RequestCache {
  private readonly memory = new Map<string, Entry>();
  private readonly inflight = new Map<string, Observable<CachedResult<unknown>>>();

  /** Clock, overridable in tests. */
  now: () => number = () => Date.now();

  get<T>(key: string, policy: CachePolicy, load: () => Observable<T>): Observable<CachedResult<T>> {
    return defer(() => {
      const entry = this.read(key);
      const age = entry ? this.now() - entry.storedAt : Infinity;
      if (entry && age < policy.ttlMs) {
        return of(this.result<T>(entry, true, false));
      }

      const pending = this.inflight.get(key);
      if (pending) return pending as Observable<CachedResult<T>>;

      const request = load().pipe(
        map((value) => {
          const fresh = { value, storedAt: this.now() };
          this.write(key, fresh);
          return this.result<T>(fresh, false, false);
        }),
        catchError((err: unknown) => {
          const error = toDataSourceError(err, policy.source);
          if (entry && age < policy.maxStaleMs) return of(this.result<T>(entry, true, true, error));
          return throwError(() => error);
        }),
        finalize(() => this.inflight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.inflight.set(key, request);
      return request;
    });
  }

  /** Synchronous peek used to show a summary while a fuller record loads. */
  peek<T>(key: string): { value: T; fetchedAt: string } | undefined {
    const entry = this.read(key);
    return entry
      ? { value: entry.value as T, fetchedAt: new Date(entry.storedAt).toISOString() }
      : undefined;
  }

  private result<T>(
    entry: Entry,
    fromCache: boolean,
    stale: boolean,
    error?: DataSourceError,
  ): CachedResult<T> {
    return {
      value: entry.value as T,
      fetchedAt: new Date(entry.storedAt).toISOString(),
      fromCache,
      stale,
      error,
    };
  }

  private read(key: string): Entry | undefined {
    const inMemory = this.memory.get(key);
    if (inMemory) return inMemory;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Entry;
      if (typeof parsed?.storedAt !== 'number') return undefined;
      this.memory.set(key, parsed);
      return parsed;
    } catch {
      return undefined;
    }
  }

  private write(key: string, entry: Entry): void {
    this.memory.set(key, entry);
    const serialised = JSON.stringify(entry);
    try {
      localStorage.setItem(PREFIX + key, serialised);
    } catch {
      // Quota exceeded or storage blocked: drop our older entries and try once more.
      try {
        this.evictOldest();
        localStorage.setItem(PREFIX + key, serialised);
      } catch {
        // Memory-only for this session.
      }
    }
  }

  private evictOldest(): void {
    const ours: { key: string; storedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        ours.push({
          key,
          storedAt: (JSON.parse(localStorage.getItem(key) ?? '{}') as Entry).storedAt ?? 0,
        });
      } catch {
        ours.push({ key, storedAt: 0 });
      }
    }
    ours.sort((a, b) => a.storedAt - b.storedAt);
    for (const { key } of ours.slice(0, Math.ceil(ours.length / 2))) localStorage.removeItem(key);
  }
}
