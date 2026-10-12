# MissionWatch
## Software Requirements Specification (SRS)

**Project:** MissionWatch — Space Mission Intelligence Platform  
**Version:** 1.0  
**Status:** Initial specification  
**Application Type:** Full-stack web application  
**Primary Focus:** Angular frontend, interactive visualisation, data science and machine learning  
**Repository:** GitHub  
**Deployment Target:** Publicly accessible website

---

## 1. Introduction

### 1.1 Purpose

MissionWatch is a web-based space mission intelligence platform that enables users to explore upcoming and historical rocket launches, understand mission objectives, visualize launch trajectories, investigate launch statistics, and analyse schedule changes.

Unlike conventional launch-calendar websites, MissionWatch will combine interactive geospatial visualization, educational mission timelines, historical launch analytics, and explainable machine learning.

The platform will provide a unified interface for exploring space missions while presenting data provenance, uncertainty and model limitations transparently.

### 1.2 Problem Statement

Existing launch-tracking websites commonly focus on upcoming launches, countdowns, launch providers and mission descriptions.

Although these features are useful, they do not necessarily provide a unified experience for:

- Understanding where a mission is going and how it relates to Earth, the Moon or other destinations.
- Exploring mission milestones through interactive visual timelines.
- Tracking changes between original and revised launch schedules.
- Investigating historical launch trends and provider performance.
- Estimating postponement risk using historical data.
- Understanding the factors influencing machine-learning predictions.

MissionWatch aims to bridge these gaps through an integrated space exploration and analytical platform.

### 1.3 Project Objectives

The project shall:

1. Provide a modern, responsive and accessible Angular website.
2. Integrate real launch information and relevant NASA datasets.
3. Visualize missions using an interactive globe and mission-specific detail pages.
4. Preserve historical schedule snapshots to identify changes over time.
5. Provide descriptive and statistical analysis of launch activity.
6. Develop an evaluated machine-learning model for launch postponement risk, subject to data availability.
7. Explain model predictions using interpretable techniques such as SHAP.
8. Allow users to save missions, configure preferences and receive relevant notifications.
9. Demonstrate production-oriented frontend engineering, backend development, data engineering and applied data science.
10. Support public deployment through a GitHub-based development and CI/CD workflow.

### 1.4 Scope

**In scope**

- Upcoming and historical launch exploration.
- Rocket, provider, payload, mission and launch-site information.
- Interactive 3D globe and mission visualization.
- Mission milestones and educational explanations.
- Schedule-change tracking.
- Launch statistics and comparisons.
- Data science experiments and model evaluation.
- Optional validated delay-risk predictions.
- User accounts, watchlists and notifications.
- Responsive layouts, accessibility, testing and deployment.

**Out of scope for the initial release**

- Operating or controlling spacecraft.
- Providing official launch authorization or safety advice.
- Guaranteeing launch visibility or launch-time accuracy.
- Predicting exact launch outcomes without sufficient evidence.
- Reconstructing precise orbital trajectories without suitable source data.
- Replacing official launch-provider announcements.

---

## 2. Target Users

### 2.1 Space Enthusiasts

Users interested in rocket launches, spacecraft, mission objectives and space exploration.

### 2.2 Students and Researchers

Users interested in launch statistics, mission histories, orbital concepts and spaceflight datasets.

### 2.3 Data Science Enthusiasts

Users interested in statistical analysis, prediction models, feature engineering, explainability and evaluation.

### 2.4 Launch Watchers

Users who want to follow specific missions, monitor schedule changes and discover official viewing information.

---

## 3. System Overview

MissionWatch shall use a modular architecture consisting of a web frontend, a Java backend, a relational database, external data providers and a Python data science service.

### 3.1 High-Level Architecture

