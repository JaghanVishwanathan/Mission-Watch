# MissionWatch

**Space mission intelligence platform.** Explore upcoming and historical rocket launches, follow how launch schedules change over time and investigate evidence-based launch analytics.

> **Status: Phase 1 (frontend foundation).** The Angular app runs on a bundled **demo dataset**. Its launches and statistics are illustrative and are labelled that way in the UI. Live data integration is Phase 2.

## Highlights

- **Dashboard:** the next launch with a live countdown, upcoming and recent launches, featured missions and activity statistics.
- **Launch Explorer:** search, status, provider and date filters, sorting, and grid or list views. Filter state lives in the URL, so views are shareable.
- **Mission detail:** objectives, payload, vehicle specifications, a milestone timeline with estimated timings flagged, and schedule-change history. Missing data is labelled *Unavailable*, never invented.
- **Analytics:** launches per year and month, provider volume and outcome distribution in Apache ECharts. Every chart has a table view, and success rates are withheld for small samples.
- **Transparency:** freshness indicators on all data, a data sources page, and a clear split between measured, derived and estimated values.
- **Accessible and responsive:** keyboard navigation, a skip link, visible focus, status shown by icon and text (not colour alone), reduced-motion support, dark and light themes, and mobile layouts.

## Tech stack

| Area | Stack |
|---|---|
| Frontend | Angular 22 (standalone, zoneless, signals, `rxResource`), TypeScript, RxJS, SCSS design tokens, Apache ECharts, Vitest |
| Backend (Phase 4) | Java, Spring Boot, Spring Data JPA, Spring Security, Flyway, PostgreSQL |
| Data science (Phases 5–6) | Python, pandas, scikit-learn, XGBoost, SHAP, FastAPI |
| CI/CD | GitHub Actions, GitHub Pages |

## Repository layout

```text
frontend/missionwatch-web/   Angular application
backend/missionwatch-api/    Spring Boot API (planned)
data-science/                Pipeline, notebooks and models (planned)
docs/                        SRS, architecture, API
deployment/docker/           Container definitions (planned)
.github/workflows/           CI and Pages deployment
```

## Getting started

Prerequisite: Node.js 24 LTS (or 22.22+).

```bash
cd frontend/missionwatch-web
npm ci
npm start               # http://localhost:4200
npm test -- --watch=false
npm run build
```

## Deployment

On every push to `main`, `.github/workflows/deploy-pages.yml` builds the frontend and publishes it to GitHub Pages. To enable it, go to the repository's **Settings → Pages** and set **Source** to **GitHub Actions**. The site is then served at `https://<user>.github.io/missionwatch/`.

## Documentation

- [Software Requirements Specification](docs/SRS.md)
- [Architecture and roadmap](docs/architecture.md)
- [API (planned)](docs/api.md)

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Frontend foundation | ✅ |
| 2 | Launch Library 2 and NASA media integration | ⏳ |
| 3 | Interactive CesiumJS globe, Mission Story Mode | ⏳ |
| 4 | Spring Boot backend, PostgreSQL | ⏳ |
| 5 | Historical data pipeline, schedule snapshots | ⏳ |
| 6 | Data science and ML (gated on data sufficiency) | ⏳ |
| 7 | Launch Intelligence, watchlists, notifications | ⏳ |
| 8 | Deployment and portfolio polish | ⏳ |

## Disclaimer

MissionWatch is an independent project. It does not replace official launch-provider announcements and does not provide safety advice.

## License

[MIT](LICENSE)
