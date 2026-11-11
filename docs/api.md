# API

> **Status:** Phase 4. The endpoints marked *Live* are implemented in `backend/missionwatch-api` (interactive docs at `/swagger-ui.html` when it runs). The rest arrive with the phase shown. The frontend reaches the API through `BackendLaunchDataService`, which implements the same `LaunchDataSource` contract as the browser-only adapter.

## Endpoints (SRS §8.1)

| Method | Endpoint | Purpose | Auth | Status |
|---|---|---|---|---|
| GET | `/api/launches/upcoming` | Upcoming launches | — | Live |
| GET | `/api/launches/previous` | Historical launches | — | Live |
| GET | `/api/launches/{id}` | Mission details | — | Live |
| GET | `/api/launches/search` | Search launches | — | Live |
| GET | `/api/launches/{id}/history` | Schedule snapshots | — | Live |
| GET | `/api/providers` | Launch providers (feeds the Explorer filter) | — | Live |
| GET | `/api/analytics/summary` | Summary statistics | — | Phase 5 (GCAT snapshot in the browser until then) |
| GET | `/api/analytics/launches` | Filtered launch analytics | — | Phase 5 (GCAT snapshot in the browser until then) |
| GET | `/api/analytics/providers` | Provider comparison | — | Phase 5 (GCAT snapshot in the browser until then) |
| GET | `/api/missions/{id}/milestones` | Mission milestones | — | Phase 3 |
| GET | `/api/missions/{id}/related` | Related missions | — | Phase 3 |
| GET | `/api/launches/{id}/risk` | Validated prediction, if available | — | Phase 6 |
| GET | `/api/models/current` | Active model metadata | — | Phase 6 |
| GET | `/api/models/evaluation` | Model evaluation | — | Phase 6 |
| GET | `/api/users/me/watchlist` | User watchlist | ✔ | Phase 7 |
| POST | `/api/users/me/watchlist` | Add to watchlist | ✔ | Phase 7 |
| DELETE | `/api/users/me/watchlist/{id}` | Remove from watchlist | ✔ | Phase 7 |
| GET | `/api/users/me/notifications` | Notifications | ✔ | Phase 7 |

## Response envelope

Every external-data response carries metadata (SRS §8.2):

```json
{
  "data": [ { "id": "97c6f5e1-…", "missionName": "Starlink Group 15-25", "status": "go", "…": "…" } ],
  "meta": {
    "source": "Launch Library 2 (The Space Devs)",
    "sourceUrl": "https://thespacedevs.com/llapi",
    "lastRefresh": "2026-11-11T09:00:00Z",
    "warnings": ["1 launch record was incomplete and skipped."],
    "isMock": false,
    "stale": true
  }
}
```

- `data` uses the frontend's models (`Launch`, `Provider`, `LaunchSnapshot` in `frontend/missionwatch-web/src/app/core/models`). Fields with no value are omitted, never sent as `null` or invented.
- `lastRefresh` is the last successful refresh from the source.
- `stale` is present (and `true`) only when the latest refresh failed or the data is older than the freshness limit. `warnings` then says why.

## Errors

```json
{
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Launch not found",
  "path": "/api/launches/abc",
  "timestamp": "2026-10-12T09:00:00Z"
}
```

All timestamps are ISO-8601 in UTC. The client converts them to the user's local timezone.
