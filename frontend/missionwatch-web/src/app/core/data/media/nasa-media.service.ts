import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  concatMap,
  from,
  map,
  Observable,
  of,
  filter,
  take,
  defaultIfEmpty,
} from 'rxjs';
import { CACHE_POLICY, NASA_IMAGES_URL } from '../../config';
import { DataMeta, DataResponse, Launch } from '../../models';
import { RequestCache } from '../cache/request-cache';
import { DataSourceError, describeError } from '../errors';

export const NASA_SOURCE = 'NASA Image and Video Library';
const MAX_ITEMS = 6;
const MAX_QUERIES = 3;

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  detailsUrl: string;
  dateCreated?: string;
  credit?: string;
}

export interface RelatedMedia {
  items: MediaItem[];
  /** The keyword that produced the matches, so the UI can be honest about relevance. */
  matchedQuery?: string;
}

interface NasaSearchResponse {
  collection?: {
    items?: {
      links?: { href?: string; rel?: string; render?: string }[];
      data?: {
        nasa_id?: string;
        title?: string;
        description?: string;
        date_created?: string;
        center?: string;
        photographer?: string;
        secondary_creator?: string;
        media_type?: string;
      }[];
    }[];
  };
}

/** Candidate keywords from most to least specific, e.g. "Crew-13" → "Crew" → "Falcon". */
export function mediaQueries(launch: Launch): string[] {
  const simplified = launch.missionName
    .replace(/\(.*?\)/g, '')
    .replace(/[\s\-–]+(group\s+)?[\d\s\-–./]+$/i, '')
    .trim();
  const candidates = [
    launch.missionName,
    simplified,
    launch.rocket.family,
    launch.rocket.name.split(' ').slice(0, 2).join(' '),
  ];
  const seen = new Set<string>();
  return candidates
    .map((q) => q?.trim())
    .filter(
      (q): q is string =>
        !!q && q.length >= 3 && !seen.has(q.toLowerCase()) && !!seen.add(q.toLowerCase()),
    )
    .slice(0, MAX_QUERIES);
}

export function mapNasaItems(response: NasaSearchResponse): MediaItem[] {
  const items: MediaItem[] = [];
  for (const item of response.collection?.items ?? []) {
    const data = item.data?.[0];
    const thumb = item.links?.find((l) => l.render === 'image' || l.rel === 'preview')?.href;
    if (!data?.nasa_id || !data.title || !thumb || data.media_type !== 'image') continue;
    const creator = data.photographer ?? data.secondary_creator;
    items.push({
      id: data.nasa_id,
      title: data.title,
      description: data.description,
      thumbnailUrl: thumb.replace(/^http:/, 'https:'),
      detailsUrl: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      dateCreated: data.date_created,
      credit: [creator, data.center ? `NASA ${data.center}` : 'NASA'].filter(Boolean).join(' / '),
    });
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}

/** Keyword-matched imagery from NASA's public library (SRS §5.2). Optional: failures never break a page. */
@Injectable({ providedIn: 'root' })
export class NasaMediaService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(RequestCache);

  related(launch: Launch): Observable<DataResponse<RelatedMedia>> {
    const meta = (fetchedAt: string, warnings: string[] = []): DataMeta => ({
      source: NASA_SOURCE,
      sourceUrl: 'https://images.nasa.gov',
      lastRefresh: fetchedAt,
      warnings,
      isMock: false,
    });
    const empty: DataResponse<RelatedMedia> = {
      data: { items: [] },
      meta: meta(new Date().toISOString()),
    };

    type Attempt = DataResponse<RelatedMedia> & { done: boolean };
    return from(mediaQueries(launch)).pipe(
      // Try keywords in order (one request at a time) and stop at the first that matches.
      concatMap((q): Observable<Attempt> =>
        this.search(q).pipe(
          map((r) => ({
            data: { items: r.items, matchedQuery: q },
            meta: meta(r.fetchedAt),
            done: r.items.length > 0,
          })),
          catchError((error: DataSourceError) =>
            of({
              data: { items: [] },
              meta: meta(new Date().toISOString(), [describeError(error)]),
              done: true,
            }),
          ),
        ),
      ),
      filter((attempt) => attempt.done),
      take(1),
      map(({ data, meta: m }): DataResponse<RelatedMedia> => ({ data, meta: m })),
      defaultIfEmpty(empty),
    );
  }

  private search(q: string): Observable<{ items: MediaItem[]; fetchedAt: string }> {
    return this.cache
      .get(`nasa:${q.toLowerCase()}`, { ...CACHE_POLICY.media, source: NASA_SOURCE }, () =>
        this.http
          .get<NasaSearchResponse>(`${NASA_IMAGES_URL}/search`, {
            params: { q, media_type: 'image', page_size: '12' },
          })
          .pipe(map(mapNasaItems)),
      )
      .pipe(map((r) => ({ items: r.value, fetchedAt: r.fetchedAt })));
  }
}