```text
                    External Data Providers
                ┌────────────┼─────────────┐
                │            │             │
          Launch Library    NASA      Weather / News
                │            │             │
                └────────────┼─────────────┘
                             ▼
                    Spring Boot Backend
                ┌────────────┼─────────────┐
                │            │             │
             REST API     Data Cache   Scheduled Jobs
                │            │             │
                └────────────┼─────────────┘
                             ▼
                       PostgreSQL
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
           Angular Frontend       Python ML Service
           ├─ Mission Globe       ├─ Training Pipeline
           ├─ Launch Explorer      ├─ Prediction API
           ├─ Mission Details      └─ Model Evaluation
           ├─ Analytics
           └─ User Watchlists
```

### 3.2 Architectural Principles

- Separate presentation, business logic and data processing.
- Keep external API credentials on the server where applicable.
- Normalize third-party responses into internal data models.
- Cache external data to reduce unnecessary requests.
- Keep machine-learning training separate from online inference.
- Make model outputs traceable to a model version and training dataset.
- Treat external source data as potentially incomplete or outdated.
- Ensure that the core application remains usable when optional integrations fail.

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Purpose |
|---|---|
| Angular | Application framework |
| TypeScript | Strongly typed application logic |
| Angular Signals | Local and derived UI state |
| RxJS | Asynchronous data streams and API operations |
| Angular Router | Navigation and lazy-loaded feature routes |
| SCSS | Styling and design system |
| CesiumJS | Interactive 3D globe and geospatial visualization |
| Apache ECharts | Analytics, time series and statistical charts |
| Angular CDK | Accessible UI behaviours and overlays where required |
| Vitest or the selected Angular test runner | Unit testing |

The frontend shall be the primary product experience. It must prioritize visual consistency, responsiveness, smooth interaction, accessibility and meaningful loading states.

### 4.2 Backend

| Technology | Purpose |
|---|---|
| Java | Backend programming language |
| Spring Boot | REST API and application services |
| Spring Web | HTTP endpoints |
| Spring Data JPA | Database persistence |
| Spring Security | Authentication and authorization |
| Bean Validation | Request validation |
| Flyway | Database schema migrations |
| PostgreSQL | Persistent application data |
| Spring scheduling | Periodic data collection and processing |
| Caffeine or another suitable cache | Application-level caching |

### 4.3 Data Science and Machine Learning

| Technology | Purpose |
|---|---|
| Python | Data processing and modelling |
| Pandas | Data cleaning and transformation |
| NumPy | Numerical computation |
| Matplotlib | Exploratory data visualisation |
| scikit-learn | Baseline models and evaluation |
| XGBoost | Optional gradient-boosted model |
| SHAP | Prediction explainability |
| FastAPI | Optional model inference service |
| Jupyter Notebook | Exploration and experimentation |

### 4.4 Development and Deployment

- Git and GitHub for version control.
- GitHub Actions for continuous integration and deployment.
- Docker for reproducible backend and ML environments.
- OpenAPI/Swagger for API documentation.
- Environment variables for deployment configuration.
- GitHub Pages for the Angular frontend.
- A Java-capable hosting service for Spring Boot.
- Managed PostgreSQL hosting.
- Optional Python-capable hosting for the ML service.

Hosting providers must support the required runtime, network access, storage and background processing. GitHub Pages cannot execute Spring Boot or Python services.

---

## 5. External APIs and Data Sources

### 5.1 Launch Library 2

**Documentation:** https://ll.thespacedevs.com/docs/

Primary source for launch schedules and launch metadata.

Expected data, subject to endpoint availability:

- Launch identifier.
- Mission name and description.
- Scheduled launch time.
- Launch status.
- Launch provider and agency.
- Rocket configuration.
- Payload details.
- Launch-site information.
- Related images, videos and links where available.
- Historical launch records and recorded outcomes.

The backend shall cache responses and respect provider rate limits.

### 5.2 NASA Image and Video Library

**Documentation:** https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf

Used to retrieve spaceflight photographs, mission imagery and related media.

The application shall retain attribution and source links where required.

### 5.3 NASA APIs

**Portal:** https://api.nasa.gov/

Used to enrich the application with relevant scientific and astronomical information.

Possible integrations include Astronomy Picture of the Day and other appropriate NASA data products. API availability, access policies and rate limits shall be checked during implementation.

### 5.4 NASA and JPL Orbital Data

