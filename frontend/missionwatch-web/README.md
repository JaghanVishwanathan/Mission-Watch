# missionwatch-web

Angular 22 frontend for MissionWatch. See the [root README](../../README.md) for project context.

## Requirements

- Node.js `^22.22.3 || ^24.15.0` (Angular 22 requirement)

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server on http://localhost:4200 |
| `npm test -- --watch=false` | Vitest unit tests, single run |
| `npm run build` | Production build into `dist/missionwatch-web/browser` |
| `npx prettier --write "src/**/*.{ts,html,scss}"` | Format |

## Structure

```text
src/app/
├── core/
│   ├── models/      Normalised domain models (SRS §9)
│   ├── data/        LAUNCH_DATA contract, query/analytics functions, mock adapter
│   ├── state/       ThemeService
│   └── util/        Time, status and schedule helpers
├── shared/ui/       Reusable components (status badge, countdown, states, cards…)
├── layout/          App shell
└── features/        One lazy-loaded route per page
```

## Swapping the data source

Features only inject `LAUNCH_DATA` (`core/data/launch-data-source.ts`). Phase 1 provides
`provideMockLaunchData()` in `app.config.ts`. To use a live source, implement
`LaunchDataSource` and change that one provider.
