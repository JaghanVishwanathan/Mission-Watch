import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AnalyticsFilter,
  AnalyticsSummary,
  DataResponse,
  Launch,
  LaunchQuery,
  Provider,
} from '../models';

/**
 * The contract every launch data adapter implements. Features depend on this token only,
 * so the mock (Phase 1), a Launch Library 2 adapter (Phase 2) and the MissionWatch
 * backend (Phase 4) are interchangeable.
 */
export interface LaunchDataSource {
  getUpcoming(limit?: number): Observable<DataResponse<Launch[]>>;
  getPrevious(limit?: number): Observable<DataResponse<Launch[]>>;
  getFeatured(): Observable<DataResponse<Launch[]>>;
  search(query: LaunchQuery): Observable<DataResponse<Launch[]>>;
  /** Emits `data: null` when the launch does not exist. */
  getLaunch(id: string): Observable<DataResponse<Launch | null>>;
  getProviders(): Observable<DataResponse<Provider[]>>;
  getAnalytics(filter: AnalyticsFilter): Observable<DataResponse<AnalyticsSummary>>;
}

export const LAUNCH_DATA = new InjectionToken<LaunchDataSource>('LAUNCH_DATA');