**JPL Small-Body Database API:** https://ssd-api.jpl.nasa.gov/

May be used for supplementary asteroid and orbital information where it supports a mission page or educational feature.

### 5.5 Weather Data

**Open-Meteo:** https://open-meteo.com/en/docs

Optional source for historical weather observations or forecasts at launch sites.

Weather data may be used for exploratory analysis and viewing-condition estimates. It must not be treated as proof that weather caused a postponement.

### 5.6 Spaceflight News API

**API:** https://api.spaceflightnewsapi.net/

Optional source for related spaceflight news articles.

Article summaries and links shall identify their original sources. Availability, licensing and rate limits must be verified before production use.

### 5.7 Data Integration Requirements

- External responses shall be validated before persistence.
- Missing optional fields shall not break page rendering.
- Dates shall be stored in UTC and displayed in the user's local timezone.
- Each source record shall retain its external identifier.
- Data freshness shall be visible where relevant.
- Conflicting schedule information shall not be silently combined.
- Provider-specific statuses shall be mapped carefully to internal statuses.
- The application shall distinguish actual data from estimates and illustrative visualizations.

---

## 6. Functional Requirements

### FR-01: Home Dashboard

The system shall provide a landing dashboard showing:

- Upcoming launches.
- Recently completed launches.
- Featured missions.
- Launch activity statistics.
- Relevant mission imagery.
- Shortcuts to analytics and the interactive globe.
- Data freshness indicators.

Users shall be able to navigate from each launch card to its corresponding mission detail page.

### FR-02: Launch Explorer

The system shall provide a searchable and filterable launch catalogue.

Users shall be able to:

- Search by mission name, provider or rocket.
- Filter by date range.
- Filter by launch status.
- Filter by launch provider.
- Sort by launch time or other supported fields.
- Switch between list and alternative visual layouts.
- Open a selected launch for additional information.

Search and filtering shall work on the normalized application data rather than depend on the external provider's interface.

### FR-03: Mission Detail Page

Each mission page shall display available information about:

- Mission objectives.
- Scheduled launch date and status.
- Rocket and launch provider.
- Launch site.
- Payload and destination.
- Related images and videos.
- Relevant mission milestones.
- Related articles and official source links.
- Historical schedule changes, once available.
- Relevant analytics or model estimates, when available and validated.

Unavailable information shall be labelled as unavailable rather than fabricated.

### FR-04: Interactive Mission Globe

The system shall provide an interactive globe using CesiumJS or an equivalent suitable library.

Users shall be able to:

- Rotate and zoom the globe.
- Select launch-site markers.
- View available destination information.
- Filter displayed missions.
- Open mission details from selected markers.
- Explore mission-specific trajectories when suitable data is available.
- View explanatory trajectory animations where actual data is unavailable, provided they are clearly labelled as illustrative.

The globe shall not imply that illustrative paths represent precise orbital mechanics.

### FR-05: Mission Story Mode

The system shall present mission milestones in a visual timeline.

Possible milestones include:

- Launch preparation.
- Liftoff.
- Stage separation.
- Fairing separation.
- Spacecraft deployment.
- Orbital insertion.
- Landing or mission arrival.

Only milestones relevant to the selected mission shall be displayed. Timing shall be sourced from mission-specific information or explicitly marked as estimated.

### FR-06: Historical Launch Analytics

The system shall provide interactive analytics for historical launch records.

The analytics module shall include:

- Launch counts by month and year.
- Launch counts by provider and launch site.
- Outcome distributions.
- Historical launch cadence.
- Provider comparisons.
- Trends in postponements, where schedule history permits.
- Filters by date, provider and mission category.

Statistical comparisons shall include sample sizes where useful. The interface shall avoid presenting small-sample differences as conclusive rankings.

### FR-07: Schedule Change Tracking

The backend shall periodically store launch schedule snapshots.

Each snapshot should include:

- Launch identifier.
- Observed scheduled time.
- Observation timestamp.
- Source identifier.
- Available launch status.
- Relevant source metadata.

