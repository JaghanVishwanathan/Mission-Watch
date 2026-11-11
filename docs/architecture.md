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
                        MySQL
                 ┌───────────┴───────────┐
                 ▼                       ▼
           Angular Frontend       Python ML Service
```

Principles (SRS §3.2): separate the presentation, business-logic and data-processing layers. Keep credentials on the server. Normalise third-party data into internal models, and cache it. Keep model outputs traceable to a model version. Keep the core experience working when optional integrations fail.

## Current state: Phase 4 (backend)

The Angular frontend and the Spring Boot API both exist. Every launch source sits behind the `LAUNCH_DATA` injection token, and a build-time environment picks one:

| Environment | Command | Launch data from |
|---|---|---|
| `environment.ts` (default, production) | `npm start`, `npm run build` | Launch Library 2, directly from the browser |
| `environment.backend.ts` | `npm run start:backend` | The MissionWatch API at `http://localhost:8080` |

The public site stays on direct LL2 until the API is hosted (Phase 8). Feature code is identical in both modes.

## Frontend

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
    │   │   ├── backend/       BackendLaunchDataService (MissionWatch API adapter)
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
        └── globe/             Mission Globe and Story Mode: page, pure geometry (globe-util),
                               renderer interface, and the only CesiumJS import
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
| CesiumJS sits behind a `GlobeRenderer` interface (`features/globe/globe-renderer.ts`); only `cesium-globe-renderer.ts` imports it, through a dynamic import | Cesium (~0.9 MB gzipped) loads only when the globe is shown. The page and its tests work against the interface, using a fake renderer in jsdom. If WebGL is unavailable, the site list still works. |
| The globe uses Cesium's bundled Natural Earth II imagery, with no Cesium ion | No account, token or third-party map requests, and nothing secret in the frontend. |
| Ascent paths are drawn from the orbit label (polar/SSO, low Earth orbit, eastward high orbits) and always labelled "illustrative" | LL2 publishes no trajectories. Showing direction helps understanding, but the path must never look like computed orbital mechanics (FR-04). Unknown orbits get no path. Flight Club is linked when LL2 has a simulation. |
| Story mode uses only the mission's own LL2 milestones; absolute times are shown only when the launch time is exact | FR-05: no invented events or false precision. |

### Known limits of the browser-only mode

- No schedule-change history: that needs snapshots recorded over time, which only the backend does. Mission pages show the sourced LL2 updates instead.
- Explorer search covers the next 40 and the last 40 launches.
- GCAT and LL2 name providers differently, so the two datasets are not joined record by record.

## Backend (`backend/missionwatch-api`)

Java 25, Spring Boot 4.1, MySQL 9.7 (LTS), Flyway, Caffeine, springdoc-openapi. Run and configuration instructions are in the [module README](../backend/missionwatch-api/README.md).

```text
Launch Library 2 ──► Ll2Client (rate budget) ──► Ll2Mapper ──► LaunchStore ──► MySQL
     ▲ every 15 min (upcoming) / 1 h (previous)        │            ├─ launch (+ document json, source_payload json)
     └── Ll2RefreshJob                                 │            ├─ provider, rocket, launch_site
                                                       │            ├─ launch_snapshot   (FR-07)
                                                       └─ invalid → skipped, counted     └─ data_refresh      (freshness)

HTTP GET /api/** ──► Controller ──► Service (Caffeine cache) ──► Repository ──► { data, meta }
```

```text
com.jaghan.missionwatch
├── common/       ApiResponse {data, meta}, DataMeta, ApiError, GlobalExceptionHandler
├── config/       Typed settings (missionwatch.*), security and CORS, caching, scheduling
├── launch/       LaunchController, LaunchService (read), LaunchStore (write), LaunchSearch
│   ├── model/        LaunchView (= frontend Launch), LaunchStatus
│   └── persistence/  JPA entities, repositories, search specifications
├── provider/     Providers: entity, upsert, GET /api/providers
├── snapshot/     Schedule snapshots: change detection and history
├── freshness/    Refresh log and the freshness metadata built from it
└── ingest/ll2/   The only code that knows LL2: client, records, mapper, refresh job
```

### Key decisions

| Decision | Rationale |
|---|---|
| Package by feature, with rules enforced by ArchUnit (`ArchitectureTest`) | No cycles between features, controllers never touch repositories, and LL2 types never leave `ingest.ll2`. A future source (NASA, news) is a sibling adapter. |
| The API serves the frontend's `Launch` shape as-is | The Angular backend adapter is a thin HTTP wrapper. The Java mapper is a port of `ll2-mapper.ts`, with the same test cases. |
| `launch.document` (JSON column) holds the normalised view; relational columns hold what is filtered, sorted or joined | Rich, mostly-optional mission data without dozens of tables, while search stays in SQL. `source_payload` keeps the raw record for traceability and re-mapping. |
| Snapshots are written only when time or status changes | Repeated refreshes are idempotent (NFR-02), and the table becomes the FR-07 dataset for Phases 5–7. |
| One shared, sliding hourly budget for every LL2 call | The scheduled jobs use about 5 of LL2's ~15 anonymous requests per hour. On-demand lookups cannot exhaust the rest. |
| A failed refresh keeps stored data, records the failure and marks responses `stale` | The site keeps working when LL2 is down, and says so (NFR-02). |
| Flyway owns the schema; Hibernate only validates it | Migrations are versioned and repeatable. A mismatch fails at start-up, not in production queries. |
| MySQL 9.7 LTS, times as `DATETIME(6)` in UTC (`connectionTimeZone=UTC`, `hibernate.jdbc.time_zone=UTC`) | MySQL has no time-zone-aware timestamp type, so UTC is pinned at the connection and in Hibernate rather than left to server settings. |
| Testcontainers MySQL in tests, not H2 | JSON-column and UTC timestamp behaviour are tested on the real database. |

## Roadmap

| Phase | Area | Status |
|---|---|---|
| 1 | Frontend foundation | Done |
| 2 | Real data integration (Launch Library 2, NASA media, GCAT history) | Done |
| 3 | Interactive globe (CesiumJS), Mission Story Mode | Done |
| 4 | Spring Boot backend, MySQL, Flyway | Done (hosting in Phase 8) |
| 5 | Historical data pipeline, schedule snapshots | Planned |
| 6 | Data science and ML (gated on data sufficiency) | Planned |
| 7 | Launch Intelligence, watchlists, notifications | Planned |
| 8 | Deployment and portfolio polish | Planned |

## Deployment

- **Frontend:** GitHub Pages, built by `.github/workflows/deploy-pages.yml`, which first runs `npm run data:history` and then builds with `--base-href /`, since the site is served from the root of `missionwatch.jaghan.com`. It runs on every push to `main` and weekly, so the GCAT snapshot stays current. `index.html` is copied to `404.html` so nested routes still resolve on a full page load.
- **Backend and database:** built and tested by `.github/workflows/backend-ci.yml` (including the container image), but not hosted yet. A Java-capable host and managed MySQL are chosen in Phase 8; the `Dockerfile` and `deployment/docker/compose.yaml` are the starting point. GitHub Pages can only serve static files.
