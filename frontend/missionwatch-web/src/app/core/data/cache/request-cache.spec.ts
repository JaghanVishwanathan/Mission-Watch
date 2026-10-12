import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { DataSourceError } from '../errors';
import { RequestCache } from './request-cache';

const POLICY = { ttlMs: 1000, maxStaleMs: 10_000, source: 'Test API' };

describe('RequestCache', () => {
  let cache: RequestCache;
  let now: number;

  beforeEach(() => {
    localStorage.clear();
    cache = TestBed.inject(RequestCache);
    now = 1_000_000;
    cache.now = () => now;
  });

  it('serves fresh entries without calling the loader again', async () => {
    let calls = 0;
    const load = () => of(++calls);
    expect((await firstValueFrom(cache.get('k', POLICY, load))).value).toBe(1);
    now += 500;
    const second = await firstValueFrom(cache.get('k', POLICY, load));
    expect(second).toMatchObject({ value: 1, fromCache: true, stale: false });
    expect(calls).toBe(1);
  });

  it('refreshes after the TTL', async () => {
    let calls = 0;
    const load = () => of(++calls);
    await firstValueFrom(cache.get('k', POLICY, load));
    now += 1500;
    expect((await firstValueFrom(cache.get('k', POLICY, load))).value).toBe(2);
  });

  it('shares one in-flight request between concurrent callers', async () => {
    let calls = 0;
    const subject = new Subject<number>();
    const load = () => {
      calls++;
      return subject;
    };
    const a = firstValueFrom(cache.get('k', POLICY, load));
    const b = firstValueFrom(cache.get('k', POLICY, load));
    subject.next(42);
    subject.complete();
    expect([(await a).value, (await b).value]).toEqual([42, 42]);
    expect(calls).toBe(1);
  });

  it('falls back to stale data on failure and reports the error', async () => {
    await firstValueFrom(cache.get('k', POLICY, () => of('old')));
    now += 5000;
    const rateLimited = new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': '120' }),
    });
    const result = await firstValueFrom(
      cache.get('k', POLICY, () => throwError(() => rateLimited)),
    );
    expect(result).toMatchObject({ value: 'old', stale: true, fromCache: true });
    expect(result.error?.kind).toBe('rate-limit');
    expect(result.error?.retryAfterSeconds).toBe(120);
  });

  it('errors when there is nothing to fall back to', async () => {
    const failing = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    await expect(firstValueFrom(cache.get('k', POLICY, failing))).rejects.toBeInstanceOf(
      DataSourceError,
    );
  });

  it('does not serve data older than the stale limit', async () => {
    await firstValueFrom(cache.get('k', POLICY, () => of('ancient')));
    now += 20_000;
    const failing = () => throwError(() => new HttpErrorResponse({ status: 500 }));
    await expect(firstValueFrom(cache.get('k', POLICY, failing))).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('persists to localStorage so a new session can reuse it', async () => {
    await firstValueFrom(cache.get('k', POLICY, () => of({ a: 1 })));
    const fresh = new RequestCache();
    fresh.now = () => now;
    let called = false;
    const result = await firstValueFrom(
      fresh.get('k', POLICY, () => {
        called = true;
        return of({ a: 2 });
      }),
    );
    expect(result.value).toEqual({ a: 1 });
    expect(called).toBe(false);
    expect(fresh.peek('k')?.value).toEqual({ a: 1 });
  });
});