The system shall compare snapshots to identify changes.

The interface shall display the original observed schedule, subsequent changes and latest known schedule.

A schedule change shall not automatically be described as a delay caused by technical failure or weather. A causal explanation shall only be displayed when supported by a reliable source.

### FR-08: User Accounts and Preferences

If authentication is enabled, users shall be able to:

- Register and log in.
- Manage their profile and preferences.
- Save favourite launches.
- Create personal mission collections.
- Configure notification preferences.
- Remove saved data.
- Log out securely.

User-specific data shall be accessible only to the authorized user.

### FR-09: Mission Watchlist and Notifications

Users shall be able to follow selected missions.

The notification system shall support relevant events such as:

- Schedule changes.
- Status changes.
- New information for a followed mission.
- Upcoming launch reminders.

The initial implementation may support in-application notifications, with email notifications introduced later.

Notifications shall be deduplicated and shall include source information when available.

### FR-10: Launch Intelligence Analytics

The system shall provide a dedicated Launch Intelligence section containing:

- Historical launch trends.
- Postponement analysis.
- Provider and rocket-family comparisons.
- Data quality indicators.
- Model evaluation results.
- Explainability visualizations where supported.
- Model and dataset version information.

This section shall remain useful even if the predictive model is not yet reliable enough for production.

### FR-11: Launch Delay Risk Prediction

The system shall optionally estimate the probability that a launch will be postponed within a defined prediction window.

The initial target shall be defined precisely, for example:

**Will a scheduled launch be postponed within the next seven days?**

The prediction service shall:

- Use only features available at prediction time.
- Return a probability when a validated model is available.
- Return the model version and prediction timestamp.
- Expose an explicit unavailable state if prediction cannot be produced.
- Provide calibrated probabilities where possible.
- Avoid unsupported guarantees about launch outcomes.

Potential model inputs include launch site, provider, rocket family, mission category, time until launch and previous postponements.

A prediction shall not be enabled for public use until the model has been evaluated on appropriately separated, chronologically later data.

### FR-12: Model Explainability

The system shall use SHAP or a comparable method to explain model predictions.

Where supported, the interface shall display:

- Important contributing features.
- The direction of their influence.
- Feature values relevant to the prediction.
- Model limitations and evaluation results.

Explanations shall not claim that a feature caused a postponement. Model explanations describe the behaviour of the model, not necessarily real-world causation.

### FR-13: Data Source Transparency

The application shall provide a data sources section.

It shall document:

- External providers.
- Data update frequency.
- Known limitations.
- Attribution requirements.
- Model training period.
- Model evaluation methodology.
- The distinction between measured data, derived data and estimates.

---

## 7. Data Science Requirements

### 7.1 Data Collection

The pipeline shall collect historical launch records and preserve subsequent schedule observations.

Because an API's current launch schedule may overwrite older values, historical schedule snapshots shall be stored independently.

### 7.2 Data Cleaning

The pipeline shall:

- Normalize timestamps.
- Standardize categorical values.
- Handle missing data explicitly.
- Detect duplicate records.
- Validate outcome labels.
- Document assumptions.
- Record data collection dates.
- Preserve source identifiers for traceability.

### 7.3 Exploratory Data Analysis

Exploratory analysis shall investigate:

- Launch cadence over time.
- Launch distribution by provider and site.
- Outcome distributions.
- Postponement frequencies where observable.
- Differences between launch categories.
- Missingness and data quality.
- Potential class imbalance.

### 7.4 Machine-Learning Models

The project shall begin with interpretable baselines and progress to more complex models only where justified.

Candidate models:

1. Logistic Regression.
2. Random Forest.
3. XGBoost, if it offers meaningful improvements.

The final model shall be selected using appropriate evaluation metrics rather than model complexity.

### 7.5 Evaluation

Evaluation shall include:

- Chronological train/test separation.
- Precision and recall.
- F1-score where useful.
- PR-AUC for imbalanced classification.
- ROC-AUC as a supplementary metric.
- Probability calibration.
- Confusion matrix.
- Performance comparison against a simple baseline.

