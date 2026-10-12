# Architecture

This document tracks how MissionWatch is built. The requirements live in [SRS.md](SRS.md).

## System overview (target)

```text
                    External Data Providers
                ┌────────────┼─────────────┐
          Launch Library    NASA      Weather / News
                └────────────┼─────────────┘
                             ▼
                    Spring Boot Backend
             REST API · Data Cache · Scheduled Jobs
                             ▼
                        PostgreSQL
                 ┌───────────┴───────────┐
                 ▼                       ▼
           Angular Frontend       Python ML Service
```

Principles (SRS §3.2): separate the presentation, business-logic and data-processing layers. Keep credentials on the server. Normalise third-party data into internal models, and cache it. Keep model outputs traceable to a model version. Keep the core experience working when optional integrations fail.

## Current state: Phase 2 (real data)

Only the Angular frontend exists so far. It reads live public data directly from the browser, and every source sits behind the `LAUNCH_DATA` injection token, so the Phase 4 backend can take over without changes to feature code.

```text
Browser
├── Launch Library 2 ──► RequestCache (localStorage + memory) ──► LL2 mapper ──► Launch models
│     upcoming / previous lists (mode=normal), mission detail (mode=detailed)
├── NASA Image and Video Library ──► RequestCache ──► keyword-matched imagery
└── data/launch-history.json (GCAT snapshot, built at deploy time) ──► analytics records
```

```text
frontend/missionwatch-web/
├── scripts/build-history.mjs   Downloads GCAT and writes public/data/launch-history.json
└── src/app/
    ├── core/
    │   ├── models/            Normalised domain models (mirror SRS §9 entities)
    │   ├── data/
    │   │   ├── ll2/           LL2 types, validating mapper, LiveLaunchDataService
    │   │   ├── history/       GCAT snapshot decoder and repository
    │   │   ├── media/         NASA imagery search
    │   │   ├── cache/         RequestCache: TTL, stale fallback, in-flight sharing
    │   │   ├── mock/          Demo dataset (tests and offline work)
    │   │   └── errors.ts      DataSourceError and user-facing messages
    │   ├── state/             ThemeService
    │   └── util/              Time, precision, status and schedule helpers
    ├── shared/ui/             Reusable presentational components
    ├── layout/                App shell
    └── features/              One lazy-loaded route per primary page (SRS §10.2)
```

### Key decisions

| Decision | Rationale |
|---|---|
| Angular 22, standalone, zoneless, signals, `rxResource` | Current Angular defaults. Resources give loading, error and reload states for free, and cancel stale requests. |
| `LAUNCH_DATA` injection token | The demo, live and (later) backend adapters are interchangeable. Features depend only on the interface. |
| Browser cache in front of LL2: 15 min for lists, 30 min for details, stale copies kept up to 7 days | LL2 allows about 15 anonymous requests per hour per visitor. One visit typically makes 2 to 4 requests. When a refresh fails, the page shows the saved copy and labels it (NFR-02). |
| Search and filters run locally over the cached upcoming and previous windows | Required by FR-02, and costs no extra requests. |
| Mission pages show the cached summary first, then upgrade to the detailed record | The page appears instantly. If the detailed request is rate limited, the summary stays on screen with a warning. |
| Analytics read a build-time GCAT snapshot, not LL2 | Full history (about 7,400 launches) would need around 75 rate-limited requests. GCAT is complete and CC BY 4.0, and the snapshot is about 60 KB gzipped and loaded only on demand. |
| The mapper validates and skips bad records, and the skipped count becomes a warning | One malformed record never breaks a page (SRS §5.7). |
| Date precision is preserved, and countdowns show only for exact times | LL2 often knows only the day or month. Inventing an hour and minute would misinform. |
| `DataResponse<T>` wraps every payload with `DataMeta` (source, refresh time, stale flag, warnings) | Freshness and provenance are visible wherever data is shown (SRS §5.7, §8.2). |
| Every feature route is lazy-loaded, and ECharts loads only in the analytics chunk | NFR-01 performance. |

### Known limits of the frontend-only design

- Schedule-change history needs snapshots recorded over time, so it waits for the Phase 5 pipeline. Mission pages show the sourced LL2 updates instead.
- Explorer search covers the next 40 and the last 40 launches. Searching the full catalogue needs the backend.
- GCAT and LL2 name providers differently, so the two datasets are not joined record by record.

## Roadmap

| Phase | Area | Status |
|---|---|---|
| 1 | Frontend foundation | Done |
| 2 | Real data integration (Launch Library 2, NASA media, GCAT history) | Done |
| 3 | Interactive globe (CesiumJS), Mission Story Mode | Planned |
| 4 | Spring Boot backend, PostgreSQL, Flyway | Planned |
| 5 | Historical data pipeline, schedule snapshots | Planned |
| 6 | Data science and ML (gated on data sufficiency) | Planned |
| 7 | Launch Intelligence, watchlists, notifications | Planned |
| 8 | Deployment and portfolio polish | Planned |

## Deployment

- **Frontend:** GitHub Pages, built by `.github/workflows/deploy-pages.yml`, which first runs `npm run data:history` and then builds with `--base-href /`, since the site is served from the root of a custom subdomain. It runs on every push to `main` and weekly, so the GCAT snapshot stays current. `index.html` is copied to `404.html` so nested routes still resolve on a full page load.
- **Backend, database and ML service:** a separate host, to be chosen in Phase 4 or Phase 8. GitHub Pages can only serve static files.
