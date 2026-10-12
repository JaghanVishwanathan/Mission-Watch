# Software Requirements Specification (SRS)
## Mission Watch — Live Mission Control

| Field | Value |
|---|---|
| Feature ID | `MW-FEAT-LIVE-001` |
| Document type | Feature-level SRS |
| Version | 1.0 |
| Status | Implemented (initial release) |
| Application | Mission Watch |
| Route | `/live` |
| Hosting | GitHub Pages |

> **Per-launch configuration:** all stream and embed links live in
> `frontend/missionwatch-web/src/app/features/live/live-mission.config.ts`.

## 1. Introduction

### 1.1 Purpose

The Live Mission Control feature will provide a centralized spaceflight monitoring interface within Mission Watch, enabling users to watch three independent broadcasts simultaneously while following mission events and participating in the associated online discussions.

The feature will integrate:

- Everyday Astronaut — YouTube livestream.
- NASASpaceflight — YouTube livestream.
- SpaceX — official X broadcast or embedded post where supported.
- YouTube Live Chat for a selected YouTube stream.
- X discussion access associated with the SpaceX broadcast.
- A mission timeline showing countdowns, planned milestones, and confirmed events.

### 1.2 Scope

The feature will be implemented as a dedicated `/live` page within the existing Angular application. It must work with GitHub Pages static hosting and must not require a new backend for basic embedding functionality.

Mission event data may use the existing Mission Watch data services or a configured mission data API. The timeline must remain functional even when a video feed is unavailable.

### 1.3 Objectives

1. Display all three broadcast panels simultaneously.
2. Maintain a shared, mission-specific event timeline.
3. Integrate native YouTube Live Chat and provide access to SpaceX's X discussion.
4. Support responsive layouts and graceful fallbacks.
5. Clearly distinguish verified live status from scheduled, offline, or unknown status.
6. Minimize unnecessary resource consumption and avoid overlapping audio.

## 2. Functional Requirements

Priority definitions: **P0** = essential for release; **P1** = important enhancement.

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | The system shall provide a dedicated Live Mission Control page at `/live`. | P0 |
| FR-002 | The system shall display all three stream panels simultaneously on desktop. | P0 |
| FR-003 | The system shall embed the Everyday Astronaut YouTube stream when available and embeddable. | P0 |
| FR-004 | The system shall embed the NASASpaceflight YouTube stream when available and embeddable. | P0 |
| FR-005 | The system shall embed the official SpaceX X broadcast or a supported embedded post. | P0 |
| FR-006 | The system shall provide an external viewing link whenever a stream cannot be played inline. | P0 |
| FR-007 | The system shall display a mission timeline with countdowns, milestones, and event status. | P0 |
| FR-008 | The system shall integrate YouTube Live Chat for a selected YouTube stream when supported. | P0 |
| FR-009 | The system shall provide access to the corresponding SpaceX X discussion. | P0 |
| FR-010 | The system shall support switching between the two YouTube chat sources. | P1 |
| FR-011 | The system shall provide an audio-source selector intended to mute other controllable players when a source is selected. | P0 |
| FR-012 | The system shall preserve the timeline when streams fail or become unavailable. | P0 |
| FR-013 | The system shall display source attribution and the original broadcaster's identity. | P0 |
| FR-014 | The system shall support mobile, tablet, and desktop layouts. | P0 |
| FR-015 | The system shall allow stream URLs and video IDs to be updated through configuration without modifying the dashboard layout. | P1 |

## 3. User Interface Requirements

### 3.1 Desktop Layout

1. **Header and mission selector:** mission name, launch vehicle, coverage status.
2. **Mission timeline:** countdown, planned and confirmed milestones, event status and timestamps.
3. **Three stream panels:** Everyday Astronaut, NASASpaceflight, SpaceX on X.
4. **Community panel:** YouTube Chat, SpaceX on X discussion.

### 3.2 Responsive Behavior

- **Desktop:** All three stream panels visible in one row when viewport space permits.
- **Tablet:** Responsive two-column or stacked arrangement without removing access to any stream.
- **Mobile:** Vertically stacked stream panels, with timeline and community sections accessible.
- The selected chat source shall be switchable without navigating away from the dashboard.
- Users must be able to open any stream on its original platform.

### 3.3 Stream States

Every stream shall support: `LOADING`, `LIVE` (verified), `SCHEDULED`, `OFFLINE`, `UNAVAILABLE`, `UNKNOWN`.

A stream must not be marked `LIVE` merely because an iframe has loaded successfully.

## 4. Mission Timeline Requirements

### 4.1 Timeline Events

Where applicable: launch countdown and target time, terminal countdown, liftoff, stage separation, fairing separation, booster landing or recovery, orbit insertion, mission completion. Events must be configurable by mission; no vehicle is assumed to share another's flight profile.