Randomly splitting temporally ordered records without considering leakage shall be avoided.

### 7.6 Explainability

SHAP visualizations shall be generated for the selected model.

The implementation shall distinguish between global feature importance and individual prediction explanations.

### 7.7 Model Versioning

Each deployed model shall record:

- Model version.
- Training dataset version.
- Training date.
- Target definition.
- Feature definitions.
- Evaluation metrics.
- Known limitations.

### 7.8 Data Sufficiency Gate

The project shall not assume that the historical dataset is sufficient for reliable prediction.

If reliable schedule histories or labels are inadequate, MissionWatch shall deliver historical analytics first and defer public delay predictions until the evidence supports them.

---

## 8. System Architecture and API Design

### 8.1 Proposed Backend Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/launches/upcoming` | Retrieve upcoming launches |
| GET | `/api/launches/previous` | Retrieve historical launches |
| GET | `/api/launches/{id}` | Retrieve mission details |
| GET | `/api/launches/search` | Search launches |
| GET | `/api/launches/{id}/history` | Retrieve schedule snapshots |
| GET | `/api/analytics/summary` | Retrieve summary statistics |
| GET | `/api/analytics/launches` | Retrieve filtered launch analytics |
| GET | `/api/analytics/providers` | Compare providers |
| GET | `/api/missions/{id}/milestones` | Retrieve mission milestones |
| GET | `/api/missions/{id}/related` | Retrieve related missions |
| GET | `/api/launches/{id}/risk` | Retrieve a validated prediction when available |
| GET | `/api/models/current` | Retrieve active model metadata |
| GET | `/api/models/evaluation` | Retrieve model evaluation information |
| GET | `/api/users/me/watchlist` | Retrieve the authenticated user's watchlist |
| POST | `/api/users/me/watchlist` | Add a launch to the watchlist |
| DELETE | `/api/users/me/watchlist/{id}` | Remove a saved launch |
| GET | `/api/users/me/notifications` | Retrieve notifications |

Authenticated endpoints shall enforce authorization. Additional endpoints may be added when required.

### 8.2 API Response Requirements

Responses shall use consistent internal models and error structures.

Each external-data response should include relevant metadata such as:

- Source.
- Last successful refresh.
- Data timestamp, if available.
- Cache status where operationally useful.
- Warnings about incomplete data.

The backend shall use appropriate HTTP status codes and request validation.

### 8.3 Caching Strategy

Caching shall be configured according to the data type.

- Upcoming launches: refresh periodically and when appropriate.
- Historical launch metadata: refresh less frequently.
- Images: use source URLs and suitable caching policies.
- Schedule snapshots: persist observations independently.
- Analytics: cache expensive aggregations where useful.
- Model predictions: cache only when consistent with the model and feature freshness requirements.

The backend shall respect upstream rate limits and avoid unnecessary repeated calls.

---

## 9. Database Design

### 9.1 Core Entities

**Launch**

- Internal ID.
- External launch identifier.
- Mission name.
- Scheduled time.
- Launch status.
- Provider identifier.
- Rocket identifier.
- Launch-site identifier.
- Description.
- Last updated timestamp.

**LaunchSnapshot**

- Snapshot ID.
- Launch ID.
- Observed scheduled time.
- Observed status.
- Observation timestamp.
- Source identifier.
- Relevant raw or normalized metadata.

**Provider**

- Provider ID.
- Name.
- Country or region where available.
- External identifier.

**Rocket**

- Rocket ID.
- Name.
- Configuration.
- Provider reference.
- Available specifications.

**MissionMilestone**

- Milestone ID.
- Launch ID.
- Name.
- Description.
- Scheduled or estimated time.
- Source reference.
- Estimate flag.

**User**

- User ID.
- Email or login identifier.
- Authentication metadata.
- Preferences.
- Created timestamp.

**WatchlistItem**

- User ID.
- Launch ID.
- Created timestamp.

**Notification**

- Notification ID.
- User ID.
- Launch ID.
- Event type.
- Message.
- Source reference.
- Created timestamp.
- Read status.

