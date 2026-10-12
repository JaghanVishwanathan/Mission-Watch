import { HttpClient } from '@angular/common/http';
import { FactoryProvider, inject, Injectable } from '@angular/core';
import { catchError, combineLatest, concat, EMPTY, map, Observable, of, throwError } from 'rxjs';
import { CACHE_POLICY, LL2_BASE_URL, LL2_LIST_LIMIT } from '../../config';
import {
  AnalyticsFilter,
  AnalyticsOptions,
  AnalyticsSummary,
  DataMeta,
  DataResponse,
  Launch,
  LaunchQuery,
  Provider,
  UPCOMING_STATUSES,
} from '../../models';
import { applyAnalyticsFilter, computeAnalytics } from '../analytics';
import { CachedResult, RequestCache } from '../cache/request-cache';
import { DataSourceError, describeError } from '../errors';
import { HistoryRepository } from '../history/history-repository';
import { LAUNCH_DATA, LaunchDataSource } from '../launch-data-source';
import { queryLaunches } from '../launch-query';
import { mapLaunch, mapLaunchPage, MappedPage } from './ll2-mapper';
import { Ll2Launch, Ll2Page } from './ll2-types';

export const LL2_SOURCE = 'Launch Library 2';
const LL2_SOURCE_URL = 'https://thespacedevs.com/llapi';
const FEATURED_COUNT = 6;

type Settled<T> = { ok: true; result: CachedResult<T> } | { ok: false; error: DataSourceError };

/**
 * Live adapter: Launch Library 2 for launches (cached in the browser to respect its
 * anonymous rate limit) and the GCAT snapshot for historical analytics.
 * Search and filtering run locally over the cached upcoming + previous windows,
 * as SRS FR-02 requires.
 */
@Injectable()
export class LiveLaunchDataService implements LaunchDataSource {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(RequestCache);
  private readonly history = inject(HistoryRepository);

  getUpcoming(limit = 50): Observable<DataResponse<Launch[]>> {
    return this.upcoming().pipe(
      map((r) =>
        this.respond(
          queryLaunches(r.value.launches, { statuses: [...UPCOMING_STATUSES], sort: 'time' }).slice(
            0,
            limit,
          ),
          [r],
        ),
      ),
    );
  }

  getPrevious(limit = 50): Observable<DataResponse<Launch[]>> {
    return this.previous().pipe(
      map((r) =>
        this.respond(
          queryLaunches(r.value.launches, { sort: 'time', direction: 'desc' }).slice(0, limit),
          [r],
        ),
      ),
    );
  }

  /**
   * "Featured" is a presentation heuristic, not a source flag: upcoming launches that
   * are not routine constellation deployments, falling back to the next launches.
   */
  getFeatured(): Observable<DataResponse<Launch[]>> {
    return this.upcoming().pipe(
      map((r) => {
        const upcoming = queryLaunches(r.value.launches, {
          statuses: [...UPCOMING_STATUSES],
          sort: 'time',
        });
        const notable = upcoming.filter((l) => l.category && l.category !== 'communications');
        const picked = (notable.length >= 3 ? notable : upcoming).slice(0, FEATURED_COUNT);
        return this.respond(picked, [r]);
      }),
    );
  }

  search(query: LaunchQuery): Observable<DataResponse<Launch[]>> {
    return this.catalog().pipe(
      map(({ launches, meta }) => ({ data: queryLaunches(launches, query), meta })),
    );
  }

  getProviders(): Observable<DataResponse<Provider[]>> {
    return this.catalog().pipe(
      map(({ launches, meta }) => {
        const providers = new Map<string, Provider>();
        for (const l of launches) providers.set(l.provider.id, l.provider);
        return { data: [...providers.values()].sort((a, b) => a.name.localeCompare(b.name)), meta };
      }),
    );
  }

  getLaunch(id: string): Observable<DataResponse<Launch | null>> {
    const summary = this.findSummary(id);
    const summaryResponse = (extraWarning?: string): DataResponse<Launch | null> => ({
      data: summary!.launch,
      meta: {
        ...summary!.meta,
        warnings: [...summary!.meta.warnings, ...(extraWarning ? [extraWarning] : [])],
      },
    });

    const full$ = this.cache
      .get(`ll2:launch:${id}`, { ...CACHE_POLICY.detail, source: LL2_SOURCE }, () =>
        this.http
          .get<Ll2Launch>(`${LL2_BASE_URL}/launches/${encodeURIComponent(id)}/`, {
            params: { mode: 'detailed' },
          })
          .pipe(
            map((raw) => {
              const launch = mapLaunch(raw, 'full');
              if (!launch)
                throw new DataSourceError(
                  'invalid-response',
                  LL2_SOURCE,
                  'Launch record failed validation',
                );
              return launch;
            }),
          ),
      )
      .pipe(
        map((r): DataResponse<Launch | null> => this.respond(r.value, [r])),
        catchError((error: DataSourceError) => {
          if (error.kind === 'not-found') return of(this.respond(null, []));
          if (summary) {
            return of(
              summaryResponse(
                `Full mission details are unavailable right now, so a summary is shown. ${describeError(error)}`,
              ),
            );
          }
          return throwError(() => error);
        }),
      );

    return concat(summary ? of(summaryResponse()) : EMPTY, full$);
  }

