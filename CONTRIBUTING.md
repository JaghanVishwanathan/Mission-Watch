# Contributing to MissionWatch

How the codebase is organised, the conventions it follows, and the checks a change must pass. The requirements are in [docs/SRS.md](docs/SRS.md) and the design in [docs/architecture.md](docs/architecture.md).

## Workflow

1. Branch from `main`: `feature/<short-name>` (or `fix/…`, `docs/…`).
2. Keep each branch to one purpose. Commit messages start with the area, e.g. `Live: …`, `Backend: …`, `Docs: …`.
3. Run the checks below, push, and open a pull request into `main`. CI must pass before merging.
4. Merging to `main` deploys the frontend to GitHub Pages.

## Checks

| Area | Command (from its folder) | What it covers |
|---|---|---|
| Frontend | `npm run format:check` | Prettier formatting (`npm run format` fixes it) |
| | `npm test -- --watch=false` | Unit tests, including validation of `public/config/live-missions.json` |
| | `npm run build` | Production build and size budgets |
| Backend | `./mvnw verify` | Spotless formatting (`./mvnw spotless:apply` fixes it), unit tests, MySQL integration tests (need Docker), ArchUnit architecture rules |

CI runs the same commands: `.github/workflows/frontend-ci.yml` and `backend-ci.yml`.

## Conventions

**Shared**
- Never invent data. Missing values are omitted or labelled *Unavailable*. Estimates and illustrations are marked as such (SRS §5.7).
- Every payload travels with its provenance: `{ data, meta }` with source, refresh time, warnings and a stale flag.
- All times are ISO-8601 UTC in data and APIs. Convert to local time only for display.
- No secrets in the repository. Configuration comes from environment variables; `.env` files are git-ignored.
- Editor settings come from `.editorconfig`, and line endings from `.gitattributes` (LF, except Windows `.cmd` scripts).

**Frontend** (`frontend/missionwatch-web`)
- Angular 22 defaults: standalone components, signals, `rxResource`, zoneless change detection, `OnPush`.
- Features depend on the `LAUNCH_DATA` interface, never on a concrete source. Adapters live in `core/data/<source>/`.
- One lazy-loaded route per page under `features/`; reusable presentational pieces go in `shared/ui/`.
- Per-launch stream links are content, not code: `public/config/live-missions.json` ([guide](docs/live-streams.md)).

**Backend** (`backend/missionwatch-api`)
- Package by feature (`launch`, `provider`, `snapshot`, `freshness`, `ingest/<source>`), with `common` and `config` shared.
- Controllers call services; services own transactions and caching; repositories stay behind services.
- Source-specific code (e.g. Launch Library 2) stays in `ingest/<source>/` and maps into internal models.
- Schema changes are new Flyway migrations (`V<n>__<what>.sql`). Never edit a merged migration.
- Settings are typed in `MissionWatchProperties` and documented in the module README.
- `ArchitectureTest` enforces these rules. If a rule must change, update it and docs/architecture.md together.

**Keep in step**
- `ll2-mapper.ts` (frontend) and `Ll2Mapper.java` (backend) map LL2 the same way, with matching tests.
- Frontend models in `core/models` and the backend's `LaunchView`, `ProviderView` and `LaunchSnapshotView` share one JSON shape.
- Search and sort behave the same in `launch-query.ts` and `LaunchService` / `LaunchSpecifications`.