**ModelVersion**

- Model ID.
- Version.
- Target definition.
- Dataset version.
- Training timestamp.
- Evaluation metadata.

**Prediction**

- Prediction ID.
- Launch ID.
- Model version.
- Prediction timestamp.
- Target window.
- Predicted probability.
- Relevant feature snapshot.

Foreign keys and indexes shall be used to preserve integrity and support common queries.

The schema may be extended to accommodate additional entities, including destinations, payloads, trajectories and mission relationships.

---

## 10. User Interface and Experience Requirements

### 10.1 Design Direction

MissionWatch shall use a modern aerospace-inspired interface.

The design should feature:

- Deep navy or charcoal backgrounds.
- Restrained violet or blue accents.
- High-quality space imagery.
- Clear typography.
- Compact but readable information panels.
- Smooth, purposeful transitions.
- Consistent spacing and component behaviour.
- Responsive layouts.
- Dark and light themes where practical.

Visual polish shall not compromise readability or accessibility.

### 10.2 Primary Pages

1. Home dashboard.
2. Launch explorer.
3. Mission detail.
4. Interactive mission globe.
5. Mission Story Mode.
6. Launch Intelligence dashboard.
7. Schedule-change history.
8. User watchlist.
9. Notifications.
10. Data sources and project information.

### 10.3 Loading and Error States

Every data-driven page shall account for:

- Loading.
- Empty results.
- API errors.
- Partial records.
- Stale information.
- Unavailable imagery.
- Missing trajectories.
- Unavailable predictions.

The application shall not present loading placeholders as real mission information.

### 10.4 Accessibility

The interface shall support:

- Keyboard navigation.
- Visible focus states.
- Appropriate text contrast.
- Accessible labels.
- Reduced-motion preferences.
- Screen-reader-friendly status messages.
- Alternatives to information conveyed only by colour.

---

## 11. Non-Functional Requirements

### NFR-01: Performance

- The application shall lazy-load major feature areas.
- Heavy globe and visualization modules shall be loaded only when needed.
- API requests shall be cancellable where appropriate.
- Large datasets shall use server-side filtering and pagination where appropriate.
- Images shall be optimized for responsive delivery.
- Performance shall be measured against a production build.

### NFR-02: Reliability

- Failure of an optional external integration shall not disable the entire website.
- Stale data shall be identified.
- The system shall handle upstream rate limits.
- Scheduled jobs shall avoid duplicate processing.
- Database migrations shall be repeatable and version-controlled.

### NFR-03: Security

- Secrets shall not be committed to GitHub.
- Sensitive credentials shall be held in deployment environment variables or an appropriate secret store.
- User endpoints shall enforce authorization.
- Inputs shall be validated.
- Authentication shall use established security mechanisms.
- API access shall be protected against abuse where appropriate.
- Dependencies shall be maintained and scanned for known vulnerabilities.

### NFR-04: Maintainability

- Frontend features shall be organized into coherent Angular modules or standalone feature areas.
- Backend controllers, services and repositories shall have clear responsibilities.
- External API integrations shall be isolated behind service interfaces.
- Data science experiments shall be reproducible.
- Configuration shall be environment-specific.
- API contracts and database migrations shall be version-controlled.

### NFR-05: Scalability

The application shall support caching, pagination and modular deployment.

Background data collection and model training shall be separated from user-facing request processing where appropriate.

### NFR-06: Privacy

Only necessary personal data shall be collected.

Users shall be able to remove their saved preferences and watchlist data, subject to applicable retention requirements. Location information used for viewing estimates shall not be persisted without a clear user-facing reason and appropriate consent.

### NFR-07: Observability

The backend shall record relevant operational errors, failed integrations, scheduled-job failures and model-service errors.

Logs shall avoid unnecessary sensitive data.

---

## 12. Development Phases

### Phase 1: Frontend Foundation

**Estimated duration:** 4–6 days.

Deliverables:

- Angular project setup.
- Design system and reusable components.
- Responsive application shell.
- Dashboard and launch explorer.
- Mission detail layout.
- Analytics page using mock data.
- Loading, empty and error states.

