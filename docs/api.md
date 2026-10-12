# API

> **Status:** planned. The backend arrives in Phase 4. Until then the frontend uses an in-memory mock that implements the same contract (`LaunchDataSource` in `frontend/missionwatch-web/src/app/core/data/`).

## Endpoints (SRS §8.1)

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/launches/upcoming` | Upcoming launches | — |
| GET | `/api/launches/previous` | Historical launches | — |
| GET | `/api/launches/{id}` | Mission details | — |
| GET | `/api/launches/search` | Search launches | — |
| GET | `/api/launches/{id}/history` | Schedule snapshots | — |
| GET | `/api/analytics/summary` | Summary statistics | — |
| GET | `/api/analytics/launches` | Filtered launch analytics | — |
| GET | `/api/analytics/providers` | Provider comparison | — |
| GET | `/api/missions/{id}/milestones` | Mission milestones | — |
| GET | `/api/missions/{id}/related` | Related missions | — |
| GET | `/api/launches/{id}/risk` | Validated prediction, if available | — |
| GET | `/api/models/current` | Active model metadata | — |
| GET | `/api/models/evaluation` | Model evaluation | — |
| GET | `/api/users/me/watchlist` | User watchlist | ✔ |
| POST | `/api/users/me/watchlist` | Add to watchlist | ✔ |
| DELETE | `/api/users/me/watchlist/{id}` | Remove from watchlist | ✔ |
| GET | `/api/users/me/notifications` | Notifications | ✔ |

## Response envelope

Every external-data response carries metadata (SRS §8.2):

```json
{
  "data": { },
  "meta": {
    "source": "Launch Library 2",
    "lastRefresh": "2026-10-12T09:00:00Z",
    "dataTimestamp": "2026-10-12T08:55:00Z",
    "cacheStatus": "HIT",
    "warnings": ["Payload details unavailable for 3 launches"]
  }
}
```

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
