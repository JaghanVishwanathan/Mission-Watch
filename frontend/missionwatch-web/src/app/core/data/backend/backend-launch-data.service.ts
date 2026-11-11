import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { FactoryProvider, inject } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import {
  AnalyticsFilter,
  AnalyticsOptions,
  AnalyticsSummary,
  DataMeta,
  DataResponse,
  Launch,
  LaunchQuery,
  Provider,
} from '../../models';
import { applyAnalyticsFilter, computeAnalytics } from '../analytics';
import { toDataSourceError } from '../errors';
import { HistoryRepository } from '../history/history-repository';
import { LAUNCH_DATA, LaunchDataSource } from '../launch-data-source';
import { pickFeatured } from '../launch-query';

export const API_SOURCE = 'MissionWatch API';

/** The API allows up to 200 launches per request (LaunchSearch.MAX_LIMIT on the server). */
const SEARCH_LIMIT = 200;

/**
 * Adapter for the MissionWatch API (backend/missionwatch-api, Phase 4). The API already serves
 * the frontend's Launch model in a `{ data, meta }` envelope, refreshes Launch Library 2 on a
 * schedule and caches on the server, so this adapter only builds requests and maps errors.
 * Historical analytics still come from the GCAT snapshot until the Phase 5 pipeline.
 *
 * Created by provideBackendLaunchData(), whose factory supplies the injection context.
 */
export class BackendLaunchDataService implements LaunchDataSource {
  private readonly http = inject(HttpClient);
  private readonly history = inject(HistoryRepository);

  constructor(private readonly baseUrl: string) {}

  getUpcoming(limit = 50): Observable<DataResponse<Launch[]>> {
    return this.get<Launch[]>('/api/launches/upcoming', new HttpParams().set('limit', limit));
  }

  getPrevious(limit = 50): Observable<DataResponse<Launch[]>> {
    return this.get<Launch[]>('/api/launches/previous', new HttpParams().set('limit', limit));
  }

  getFeatured(): Observable<DataResponse<Launch[]>> {
    return this.getUpcoming().pipe(map((r) => ({ data: pickFeatured(r.data), meta: r.meta })));
  }

  search(query: LaunchQuery): Observable<DataResponse<Launch[]>> {
    let params = new HttpParams().set('limit', SEARCH_LIMIT);
    if (query.text?.trim()) params = params.set('q', query.text.trim());
    for (const status of query.statuses ?? []) params = params.append('status', status);
    for (const id of query.providerIds ?? []) params = params.append('provider', id);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.sort) params = params.set('sort', query.sort);
    if (query.direction) params = params.set('direction', query.direction);
    return this.get<Launch[]>('/api/launches/search', params);
  }

  getLaunch(id: string): Observable<DataResponse<Launch | null>> {
    return this.request<Launch>(`/api/launches/${encodeURIComponent(id)}`).pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of({ data: null, meta: this.notFoundMeta() })
          : throwError(() => toDataSourceError(error, API_SOURCE)),
      ),
    );
  }

  getProviders(): Observable<DataResponse<Provider[]>> {
    return this.get<Provider[]>('/api/providers');
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

  /** A request whose failures are mapped to user-facing DataSourceErrors. */
  private get<T>(path: string, params?: HttpParams): Observable<DataResponse<T>> {
    return this.request<T>(path, params).pipe(
      catchError((error: unknown) => throwError(() => toDataSourceError(error, API_SOURCE))),
    );
  }

  private request<T>(path: string, params?: HttpParams): Observable<DataResponse<T>> {
    return this.http.get<DataResponse<T>>(`${this.baseUrl}${path}`, { params });
  }

  private notFoundMeta(): DataMeta {
    return {
      source: API_SOURCE,
      lastRefresh: new Date().toISOString(),
      warnings: [],
      isMock: false,
    };
  }
}

export function provideBackendLaunchData(baseUrl: string): FactoryProvider {
  return { provide: LAUNCH_DATA, useFactory: () => new BackendLaunchDataService(baseUrl) };
}
