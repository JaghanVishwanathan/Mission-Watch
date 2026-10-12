# missionwatch-api

Spring Boot REST API — **planned for Phase 4** (see [SRS §4.2, §8, §9](../../docs/SRS.md)).

Planned stack: Java 21, Spring Boot 3 (Web, Data JPA, Security, Validation, Scheduling), Flyway, PostgreSQL, Caffeine.

Responsibilities:

- Adapters for Launch Library 2, NASA and optional providers, normalised into internal models.
- Caching and scheduled refreshes that respect upstream rate limits.
- Launch schedule snapshot collection (FR-07).
- Endpoints listed in [docs/api.md](../../docs/api.md).