**Acceptance criteria:** all primary routes work, layouts adapt to mobile, and the visual system is consistent.

### Phase 2: Real Data Integration

**Estimated duration:** 3–5 days.

Deliverables:

- Launch Library 2 integration.
- NASA media integration.
- Search and filters.
- Normalized frontend data models.
- Source attribution.
- API error handling.

**Acceptance criteria:** actual launch records render correctly and missing optional fields do not break the interface.

### Phase 3: Interactive Mission Explorer

**Estimated duration:** 1–2 weeks.

Deliverables:

- Interactive globe.
- Launch-site markers.
- Mission detail interactions.
- Mission Story Mode.
- Timeline and map synchronization.
- Available trajectory visualization.

**Acceptance criteria:** selecting a mission updates the corresponding detail view and visual elements correctly.

### Phase 4: Backend and Database

**Estimated duration:** 1 week.

Deliverables:

- Spring Boot REST API.
- PostgreSQL schema.
- Flyway migrations.
- External API adapters.
- Caching.
- Scheduled data refreshes.

**Acceptance criteria:** the Angular application consumes the backend, external data is normalized, and transient upstream failures are handled gracefully.

### Phase 5: Historical Data Pipeline

**Estimated duration:** 1 week.

Deliverables:

- Historical data ingestion.
- Schedule snapshot collection.
- Data cleaning and normalization.
- Dataset versioning.
- Data quality report.
- Reproducible exports for analysis.

**Acceptance criteria:** historical records can be reproduced from documented pipeline steps, and schedule changes can be identified from stored snapshots.

### Phase 6: Data Science and Machine Learning

**Estimated duration:** 1–2 weeks or longer depending on data quality.

Deliverables:

- Exploratory analysis.
- Feature engineering.
- Baseline model.
- Model comparisons.
- Chronological evaluation.
- Probability calibration assessment.
- SHAP explanations.
- Model metadata.

**Acceptance criteria:** evaluation is performed on chronologically later data, leakage risks are addressed, and the model is compared with a simple baseline.

If the dataset is inadequate, this phase shall deliver statistical analytics and a documented data collection plan rather than an unsupported prediction model.

### Phase 7: Launch Intelligence

**Estimated duration:** 4–7 days.

Deliverables:

- Analytics dashboard.
- Validated prediction integration where supported.
- Prediction explanation UI.
- Schedule-change timeline.
- Watchlists.
- Notification workflows.

**Acceptance criteria:** the interface distinguishes observations from predictions, identifies the model version and does not show unsupported probabilities.

### Phase 8: Deployment and Portfolio Polish

**Estimated duration:** 3–5 days.

Deliverables:

- Production builds.
- GitHub Actions workflows.
- Hosted Angular frontend.
- Hosted backend and database.
- Automated tests.
- API documentation.
- Project README.
- Architecture diagrams and screenshots.

**Acceptance criteria:** the public website works, nested routes are handled correctly, environment configuration is secure, and setup instructions allow another developer to run the project.

**Overall estimate:** approximately 8–12 weeks of part-time development, with possible additional time for historical data collection and model validation.

---

## 13. Testing Strategy

### 13.1 Frontend Testing

- Component rendering tests.
- Service and state-management tests.
- Search and filter tests.
- Loading and error-state tests.
- Responsive-layout checks.
- Accessibility checks.
- End-to-end tests for core user journeys.

### 13.2 Backend Testing

- Controller tests.
- Service-layer unit tests.
- Repository integration tests.
- External API adapter tests using mocked responses.
- Cache behaviour tests.
- Authorization tests.
- Database migration tests.

### 13.3 Data Pipeline Testing

- Schema validation.
- Timestamp normalization tests.
- Duplicate detection.
- Missing-value checks.
- Snapshot consistency tests.
- Reproducibility checks.

### 13.4 Machine-Learning Testing

- Target-label validation.
- Leakage checks.
- Chronological evaluation.
- Baseline comparisons.
- Calibration analysis.
- Model serialization and inference tests.
- Prediction API validation.
- Monitoring for changes in input data quality.