### 4.2 Event Data Model

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique event identifier |
| `missionId` | String | Associated mission |
| `title` | String | Human-readable event name |
| `plannedAt` | ISO 8601 datetime | Scheduled event time |
| `actualAt` | ISO 8601 datetime or `null` | Confirmed event time |
| `status` | Enum | Planned, imminent, completed, delayed, cancelled, or unknown |
| `source` | String | Data provider or authorized manual source |
| `updatedAt` | ISO 8601 datetime | Last update time |

### 4.3 Timeline Behavior

- The countdown shall use the target event time and update locally.
- Time calculations shall use UTC internally and display the user's local time where appropriate.
- Schedule changes must update the countdown when new data becomes available.
- Planned events shall not be represented as completed until completion is confirmed.
- The timeline shall show when event data was last updated.
- If the data source becomes unavailable, the last known information may be displayed with a stale-data indicator.
- Stream playback must not be treated as an authoritative source of mission-event confirmation.

## 5. Livestream Requirements

### 5.1 YouTube Integration

Official iframe player; configurable video ID or URL; native playback, fullscreen and audio controls; direct link to the original broadcast; handling of disabled embedding, removed videos, ended streams and playback errors; Live Chat embedded separately when supported.

### 5.2 SpaceX X Integration

Prefer the official SpaceX broadcast or post via X's supported embeds; external X link when inline playback is unavailable; never scrape, extract or rehost video; do not assume an embedded post grants access to the video or conversation; show `UNAVAILABLE` if the broadcast cannot be embedded while the rest of the dashboard keeps working.

### 5.3 Parallel Playback and Audio

All three panels remain visible and independently usable. Players initialize without a featured stream, start muted where supported, and respect autoplay restrictions. A preferred audio-source selector mutes other controllable players. Native X controls may limit audio exclusivity. Simultaneous playback is not guaranteed across browsers.

## 6. Community Integration Requirements

### 6.1 YouTube Live Chat

Select Everyday Astronaut or NASASpaceflight chat via `https://www.youtube.com/live_chat?v=VIDEO_ID&embed_domain=YOUR_DOMAIN`. The hostname must match the deployed site; native sign-in is preserved; an unavailable state is shown when the stream is not live or chat is disabled; mobile offers a direct YouTube link because embedded Live Chat is not supported on mobile web.

### 6.2 X Discussion

Embedded official post when supported, direct link to the post or broadcast, participation through X's own interface, no promise of full live chat, and a fallback when the embed cannot load.

### 6.3 Authentication and Moderation

Mission Watch collects no YouTube or X credentials, builds no messaging backend, and proxies no messages.

## 7. Technical Architecture

```text
Angular — Live Mission Control
├── Dashboard
├── Stream Manager
├── Mission Timeline
└── Community Panel
    ├── YouTube Live Chat
    └── X Discussion

External integrations
├── YouTube iframe players
├── Supported X embeds
└── Mission data API or configured launch data
```

Frontend: Angular, TypeScript, CSS Grid/Flexbox. Hosting: GitHub Pages via GitHub Actions. Private credentials stay server-side.

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-001 | The dashboard shall remain navigable when one or more feeds fail. |
| NFR-002 | The layout shall support modern desktop and mobile browsers. |
| NFR-003 | The page shall provide loading indicators and meaningful error messages. |
| NFR-004 | The application shall avoid unnecessary player initialization and resource usage. |
| NFR-005 | Mission-event times shall be calculated consistently and handle timezone changes. |
| NFR-006 | The page shall provide accessible labels, keyboard navigation, and sufficient contrast. |
| NFR-007 | External links shall clearly identify their destination. |
| NFR-008 | Third-party content shall respect applicable privacy and consent requirements. |
| NFR-009 | The page shall retain useful mission information when third-party services are unavailable. |

## 9. Privacy, Legal, and Platform Constraints

Official embeds only; respect broadcaster restrictions and platform terms; no downloading or rehosting; clear attribution; a consent step before loading third-party content (German/EU data protection); no promise of chat participation in every browser; external viewing links always available.

## 10. Acceptance Criteria

- **AC-01:** All three stream panels are visible simultaneously on desktop.
- **AC-02:** Each YouTube panel plays an eligible embedded broadcast with native controls.
- **AC-03:** The SpaceX panel plays an eligible X broadcast or displays a working external fallback.
- **AC-04:** The mission countdown updates correctly from the configured target time.
- **AC-05:** Planned events and confirmed events are visually distinguishable.
- **AC-06:** The user can select either YouTube stream's chat when available.
- **AC-07:** The SpaceX discussion panel provides a supported embed or direct X link.
- **AC-08:** Failure of one feed does not remove the other streams or mission timeline.
- **AC-09:** The interface works at desktop, tablet, and mobile viewport sizes.
- **AC-10:** The production build deploys successfully to the GitHub Pages project path.

## 11. Out of Scope

Custom chat or accounts; rehosting or recording video; guaranteed playback of unsupported X broadcasts; verifying mission events from video; synchronized playback between broadcasters.

## 12. Definition of Done

One dedicated page where three broadcast panels operate in parallel, the mission timeline continues independently, viewers can reach the selected YouTube chat and the SpaceX discussion, and failures in individual third-party integrations do not break the overall experience.