  getAnalytics(filter: AnalyticsFilter): Observable<DataResponse<AnalyticsSummary>> {
    return this.history.load().pipe(
      map(({ records, meta }) => ({
        data: computeAnalytics(applyAnalyticsFilter(records, filter)),
        meta,
      })),
    );
  }

  getAnalyticsOptions(): Observable<DataResponse<AnalyticsOptions>> {
    return this.history.load().pipe(map(({ options, meta }) => ({ data: options, meta })));
  }

  // ── Sources ────────────────────────────────────────────────────────────────

  private upcoming(): Observable<CachedResult<MappedPage>> {
    return this.list('upcoming', { hide_recent_previous: 'true' });
  }

  private previous(): Observable<CachedResult<MappedPage>> {
    return this.list('previous', {});
  }

  private list(
    kind: 'upcoming' | 'previous',
    extra: Record<string, string>,
  ): Observable<CachedResult<MappedPage>> {
    return this.cache.get(`ll2:${kind}`, { ...CACHE_POLICY.lists, source: LL2_SOURCE }, () =>
      this.http
        .get<Ll2Page<Ll2Launch>>(`${LL2_BASE_URL}/launches/${kind}/`, {
          params: { mode: 'normal', limit: String(LL2_LIST_LIMIT), ...extra },
        })
        .pipe(
          map((page) => {
            if (!Array.isArray(page?.results)) {
              throw new DataSourceError('invalid-response', LL2_SOURCE, 'Unexpected list response');
            }
            return mapLaunchPage(page.results, 'summary');
          }),
        ),
    );
  }

  /** Upcoming ∪ previous. Succeeds if either window loads; the other's failure becomes a warning. */
  private catalog(): Observable<{ launches: Launch[]; meta: DataMeta }> {
    const settle = <T>(source: Observable<CachedResult<T>>) =>
      source.pipe(
        map((result): Settled<T> => ({ ok: true, result })),
        catchError((error: DataSourceError) => of<Settled<T>>({ ok: false, error })),
      );

    return combineLatest([settle(this.upcoming()), settle(this.previous())]).pipe(
      map(([up, prev]) => {
        const ok = [up, prev].filter((s): s is Extract<Settled<MappedPage>, { ok: true }> => s.ok);
        if (!ok.length) throw (up as { error: DataSourceError }).error;

        const byId = new Map<string, Launch>();
        for (const s of ok) for (const l of s.result.value.launches) byId.set(l.id, l);

        const meta = this.meta(ok.map((s) => s.result));
        if (!up.ok) meta.warnings.push(`Upcoming launches are missing. ${describeError(up.error)}`);
        if (!prev.ok)
          meta.warnings.push(`Recent launches are missing. ${describeError(prev.error)}`);
        return { launches: [...byId.values()], meta };
      }),
    );
  }

  private findSummary(id: string): { launch: Launch; meta: DataMeta } | undefined {
    for (const key of ['ll2:upcoming', 'll2:previous']) {
      const cached = this.cache.peek<MappedPage>(key);
      const launch = cached?.value?.launches?.find((l) => l.id === id);
      if (cached && launch) return { launch, meta: this.baseMeta(cached.fetchedAt) };
    }
    return undefined;
  }

  // ── Metadata ───────────────────────────────────────────────────────────────

  private respond<T>(data: T, results: CachedResult<unknown>[]): DataResponse<T> {
    return { data, meta: this.meta(results) };
  }

  private meta(results: CachedResult<unknown>[]): DataMeta {
    const oldest = results.map((r) => r.fetchedAt).sort()[0] ?? new Date().toISOString();
    const meta = this.baseMeta(oldest);
    for (const r of results) {
      const skipped = (r.value as Partial<MappedPage>)?.skipped;
      if (skipped)
        meta.warnings.push(
          `${skipped} launch record${skipped === 1 ? ' was' : 's were'} incomplete and skipped.`,
        );
      if (r.stale) {
        meta.stale = true;
        meta.warnings.push(
          `Showing saved data because a refresh failed. ${describeError(r.error)}`,
        );
      }
    }
    meta.warnings = [...new Set(meta.warnings)];
    return meta;
  }

  private baseMeta(lastRefresh: string): DataMeta {
    return {
      source: `${LL2_SOURCE} (The Space Devs)`,
      sourceUrl: LL2_SOURCE_URL,
      lastRefresh,
      warnings: [],
      isMock: false,
    };
  }
}

export function provideLiveLaunchData(): FactoryProvider {
  return { provide: LAUNCH_DATA, useFactory: () => new LiveLaunchDataService() };
}