---

## 14. Deployment and CI/CD

### 14.1 GitHub Repository

The repository shall contain application code, configuration templates, migrations, documentation and automated tests.

Suggested structure:

```text
missionwatch/
├── frontend/
│   └── missionwatch-web/
├── backend/
│   └── missionwatch-api/
├── data-science/
│   ├── notebooks/
│   ├── src/
│   ├── tests/
│   └── models/
├── docs/
│   ├── SRS.md
│   ├── architecture.md
│   └── api.md
├── deployment/
│   └── docker/
├── .github/
│   └── workflows/
├── .gitignore
└── README.md
```

Large datasets, private credentials and unnecessary generated artifacts shall not be committed to the repository.

### 14.2 Continuous Integration

GitHub Actions shall execute relevant checks on pull requests and changes to the main branch.

Checks shall include:

- Angular build and tests.
- Java compilation and tests.
- Backend static analysis and formatting checks.
- Python unit tests.
- Data pipeline validation.
- Dependency vulnerability checks.

Deployment workflows shall use protected secrets and environment-specific configuration.

### 14.3 Production Deployment

- Frontend: GitHub Pages or another static hosting provider.
- Backend: Java-compatible hosting.
- Database: managed PostgreSQL.
- ML service: optional Python-compatible hosting.

If the ML service is unavailable, the core mission exploration and analytics features shall continue to work.

---

## 15. Acceptance Criteria for the Overall Project

MissionWatch shall be considered ready for its initial public portfolio release when:

1. The website is accessible through a public URL.
2. The Angular interface is responsive and navigable.
3. Upcoming and historical launch information is retrieved from real data sources.
4. Mission detail pages display available metadata and source links.
5. The interactive globe supports selection and exploration of missions.
6. Historical schedule snapshots are stored and changes can be identified.
7. The analytics dashboard displays documented statistics.
8. Any public prediction model has been evaluated and its limitations are visible.
9. User watchlists and authentication work securely if included in the release.
10. Automated tests cover critical application flows.
11. GitHub Actions validates changes.
12. Setup, architecture, APIs, data sources and deployment instructions are documented.

Machine-learning prediction is not a prerequisite for releasing the first useful version. Data quality and evaluation must determine when that feature is ready.

---

## 16. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| External API rate limits | Cache data and use scheduled refreshes |
| Incomplete historical schedules | Collect snapshots and document missing history |
| Imbalanced launch outcomes | Use suitable metrics and compare against baselines |
| Data leakage in ML | Use time-aware splits and prediction-time feature constraints |
| Misleading trajectories | Label illustrative paths and use authoritative data where available |
| Inaccurate schedule-change explanations | Use sourced reasons and avoid unsupported causal claims |
| Excessive frontend complexity | Lazy-load the globe and split features into independent areas |
| Hosting limitations | Deploy the static frontend separately from backend services |
| Model drift | Track evaluation data, model versions and input quality |
| Unavailable external integrations | Use graceful fallbacks and visible data freshness |

---

## 17. Future Enhancements

Potential extensions after the initial release include:

- Mission knowledge graph.
- Advanced orbital visualization.
- More detailed launch-site weather analytics.
- Email and browser notifications.
- Mission similarity recommendations.
- Historical mission comparisons.
- User-created collections and shareable mission pages.
- More advanced time-series models.
- Model monitoring and scheduled retraining.
- Internationalization and additional accessibility improvements.

---

## 18. Conclusion

MissionWatch aims to transform a conventional launch-tracking website into an interactive space mission intelligence platform.

Its defining capabilities will be an immersive mission explorer, a visual explanation of mission milestones, transparent schedule-change history and evidence-based launch analytics.

The project shall prioritize frontend quality while maintaining a robust full-stack architecture. Data science and machine learning will be introduced only after reliable data collection and evaluation processes are established.

The result should demonstrate Angular expertise, Java backend development, data engineering, applied machine learning, explainable AI, API integration, deployment and product-oriented design in a single coherent project.
