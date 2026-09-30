---
description: "Task breakdown for Mobile Frontend API Integration & Full Web Parity"
---

# Tasks: Mobile Frontend API Integration & Full Web Parity

**Input**: Design documents from `/specs/011-mobile-parity-api-integration/`  
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md, quickstart.md  

## Format: `[ID] [P?] [Story?] Description with exact file path`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Maps to specific User Story (US1, US2, US3, US4, US5) from spec.md

## Path Conventions

- **Mobile Frontend (Flutter/Dart)**: `frontend-mobile/lib/`
- **Mobile Unit & Widget Tests**: `frontend-mobile/test/`
- **Backend Reference (Symfony)**: `Backend/src/Controller/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project dependency addition and API configuration setup

- [x] T001 Add `http` and `flutter_secure_storage` dependencies in `frontend-mobile/pubspec.yaml`
- [x] T002 [P] Create API environment configuration constants in `frontend-mobile/lib/config/api_config.dart`
- [x] T003 [P] Create custom network exception handling classes in `frontend-mobile/lib/services/api_exception.dart`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core HTTP network client, token storage, model mappers, and provider registrations

**⚠️ CRITICAL**: Must be completed before any user story UI integration can proceed

- [x] T004 Implement base HTTP `ApiClient` with Bearer token injection and 401 response handling in `frontend-mobile/lib/services/api_client.dart`
- [x] T005 [P] Implement `TokenStorage` wrapper using `flutter_secure_storage` for JWT persistence in `frontend-mobile/lib/services/token_storage.dart`
- [x] T006 Update Dart data models with `fromJson` and `toJson` factory constructors in `frontend-mobile/lib/models/models.dart`
- [x] T007 Register all new API Providers in `frontend-mobile/lib/main.dart`

**Checkpoint**: Foundation ready - HTTP client, token storage, and models available for user story implementation

---

## Phase 3: User Story 1 - Secure Authentication & Session Management (Priority: P1) 🎯 MVP

**Goal**: Authenticate users against live backend REST API, store JWT securely, and enforce route protection.

**Independent Test**: Attempt login with valid/invalid backend credentials on mobile device/emulator, verify session persistence, and confirm automatic logout on token expiration.

- [x] T008 [P] [US1] Create `AuthService` in `frontend-mobile/lib/services/auth_service.dart` for POST `/api/v1/auth/login` and GET `/api/v1/user/profile`
- [x] T009 [US1] Implement `AuthProvider` in `frontend-mobile/lib/providers/auth_provider.dart` for login state management, token restoration, and logout
- [x] T010 [US1] Wire login screen in `frontend-mobile/lib/pages/auth/login_page.dart` with user-friendly error alerts
- [x] T011 [US1] Add route protection checking `AuthProvider.isAuthenticated` in `frontend-mobile/lib/router.dart`

**Checkpoint**: User Story 1 fully functional and independently testable (MVP ready)

---

## Phase 4: User Story 2 - Real-Time Meeting Management & Audio Upload (Priority: P1)

**Goal**: Fetch live user meetings, view meeting details, record/upload meeting audio files to backend, and follow processing status.

**Independent Test**: Create meeting, upload audio file on mobile, and verify real meeting details and transcript load from live backend.

- [x] T012 [P] [US2] Create `MeetingService` in `frontend-mobile/lib/services/meeting_service.dart` for `/api/v1/meetings`, `/api/v1/meetings/{id}/transcript`, and `/api/v1/meetings/{id}/transcribe`
- [x] T013 [US2] Implement `MeetingProvider` in `frontend-mobile/lib/providers/meeting_provider.dart` for meeting state, active detail, transcript segments, and upload tracking
- [x] T014 [US2] Update overview page in `frontend-mobile/lib/pages/overview/overview_page.dart` to consume `MeetingProvider` and display live backend meetings
- [x] T015 [US2] Update transcription page in `frontend-mobile/lib/pages/transcription/transcription_page.dart` to render live transcript segments from `MeetingProvider`
- [x] T016 [US2] Update upload page in `frontend-mobile/lib/pages/upload/upload_page.dart` to stream recorded audio files via multipart request to backend with progress bar
- [x] T017 [US2] Update archive library page in `frontend-mobile/lib/pages/archive_library/archive_library_page.dart` for live search and filtering via `MeetingProvider`

**Checkpoint**: User Stories 1 and 2 working together seamlessly

---

## Phase 5: User Story 3 - Meeting Analytics & Behavioural Insights (Priority: P2)

**Goal**: Fetch and render meeting analytics, talk time distribution, speaker metrics, and sentiment trends from backend API.

**Independent Test**: Open analytics tab for a processed meeting and confirm chart figures and speaker metrics match backend JSON outputs.

- [x] T018 [P] [US3] Create `AnalyticsService` in `frontend-mobile/lib/services/analytics_service.dart` for GET `/api/v1/meetings/{id}/analytics`
- [x] T019 [US3] Implement `AnalyticsProvider` in `frontend-mobile/lib/providers/analytics_provider.dart` for analytics data fetching and caching
- [x] T020 [US3] Update behavioral analytics page in `frontend-mobile/lib/pages/behavioral_analytics/behavioral_analytics_page.dart` to consume `AnalyticsProvider` and render live `fl_chart` metrics

**Checkpoint**: Meeting analytics and speaker insights working on live data

---

## Phase 6: User Story 4 - Procès-Verbal (PV) Generation & Action Item Tracking (Priority: P2)

**Goal**: Display PV summaries, update action item statuses, and trigger document export from mobile.

**Independent Test**: Update action item status on mobile and confirm update is persisted in backend and visible in summary view.

- [x] T021 [P] [US4] Create `PVService` in `frontend-mobile/lib/services/pv_service.dart` for GET/PUT `/api/v1/meetings/{id}/summary` and GET `/api/v1/export/pdf/{id}`
- [x] T022 [US4] Implement `PVProvider` in `frontend-mobile/lib/providers/pv_provider.dart` for PV summary state, action item toggles, and PDF downloading
- [x] T023 [US4] Update summary page in `frontend-mobile/lib/pages/refine_summary/refine_summary_page.dart` to consume `PVProvider` and enable live action item toggles and PDF export

**Checkpoint**: PV summary and action items synchronized across clients

---

## Phase 7: User Story 5 - Team & Organization Management (Priority: P3)

**Goal**: View team member rosters and update profile settings matching Web frontend capabilities.

**Independent Test**: View team list and update profile information on mobile, confirming backend persistence.

- [x] T024 [P] [US5] Create `UserService` in `frontend-mobile/lib/services/user_service.dart` for profile management and team member rosters
- [x] T025 [US5] Update settings page in `frontend-mobile/lib/pages/settings/settings_page.dart` to display user profile and submit updates via `UserService`

**Checkpoint**: Full functional parity achieved across all 5 user stories

---

## Phase 8: Polish & Complete Mock Elimination (Final Phase)

**Purpose**: Safely remove mock data files, add unit tests, and perform final parity verification

- [x] T026 Safely remove `frontend-mobile/lib/data/mock_data.dart` and clean up unused mock references
- [x] T027 [P] Create unit and widget tests for `ApiClient`, `AuthProvider`, `MeetingProvider`, and `AnalyticsProvider` in `frontend-mobile/test/`
- [x] T028 Perform manual end-to-end parity validation comparing Mobile app and Web frontend against live backend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all User Story phases.
- **User Stories (Phase 3+)**: All depend on Phase 2 completion.
  - User Story 1 (P1) -> User Story 2 (P1) -> User Story 3 (P2) -> User Story 4 (P2) -> User Story 5 (P3).
- **Polish (Phase 8)**: Depends on completion of all User Stories.

### Parallel Opportunities

- Phase 1: T002 and T003 can be executed in parallel.
- Phase 2: T005 can be executed in parallel with T004.
- Phase 3: T008 can be written in parallel with initial UI preparation.
- Phase 4: T012 can be written in parallel with UI integration.
- Phase 5: T018 can be written in parallel.
- Phase 6: T021 can be written in parallel.
- Phase 7: T024 can be written in parallel.
- Phase 8: T027 unit tests can be written in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup & Phase 2: Foundational.
2. Complete Phase 3: User Story 1 (Authentication).
3. Validate live JWT login and token persistence on mobile.

### Incremental Feature Rollout
1. Add User Story 2 (Live Meeting List, Audio Upload, Transcripts).
2. Add User Story 3 (Live Analytics & Speaker Metrics).
3. Add User Story 4 (PV Summaries & Action Items).
4. Add User Story 5 (Profile & Organization Roster).
5. Complete Phase 8 (Mock removal & testing).
