import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { HISTORY_SNAPSHOT_URL } from '../../config';
import { DataMeta } from '../../models';
import { DataSourceError, toDataSourceError } from '../errors';
import { decodeHistory, DecodedHistory, isHistorySnapshot } from './history-snapshot';

export const HISTORY_SOURCE = 'GCAT launch history';

export interface LoadedHistory extends DecodedHistory {
  meta: DataMeta;
}

/** Loads the build-time GCAT snapshot once per session and shares it. */
@Injectable({ providedIn: 'root' })
export class HistoryRepository {
  private readonly http = inject(HttpClient);
  private cached?: Observable<LoadedHistory>;

  load(): Observable<LoadedHistory> {
    this.cached ??= this.http.get<unknown>(HISTORY_SNAPSHOT_URL).pipe(
      map((body) => {
        if (!isHistorySnapshot(body)) {
          throw new DataSourceError(
            'invalid-response',
            HISTORY_SOURCE,
            'History snapshot has an unexpected format',
          );
        }
        const decoded = decodeHistory(body);
        const meta: DataMeta = {
          source: `${body.source.name}, ${body.source.author} (${body.source.license})`,
          sourceUrl: body.source.url,
          lastRefresh: body.generatedAt,
          dataTimestamp: body.source.updated ?? undefined,
          warnings: [],
          isMock: false,
        };
        return { ...decoded, meta };
      }),
      catchError((err: unknown) => {
        this.cached = undefined; // allow a retry
        return throwError(() => toDataSourceError(err, HISTORY_SOURCE));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.cached;
  }
}
