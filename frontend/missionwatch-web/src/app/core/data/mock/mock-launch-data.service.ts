import { FactoryProvider } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import {
  AnalyticsFilter,
  AnalyticsSummary,
  DataMeta,
  DataResponse,
  Launch,
  LaunchQuery,
  OUTCOME_STATUSES,
  Provider,
  UPCOMING_STATUSES,
} from '../../models';
import { applyAnalyticsFilter, computeAnalytics } from '../analytics';
import { LAUNCH_DATA, LaunchDataSource } from '../launch-data-source';
import { queryLaunches } from '../launch-query';
import { buildMockCatalog } from './mock-catalog';
import { buildSyntheticHistory } from './synthetic-history';

/** Simulated network latency so loading states are visible during development. */
export const MOCK_LATENCY_MS = 350;

/** In-memory adapter for Phase 1. Constructed via `provideMockLaunchData()`. */
export class MockLaunchDataService implements LaunchDataSource {
  private readonly now = Date.now();
  private readonly loadedAt = new Date(this.now).toISOString();
  private readonly catalog = buildMockCatalog(this.now);
  private readonly history = buildSyntheticHistory(this.now);

  constructor(private readonly latencyMs = MOCK_LATENCY_MS) {}

  getUpcoming(limit = 50): Observable<DataResponse<Launch[]>> {
    const upcoming = queryLaunches(this.catalog, {
      statuses: [...UPCOMING_STATUSES],
      sort: 'time',
    });
    return this.respond(upcoming.slice(0, limit));
  }

  getPrevious(limit = 50): Observable<DataResponse<Launch[]>> {
    const previous = queryLaunches(this.catalog, {
      statuses: [...OUTCOME_STATUSES],
      sort: 'time',
      direction: 'desc',
    });
    return this.respond(previous.slice(0, limit));
  }

  getFeatured(): Observable<DataResponse<Launch[]>> {
    return this.respond(
      queryLaunches(
        this.catalog.filter((l) => l.featured),
        { sort: 'time' },
      ),
    );
  }

  search(query: LaunchQuery): Observable<DataResponse<Launch[]>> {
    return this.respond(queryLaunches(this.catalog, query));
  }

  getLaunch(id: string): Observable<DataResponse<Launch | null>> {
    const launch = this.catalog.find((l) => l.id === id) ?? null;
    const warnings =
      launch && !launch.scheduleHistory?.length
        ? ['No schedule snapshots have been recorded for this launch yet.']
        : [];
    return this.respond(launch, warnings);
  }

  getProviders(): Observable<DataResponse<Provider[]>> {
    const providers = new Map<string, Provider>();
    for (const launch of [...this.catalog, ...this.history])
      providers.set(launch.provider.id, launch.provider);
    return this.respond([...providers.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  getAnalytics(filter: AnalyticsFilter): Observable<DataResponse<AnalyticsSummary>> {
    const records = applyAnalyticsFilter([...this.history, ...this.catalog], filter);
    return this.respond(computeAnalytics(records), [
      'Historical figures are synthetic and generated for layout purposes only.',
    ]);
  }

  private respond<T>(data: T, warnings: string[] = []): Observable<DataResponse<T>> {
    const meta: DataMeta = {
      source: 'MissionWatch demo dataset',
      lastRefresh: this.loadedAt,
      warnings,
      isMock: true,
    };
    const response = of({ data, meta });
    return this.latencyMs > 0 ? response.pipe(delay(this.latencyMs)) : response;
  }
}

export function provideMockLaunchData(latencyMs = MOCK_LATENCY_MS): FactoryProvider {
  return { provide: LAUNCH_DATA, useFactory: () => new MockLaunchDataService(latencyMs) };
}
