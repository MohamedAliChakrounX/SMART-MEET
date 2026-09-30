# Tasks: Migration vers PostgreSQL

**Input**: Design documents from `/specs/003-postgres-migration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/api-endpoints.md

**Tests**: Tests are included as the constitution (Principle VI) requires PHPUnit tests for all services and controllers.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `Backend/src/`, `Backend/tests/`, `Backend/config/`
- **Frontend**: `Frontend-Web/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, new entity creation, and migration generation

- [ ] T001 Create Meeting entity with UUID, title, startAt, durationMinutes, status (In_Progress/Completed/Failed), participants (JSON), description, starred, deletedAt (soft-delete) in `Backend/src/Entity/Meeting.php`
- [ ] T002 [P] Create TranscriptSegment entity with meetingId FK, speaker, speakerColor, timeStart, timeEnd, content, orderIndex in `Backend/src/Entity/TranscriptSegment.php`
- [ ] T003 [P] Create Summary entity with meetingId FK (unique), title, type (PV/Synthese), content (JSON), focusAreas (JSON), detailLevel, version in `Backend/src/Entity/Summary.php`
- [ ] T004 [P] Create AnalyticData entity with meetingId FK, metricKey, metricValue (JSON) in `Backend/src/Entity/AnalyticData.php`
- [ ] T005 Create MeetingRepository with pagination support (findPaginatedByUser) and soft-delete filter in `Backend/src/Repository/MeetingRepository.php`
- [ ] T006 [P] Create TranscriptSegmentRepository with findByMeetingOrderedByIndex in `Backend/src/Repository/TranscriptSegmentRepository.php`
- [ ] T007 [P] Create SummaryRepository with findByMeetingId in `Backend/src/Repository/SummaryRepository.php`
- [ ] T008 [P] Create AnalyticDataRepository with findByMeetingId in `Backend/src/Repository/AnalyticDataRepository.php`
- [ ] T009 Generate and run Doctrine migration for all 4 new entities via `php bin/console doctrine:migrations:diff` then `php bin/console doctrine:migrations:migrate` in `Backend/migrations/`
- [ ] T010 Register Doctrine soft-delete SQL filter in `Backend/config/packages/doctrine.yaml` to auto-exclude deleted meetings
- [ ] T042 Add `INTERNAL_WEBHOOK_SECRET` env variable with a generated random string (min 32 chars) to `Backend/.env` and `Backend/.env.test`; document generation command in `specs/003-postgres-migration/quickstart.md`

**Checkpoint**: All entities exist in database. `php bin/console doctrine:schema:validate` passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared services and routing framework that MUST be complete before user story endpoints

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create MeetingService with methods: listPaginated(user, page, limit), getById(id), softDelete(id), create(dto), update(id, dto) in `Backend/src/Service/MeetingService.php`
- [ ] T012 Add all new resource routes in `Backend/config/routes/api.yaml`: prefix `/api/v1/meetings` (MeetingController + TranscriptController), prefix `/api/v1/summaries` (SummaryController), route `/api/v1/meetings/{id}/analytics` (AnalyticsController), prefix `/api/v1/internal/meetings` (InternalWebhookController)
- [ ] T013 Create SeedMeetingsCommand to insert 5 sample meetings with transcripts, summaries, and analytics for development in `Backend/src/Command/SeedMeetingsCommand.php`
- [ ] T041 Create MeetingServiceTest covering: listPaginated returns only non-deleted meetings, softDelete sets deletedAt timestamp, getById throws NotFound on missing or soft-deleted meeting in `Backend/tests/MeetingServiceTest.php`

**Checkpoint**: Foundation ready — `php bin/console app:seed-meetings` populates test data. Routes registered. MeetingService tests pass.

---

## Phase 3: User Story 1 — Consultation des réunions archivées (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can view the paginated list of all their past meetings loaded from PostgreSQL.

**Independent Test**: Insert 5 rows in `meeting` table, call `GET /api/v1/meetings?page=1&limit=20`, verify 5 meeting cards with correct titles and dates returned.

### Tests for User Story 1

- [ ] T014 [P] [US1] Create MeetingApiTest with test cases: list meetings paginated, list returns only non-deleted, list returns 401 without JWT in `Backend/tests/MeetingApiTest.php`

### Implementation for User Story 1

