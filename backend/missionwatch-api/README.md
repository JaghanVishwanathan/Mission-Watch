# missionwatch-api

The MissionWatch REST API (Phase 4, [SRS §4.2, §8, §9](../../docs/SRS.md)). It refreshes launches from Launch Library 2 on a schedule, stores them in PostgreSQL with their schedule history, and serves them in the shape the Angular app uses. The design is in [docs/architecture.md](../../docs/architecture.md#backend-backendmissionwatch-api).

**Stack:** Java 25, Spring Boot 4.1 (Web MVC, Data JPA, Validation, Security, Actuator), Flyway, PostgreSQL 18, Caffeine, springdoc-openapi. Tests: JUnit 6, Testcontainers, ArchUnit. Formatting: Spotless (palantir-java-format).

## Prerequisites

- JDK 25 (e.g. `winget install EclipseAdoptium.Temurin.25.JDK`). Maven is not needed: use the wrapper (`./mvnw`, or `mvnw.cmd` on Windows).
- Docker, for the local database and the integration tests.

## Run locally

```bash
# from the repository root: start PostgreSQL
docker compose -f deployment/docker/compose.yaml up -d postgres

# from this folder: start the API on http://localhost:8080
./mvnw spring-boot:run
```

The first refresh runs about 10 seconds after start-up (previous launches after 40 seconds). Then:

- API docs: http://localhost:8080/swagger-ui.html
- Health: http://localhost:8080/actuator/health
- Try it: `curl "http://localhost:8080/api/launches/upcoming?limit=5"`

To point the Angular app at it, run `npm run start:backend` in `frontend/missionwatch-web`.

To run the database and the API together in containers: `docker compose -f deployment/docker/compose.yaml --profile api up -d --build`.

## Test

```bash
./mvnw verify            # formatting check, unit tests, PostgreSQL integration tests, architecture rules
./mvnw spotless:apply    # fix formatting
```

The integration tests (`*IntegrationTest`) start PostgreSQL in Docker through Testcontainers. Without Docker they are skipped locally; CI always runs them.

## Configuration

All settings are in [`application.yml`](src/main/resources/application.yml) and can be overridden with environment variables. Never commit real credentials.

| Variable | Default | Meaning |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/missionwatch` | JDBC URL |
| `DB_USER` / `DB_PASSWORD` | `missionwatch` / `missionwatch` | Database credentials (local defaults only) |
| `MISSIONWATCH_LL2_REFRESH_ENABLED` | `true` | Turn the scheduled LL2 refreshes off |
| `MISSIONWATCH_LL2_UPCOMING_REFRESH` | `PT15M` | Delay between upcoming-launch refreshes |
| `MISSIONWATCH_LL2_PREVIOUS_REFRESH` | `PT1H` | Delay between previous-launch refreshes |
| `MISSIONWATCH_LL2_REQUESTS_PER_HOUR` | `12` | Budget for all LL2 calls (LL2 allows ~15 anonymous requests per hour) |
| `MISSIONWATCH_FRESHNESS_STALE_AFTER` | `PT2H` | Data older than this is flagged `stale` |
| `MISSIONWATCH_CORS_ALLOWED_ORIGINS` | `http://localhost:4200, https://missionwatch.jaghan.com` | Browser origins allowed to call the API (comma-separated) |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/launches/upcoming?limit=` | Upcoming launches, soonest first |
| GET | `/api/launches/previous?limit=` | Past launches, most recent first |
| GET | `/api/launches/search` | `q`, `status` (repeatable), `provider` (repeatable), `from`, `to` (yyyy-mm-dd, UTC, inclusive), `sort` (time, name, provider), `direction` (asc, desc), `limit` (max 200) |
| GET | `/api/launches/{id}` | Mission details with schedule history. Unknown ids are looked up at LL2 once. |
| GET | `/api/launches/{id}/history` | Observed schedule snapshots, oldest first |
| GET | `/api/providers` | Providers, by name |

Responses use the `{ data, meta }` envelope and errors use the shape in [docs/api.md](../../docs/api.md).

## Adding to the code

- **New endpoint:** a controller method calls a service. Controllers never use repositories (enforced by `ArchitectureTest`).
- **Schema change:** add a new `src/main/resources/db/migration/V<n>__<what>.sql`. Never edit a migration that has been merged.
- **New data source:** add a sibling of `ingest/ll2/` that maps into `LaunchView` and writes through `LaunchStore`.
- **Mapping change:** update `Ll2Mapper` and the frontend's `ll2-mapper.ts` together, with tests on both sides.
