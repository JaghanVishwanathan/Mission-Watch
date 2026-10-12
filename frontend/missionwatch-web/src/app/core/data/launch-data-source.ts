import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AnalyticsFilter,
  AnalyticsOptions,
  AnalyticsSummary,
  DataResponse,
  Launch,
  LaunchQuery,
  Provider,
} from '../models';

/**
 * The contract every launch data adapter implements. Features depend on this token only,
 * so the demo dataset, the live Launch Library 2 + GCAT adapter (Phase 2) and the
 * MissionWatch backend (Phase 4) are interchangeable.
 */
export interface LaunchDataSource {
  getUpcoming(limit?: number): Observable<DataResponse<Launch[]>>;
  getPrevious(limit?: number): Observable<DataResponse<Launch[]>>;
  getFeatured(): Observable<DataResponse<Launch[]>>;
  search(query: LaunchQuery): Observable<DataResponse<Launch[]>>;
  /**
   * Emits `data: null` when the launch does not exist. May emit twice: a summary
   * first (when one is already cached), then the full record.
   */
  getLaunch(id: string): Observable<DataResponse<Launch | null>>;
  getProviders(): Observable<DataResponse<Provider[]>>;
  getAnalytics(filter: AnalyticsFilter): Observable<DataResponse<AnalyticsSummary>>;
  getAnalyticsOptions(): Observable<DataResponse<AnalyticsOptions>>;
}

export const LAUNCH_DATA = new InjectionToken<LaunchDataSource>('LAUNCH_DATA');