- [ ] T015 [US1] Create MeetingController::list() handling GET `/api/v1/meetings` with `?page=&limit=` query params, returning paginated JSON response with `data[]` and `meta{currentPage, totalPages, totalItems}` in `Backend/src/Controller/MeetingController.php`
- [ ] T016 [US1] Create MeetingController::delete() handling DELETE `/api/v1/meetings/{id}` performing soft-delete (set deletedAt) returning 204 in `Backend/src/Controller/MeetingController.php`
- [ ] T017 [US1] Update Vite proxy config to route `/api/v1` to Symfony `localhost:8000` while keeping `/api/upload` and `/api/meetings` (Flask AI routes) on `localhost:5001` in `Frontend-Web/vite.config.js`
- [ ] T018 [US1] Rewrite api.js: remove mockData import; remove Axios interceptors for GET /meetings, GET /meetings/{id}, GET/PUT /meetings/{id}/transcript, GET/PUT /summaries/{id}, PUT /meetings/{id}/decisions, POST /meetings/{id}/action-items; keep Flask-proxied routes (`/api/upload`, status, transcribe) untouched in `Frontend-Web/src/services/api.js`
- [ ] T019 [US1] Update ArchiveLibrary.jsx to call `GET /api/v1/meetings` instead of mock data, implement infinite scroll with "Voir plus" button loading next page in `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx`

**Checkpoint**: Archive library loads real meetings from PostgreSQL. Pagination works. Soft-delete hides meetings. Zero mock interceptors for meeting list.

---

## Phase 4: User Story 2 — Accès aux détails et transcriptions (Priority: P1)

**Goal**: Users can click a meeting to view its details (summary, transcript segments, decisions, action items) loaded dynamically from Symfony API.

**Independent Test**: Call `GET /api/v1/meetings/{id}` for a seeded meeting, verify response includes participants, agendaItems, decisions, actionItems. Call `GET /api/v1/meetings/{id}/transcript`, verify all segments returned with correct speakers.

### Tests for User Story 2

- [ ] T020 [P] [US2] Create TranscriptApiTest with test cases: get all segments for a meeting, update segments (PUT), return empty array for in-progress meeting in `Backend/tests/TranscriptApiTest.php`
- [ ] T021 [P] [US2] Create SummaryApiTest with test cases: get summary, update summary, update settings, return null for missing summary in `Backend/tests/SummaryApiTest.php`

### Implementation for User Story 2

- [ ] T022 [US2] Add MeetingController::show() handling GET `/api/v1/meetings/{id}` returning full meeting details with participants, agendaItems, decisions, actionItems in `Backend/src/Controller/MeetingController.php`
- [ ] T023 [US2] Add MeetingController::updateDecisions() handling PUT `/api/v1/meetings/{id}/decisions` in `Backend/src/Controller/MeetingController.php`
- [ ] T024 [US2] Add MeetingController::addActionItem() handling POST `/api/v1/meetings/{id}/action-items` in `Backend/src/Controller/MeetingController.php`
- [ ] T025 [P] [US2] Create TranscriptController with index() for GET and update() for PUT `/api/v1/meetings/{id}/transcript` — index returns all segments ordered, no pagination (FR-007) in `Backend/src/Controller/TranscriptController.php`
- [ ] T026 [P] [US2] Create SummaryController with show() for GET, update() for PUT `/api/v1/summaries/{meetingId}`, and updateSettings() for PUT `/api/v1/summaries/{meetingId}/settings` in `Backend/src/Controller/SummaryController.php`
- [ ] T027 [US2] Update Frontend meeting detail pages to call Symfony API endpoints instead of mock adapters, display "Traitement IA en cours..." placeholder when summary is null or transcript is empty with status In_Progress in `Frontend-Web/src/services/api.js`

**Checkpoint**: Clicking a meeting shows real details from PostgreSQL. Transcript and summary load from Symfony API. "Traitement IA en cours..." shown for pending AI data.

---

## Phase 5: User Story 3 — Suppression des simulations (Priority: P2)

**Goal**: The Frontend has zero traces of `mockData.js` in its network calls. All data is "real" from PostgreSQL.

**Independent Test**: Delete `mockData.js`, disable all Axios interceptors in `api.js`, navigate every page — no 404/500 errors, all data flows through Symfony.

### Implementation for User Story 3

