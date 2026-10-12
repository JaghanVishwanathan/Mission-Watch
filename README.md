# MissionWatch

**Space mission intelligence platform.** Explore upcoming and historical rocket launches, follow how launch schedules change over time and investigate evidence-based launch analytics.

> **Status: Phase 2 (real data).** Launches come live from [Launch Library 2](https://thespacedevs.com/llapi), mission imagery from the [NASA Image and Video Library](https://images.nasa.gov), and historical statistics from Jonathan McDowell's [GCAT](https://planet4589.org/space/gcat) (CC BY 4.0). The backend arrives in Phase 4.

## Highlights

- **Dashboard:** the next launch with a live countdown, upcoming and recent launches, featured missions, and real launch statistics for this year and all time.
- **Launch Explorer:** search, status, provider and date filters, sorting, and grid or list views. Filter state lives in the URL, so views are shareable.
- **Mission detail:** the published mission timeline, sourced launch updates, vehicle specifications, webcasts, credited launch imagery and related NASA photos. Dates are shown only to the precision the source knows, and missing data is labelled *Unavailable*, never invented.
- **Live Mission Control (`/live`):** Everyday Astronaut, NASASpaceflight and SpaceX broadcasts side by side, an audio selector, YouTube Live Chat and the SpaceX discussion on X in a large 2×2 grid, plus a mission countdown and timeline from Launch Library 2. Third-party players load only after the viewer allows them, and a stream is marked *Live* only when the platform reports it.
- **Analytics:** every orbital launch attempt since 1957: launches per year and month, provider volume and outcome distribution in Apache ECharts. Every chart has a table view, and success rates are withheld for small samples.
- **Rate-limit aware:** Launch Library 2 allows about 15 requests per hour per visitor, so responses are cached in the browser. When a refresh fails, the page shows the saved copy and labels it.
- **Transparency:** source and freshness on every block of data, licence credits, a data sources page that documents how source data is interpreted, and a clear split between measured, derived and estimated values.
- **Accessible and responsive:** keyboard navigation, a skip link, visible focus, status shown by icon and text (not colour alone), reduced-motion support, dark and light themes, and mobile layouts.

## Tech stack

| Area | Stack |
|---|---|
| Frontend | Angular 22 (standalone, zoneless, signals, `rxResource`), TypeScript, RxJS, SCSS design tokens, Apache ECharts, Vitest |
| Data sources | Launch Library 2 (live), NASA Image and Video Library (live), GCAT (build-time snapshot) |
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
npm run data:history    # download GCAT and build public/data/launch-history.json (needed for Analytics)
npm start               # http://localhost:4200
npm test -- --watch=false
npm run build
```

## Updating Live Mission Control for a launch

Every stream link is in one file: [`frontend/missionwatch-web/src/app/features/live/live-mission.config.ts`](frontend/missionwatch-web/src/app/features/live/live-mission.config.ts). Before a launch:

1. Paste the Everyday Astronaut and NASASpaceflight YouTube livestream URLs, video IDs or full `<iframe>` embed codes into `video`.
2. Paste the SpaceX broadcast (`https://x.com/i/broadcasts/…` or X's full `twitter-broadcast` embed code) into `broadcastUrl`. Without a broadcast, a post URL in `postUrl` is embedded instead.
3. Optionally set `launch.ll2LaunchId` to pin a launch. Otherwise the page follows the next SpaceX launch.

Commit and push to `main`; the Pages workflow redeploys. Empty links are fine: the panel shows *Unavailable* with a link to the channel.

## Deployment

On every push to `main`, `.github/workflows/deploy-pages.yml` builds the frontend and publishes it to GitHub Pages. To enable it, go to the repository's **Settings → Pages** and set **Source** to **GitHub Actions**. The site is live at **https://missionwatch.jaghan.com**: a DNS `CNAME` record named `missionwatch` on `jaghan.com` points to `jaghanvishwanathan.github.io`, and `missionwatch.jaghan.com` is entered under **Settings → Pages → Custom domain** with **Enforce HTTPS** turned on. The build uses `--base-href /` because the app sits at the root of that domain. The workflow builds a fresh GCAT snapshot on every deploy and rebuilds weekly.

## Documentation

- [Software Requirements Specification](docs/SRS.md)
- [Live Mission Control SRS](docs/live-mission-control-srs.md)
- [Architecture and roadmap](docs/architecture.md)
- [API (planned)](docs/api.md)

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Frontend foundation | ✅ |
| 2 | Launch Library 2, NASA media and GCAT history | ✅ |
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
