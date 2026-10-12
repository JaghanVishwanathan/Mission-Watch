# missionwatch-web

Angular 22 frontend for MissionWatch. See the [root README](../../README.md) for project context.

## Requirements

- Node.js `^22.22.3 || ^24.15.0` (Angular 22 requirement)

## Scripts

| Command | What it does |
|---|---|
| `npm run data:history` | Download GCAT and write `public/data/launch-history.json` (Analytics data). Use `-- --from-dir <dir>` to build from local TSVs. |
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

## Data sources

`app.config.ts` provides `provideLiveLaunchData()`. It reads Launch Library 2 for launches (cached in the browser), the GCAT snapshot for analytics, and NASA imagery on mission pages. To work offline with the bundled demo dataset, swap it for `provideMockLaunchData()`. Features only inject `LAUNCH_DATA`, so any adapter that implements `LaunchDataSource` can be dropped in.

Tests never hit the network. They use `HttpTestingController` or the mock adapter.