- [ ] T028 [US3] Create AnalyticsController with show() for GET `/api/v1/meetings/{id}/analytics` returning full behavioral analytics JSON from AnalyticData records in `Backend/src/Controller/AnalyticsController.php`
- [ ] T029 [US3] Create InternalWebhookController handling POST `/api/v1/internal/meetings/{id}/ai-results`; validate `X-Internal-Secret` header against `INTERNAL_WEBHOOK_SECRET` env var; dispatch to transcript/summary/analytics persistence in `Backend/src/Controller/InternalWebhookController.php`
- [ ] T039 [P] [US3] Create AnalyticsApiTest with test cases: GET analytics returns 200 with correct keys (summaryMetrics, talkTimeData, speakers), returns 401 without JWT, returns 404 for soft-deleted meeting in `Backend/tests/AnalyticsApiTest.php`
- [ ] T040 [P] [US3] Create InternalWebhookControllerTest with test cases: rejects request with missing/invalid `X-Internal-Secret` (401), accepts valid secret and persists transcript payload, accepts valid secret and persists summary payload in `Backend/tests/InternalWebhookControllerTest.php`
- [ ] T030 [US3] Delete the mock data file entirely in `Frontend-Web/src/data/mockData.js`
- [ ] T031 [US3] Final cleanup of api.js: remove delay() helper function; remove PUT /summaries/{id}/settings interceptor (not covered by T018); verify zero interceptor code remains via grep in `Frontend-Web/src/services/api.js`
- [ ] T032 [US3] Update BehavioralAnalytics page to call `GET /api/v1/meetings/{id}/analytics` from Symfony instead of mock data in `Frontend-Web/src/pages/BehavioralAnalytics/`
- [ ] T033 [US3] Update RefineSummary, Transcription, and Overview pages to use Symfony API calls: replace any remaining mock imports with api.js calls; exact files: `Frontend-Web/src/pages/RefineSummary/`, `Frontend-Web/src/pages/Transcription/`, `Frontend-Web/src/pages/Overview/`

**Checkpoint**: `mockData.js` is deleted. grep for "mockData" in `Frontend-Web/src/` returns zero results. All network calls in DevTools point to `localhost:8000`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T034 [P] Add structured JSON logging for all new controllers (auth events, permission denials, API calls) per Constitution Principle V in `Backend/src/Controller/`
- [ ] T035 [P] Add input validation (Assert constraints) on all entity fields: title max 255, status enum, durationMinutes positive, detailLevel enum in `Backend/src/Entity/`
- [ ] T036 Run `php bin/console doctrine:schema:validate` and `php bin/phpunit` — fix any failures in `Backend/`
- [ ] T037 Run full frontend smoke test: login → archive library → meeting detail → transcript → summary → analytics — verify zero console errors in `Frontend-Web/`
- [ ] T038 Update quickstart.md with final verified commands and any adjustments found during implementation in `specs/003-postgres-migration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (US2 reuses entities from Phase 1)
  - US3 depends on US1 and US2 being complete (it removes all mocks)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — Independent of US1 but both are P1
- **User Story 3 (P2)**: Depends on US1 + US2 completion — removes ALL mocks so all real endpoints must exist first

### Within Each User Story

- Tests written FIRST to verify they fail
- Models/entities already created in Phase 1 (shared)
- Services before controllers
- Backend endpoints before Frontend rewiring
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can run in parallel (independent entity files)
- T006, T007, T008 can run in parallel (independent repository files)
- T014, T020, T021 can run in parallel (independent test files)
- T025, T026 can run in parallel (independent controller files)
- US1 and US2 can run in parallel after Phase 2

---

## Parallel Example: Phase 1 Entities

```text
# Launch all independent entity creation together:
Task T002: "Create TranscriptSegment entity in Backend/src/Entity/TranscriptSegment.php"
Task T003: "Create Summary entity in Backend/src/Entity/Summary.php"
Task T004: "Create AnalyticData entity in Backend/src/Entity/AnalyticData.php"

# Launch all independent repositories together:
Task T006: "Create TranscriptSegmentRepository in Backend/src/Repository/TranscriptSegmentRepository.php"
Task T007: "Create SummaryRepository in Backend/src/Repository/SummaryRepository.php"
Task T008: "Create AnalyticDataRepository in Backend/src/Repository/AnalyticDataRepository.php"
```

## Parallel Example: User Story 2

```text
# Launch all tests together:
Task T020: "TranscriptApiTest in Backend/tests/TranscriptApiTest.php"
Task T021: "SummaryApiTest in Backend/tests/SummaryApiTest.php"

# Launch independent controllers together:
Task T025: "TranscriptController in Backend/src/Controller/TranscriptController.php"
Task T026: "SummaryController in Backend/src/Controller/SummaryController.php"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (entities + repos + migration)
2. Complete Phase 2: Foundational (MeetingService + routes + seed data)
3. Complete Phase 3: User Story 1 (meeting list + pagination + archive library)
4. **STOP and VALIDATE**: Test archive library loads real data from PostgreSQL
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (**MVP!** 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo (details + transcripts)
4. Add User Story 3 → Test independently → Deploy/Demo (complete mock removal)
5. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (archive library + pagination)
   - Developer B: User Story 2 (details + transcript + summary)
3. After US1 + US2 complete:
   - Either developer: User Story 3 (mock cleanup)
4. Both: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All entity UUIDs follow existing User.php pattern (Doctrine UUID generator)
- Soft-delete filter must be registered globally but bypassable for admin queries
