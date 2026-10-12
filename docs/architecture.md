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

## Current state: Phase 1 (frontend foundation)

Only the Angular frontend exists so far. It runs on **mock data**, behind an injection token, so later phases can change the data source without touching feature code.

```text
frontend/missionwatch-web/src/app/
├── core/
│   ├── models/        Normalised domain models (mirror SRS §9 entities)
│   ├── data/          LAUNCH_DATA token, MockLaunchDataService, mock dataset
│   └── state/         ThemeService
├── shared/ui/         Reusable presentational components and async-state helpers
├── layout/            App shell (top bar, side nav, skip link)
└── features/          One lazy-loaded route per primary page (SRS §10.2)
```

### Key decisions

| Decision | Rationale |
|---|---|
| Angular 22, standalone, zoneless, signals | Current Angular defaults. Signals hold local and derived UI state, and RxJS handles async data. |
| `LAUNCH_DATA` injection token | In Phase 2 an HTTP adapter (Launch Library 2) replaces the mock, and in Phase 4 a backend adapter replaces that. Features depend only on the interface. |
| `DataResponse<T>` wraps every payload with `DataMeta` | Source, refresh time and warnings travel with the data, so freshness indicators work from day one (SRS §5.7, §8.2). |
| Optional fields are typed as optional | Templates have to handle missing data explicitly and show "Unavailable", never invented values (FR-03). |
| Every feature route is lazy-loaded, and ECharts loads only inside the analytics chunk | NFR-01 performance. CesiumJS will follow the same pattern in Phase 3. |
| CSS custom-property design tokens with dark and light themes | One source for colour, spacing and type. The theme switches at runtime without a rebuild. |

## Roadmap

| Phase | Area | Status |
|---|---|---|
| 1 | Frontend foundation | Done |
| 2 | Real data integration (Launch Library 2, NASA media) | Planned |
| 3 | Interactive globe (CesiumJS), Mission Story Mode | Planned |
| 4 | Spring Boot backend, PostgreSQL, Flyway | Planned |
| 5 | Historical data pipeline, schedule snapshots | Planned |
| 6 | Data science and ML (gated on data sufficiency) | Planned |
| 7 | Launch Intelligence, watchlists, notifications | Planned |
| 8 | Deployment and portfolio polish | Planned |

## Deployment

- **Frontend:** GitHub Pages, built by `.github/workflows/deploy-pages.yml` with `--base-href /missionwatch/`. `index.html` is copied to `404.html` so nested routes still resolve on a full page load.
- **Backend, database and ML service:** a separate host, to be chosen in Phase 4 or Phase 8. GitHub Pages can only serve static files.
