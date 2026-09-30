# Tasks: Flutter Mobile Application Parity

**Input**: Design documents from `/specs/010-flutter-mobile-app/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested. In this project, they are omitted as standard Flutter test configuration tasks are integrated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Path Conventions

- **Backend (Symfony)**: `Backend/src/`
- **Flask AI Service**: `AI/`
- **Web Frontend (React)**: `Frontend-Web/src/`
- **Mobile Frontend (React Native)**: `frontend-mobile/src/` or `frontend-mobile/`
- Paths shown below are templates - adjust based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create mobile project directory structures in `frontend-mobile/`
- [x] T002 Initialize Flutter project using `flutter create --org com.meetingia --project-name frontend_mobile --platforms=ios,android frontend-mobile`
- [x] T003 Configure dependencies in `frontend-mobile/pubspec.yaml` (Riverpod, Dio, Retrofit, GoRouter, SecureStorage, FlChart)
- [x] T004 Run `flutter pub get` and verify successful dependency fetching

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Setup GoRouter configuration and path definitions in `frontend-mobile/lib/src/core/router/app_router.dart`
- [x] T006 [P] Setup Logger helper class for debugging and structured logs in `frontend-mobile/lib/src/core/utils/logger.dart`
- [x] T007 Configure SecureStorage provider wrapper class in `frontend-mobile/lib/src/core/storage/secure_storage_service.dart`
- [x] T008 Setup Dio HTTP client provider with interceptors for automatic JWT Authorization header injection and silent refresh token retries in `frontend-mobile/lib/src/core/network/dio_client.dart`
- [x] T009 [P] Setup base exception classes and user-friendly error handlers in `frontend-mobile/lib/src/core/errors/app_exceptions.dart`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Authentication & Session Management (Priority: P1) 🎯 MVP

**Goal**: Users can log in, stay authenticated across launches, and log out securely.

**Independent Test**: Launch the app, enter test credentials (`test@example.com`/`password123`), submit and reach the library home screen. Restart the app (should auto-login). Click logout and confirm return to login screen.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create User model with freezed/json_serializable annotations in `frontend-mobile/lib/src/features/auth/data/models/user.dart`
- [x] T011 [US1] Implement AuthApiClient interface (Retrofit annotations) in `frontend-mobile/lib/src/features/auth/data/sources/auth_api_client.dart`
- [x] T012 [US1] Implement AuthRepository to coordinate login, logout, and token session validation in `frontend-mobile/lib/src/features/auth/data/repositories/auth_repository.dart`
- [x] T013 [US1] Implement AuthNotifier (Riverpod AsyncNotifier) managing AuthState in `frontend-mobile/lib/src/features/auth/presentation/providers/auth_provider.dart`
- [x] T014 [US1] Create LoginScreen UI with form validations and loading indicators in `frontend-mobile/lib/src/features/auth/presentation/screens/login_screen.dart`
- [x] T015 [US1] Run build_runner to generate code files (`user.freezed.dart`, `auth_api_client.g.dart`, etc.)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Meetings Library & Infinite Scroll (Priority: P1) 🎯 MVP

**Goal**: Users can view the meetings list, search/filter meetings, and load more rows using pagination.

**Independent Test**: Log in, observe the list loading the first 10 items, search for a meeting title, and scroll to the bottom to verify automatic next-page load.

### Implementation for User Story 2

- [x] T016 [P] [US2] Create Meeting model with freezed annotations in `frontend-mobile/lib/src/features/meetings/data/models/meeting.dart`
- [x] T017 [US2] Implement MeetingsApiClient (Retrofit interface) in `frontend-mobile/lib/src/features/meetings/data/sources/meetings_api_client.dart`
- [x] T018 [US2] Implement MeetingsRepository managing meetings fetch operations in `frontend-mobile/lib/src/features/meetings/data/repositories/meetings_repository.dart`
- [x] T019 [US2] Implement MeetingsListNotifier (Riverpod AsyncNotifier) handling pagination, search queries, and list updates in `frontend-mobile/lib/src/features/meetings/presentation/providers/meetings_list_provider.dart`
- [x] T020 [US2] Create MeetingsListScreen containing search bar, pull-to-refresh, and pagination triggers in `frontend-mobile/lib/src/features/meetings/presentation/screens/meetings_list_screen.dart`
- [x] T021 [US2] Run build_runner to generate code files for meetings feature

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Audio Upload & AI Transcription Tracking (Priority: P1) 🎯 MVP

**Goal**: Users can select and upload local audio files and see their real-time transcription status.

**Independent Test**: Click upload, choose a local audio file, click submit, observe the upload progress percentage, and see the item appear in the list as "Traitement IA en cours...".

### Implementation for User Story 3

- [x] T022 [US3] Implement audio upload API endpoint method in MeetingsApiClient (`frontend-mobile/lib/src/features/meetings/data/sources/meetings_api_client.dart`)
- [x] T023 [US3] Implement UploadProgressNotifier using Dio send progress callbacks in `frontend-mobile/lib/src/features/upload/presentation/providers/upload_progress_provider.dart`
- [x] T024 [US3] Create UploadScreen UI with file picker integration (`file_picker`) and circular progress indicators in `frontend-mobile/lib/src/features/upload/presentation/screens/upload_screen.dart`
- [x] T025 [US3] Implement polling or status-refresh hook to update AI processing status in the list screen (`frontend-mobile/lib/src/features/meetings/presentation/screens/meetings_list_screen.dart`)

**Checkpoint**: Users can now log in, view, and upload new meetings.

---

## Phase 6: User Story 4 - Meeting Details & Insights Editing (Priority: P2)

**Goal**: Users can view the meeting transcript, summary, and action items, and edit them inline.

**Independent Test**: Open a complete meeting, click the transcript tab, edit a segment's text, click save, and verify that reloading the page displays the updated segment.

### Implementation for User Story 4

- [ ] T026 [P] [US4] Create Transcript, Summary, Decision and ActionItem models in `frontend-mobile/lib/src/features/meetings/data/models/`
- [ ] T027 [US4] Implement InsightsApiClient interface in `frontend-mobile/lib/src/features/meetings/data/sources/insights_api_client.dart`
- [ ] T028 [US4] Implement InsightsRepository managing get/update operations for transcript, summary, actions and decisions in `frontend-mobile/lib/src/features/meetings/data/repositories/insights_repository.dart`
- [ ] T029 [US4] Implement InsightsNotifier and providers managing detail states in `frontend-mobile/lib/src/features/meetings/presentation/providers/insights_provider.dart`
- [ ] T030 [US4] Create MeetingDetailsScreen incorporating tab bars for Overview, Transcript, Summary, Actions, and Decisions in `frontend-mobile/lib/src/features/meetings/presentation/screens/meeting_details_screen.dart`
- [ ] T031 [US4] Implement InlineTextEditor and SpeakerSelector widgets to allow modifications in `frontend-mobile/lib/src/features/meetings/presentation/widgets/`
- [ ] T032 [US4] Run build_runner to generate code files for insights feature

**Checkpoint**: Insights consumption and modification are fully functional.

---

## Phase 7: User Story 5 - Behavioral Analytics Visualizations (Priority: P3)

**Goal**: Users can view graphical statistics of speaking duration and turn distributions.

**Independent Test**: Open a meeting, tap the analytics tab, and verify that speaking charts render correct slices matching backend percentages.

### Implementation for User Story 5

- [ ] T033 [P] [US5] Create Analytics models in `frontend-mobile/lib/src/features/analytics/data/models/analytics.dart`
- [ ] T034 [US5] Implement AnalyticsApiClient interface in `frontend-mobile/lib/src/features/analytics/data/sources/analytics_api_client.dart`
- [ ] T035 [US5] Create SpeakerDynamicsChart using `fl_chart` to render speaking time percentages and turn divisions in `frontend-mobile/lib/src/features/analytics/presentation/widgets/speaker_dynamics_chart.dart`
- [ ] T036 [US5] Run build_runner to generate analytics models

**Checkpoint**: Interactive analytics visualizations are completed.

---

## Phase 8: User Story 6 - Organization & User Administration (Priority: P3)

**Goal**: Admins can manage users, teams, and departments.

**Independent Test**: Log in as standard user and verify admin routes are inaccessible. Log in as admin and verify user lists can be loaded, created, and modified.

### Implementation for User Story 6

- [ ] T037 [P] [US6] Create Administration models (AdminUser, Team, Department) in `frontend-mobile/lib/src/features/admin/data/models/`
- [ ] T038 [US6] Implement AdminApiClient in `frontend-mobile/lib/src/features/admin/data/sources/admin_api_client.dart`
- [ ] T039 [US6] Implement AdminStateNotifier managing user and team databases modifications in `frontend-mobile/lib/src/features/admin/presentation/providers/admin_provider.dart`
- [ ] T040 [US6] Create AdminDashboardScreen with sidebar or drawer navigation for User and Team configurations in `frontend-mobile/lib/src/features/admin/presentation/screens/admin_dashboard_screen.dart`
- [ ] T041 [US6] Run build_runner to generate administration models

**Checkpoint**: All administration features achieve parity with the web dashboard.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Aesthetics, responsive checks, and system hardening

- [ ] T042 Implement the design system, harmonized colors, Outfit typography, and dark mode configuration in `frontend-mobile/lib/src/core/theme/app_theme.dart`
- [ ] T043 Add global error boundary widget displaying friendly exception notifications in `frontend-mobile/lib/src/core/errors/error_boundary_widget.dart`
- [ ] T044 Run responsive viewport audits across standard emulation dimensions (verify zero screen flows or pixel clipping)
- [ ] T045 Create integration tests verifying full critical path: login -> meetings list -> upload meeting -> details edit -> logout in `frontend-mobile/integration_test/app_smoke_test.dart`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - Blocks all subsequent user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2.
  - Phase 3 (Auth) and Phase 4 (Meetings) are P1 and should be prioritized first.
  - Phase 5 (Upload) depends on Phase 4 (Meetings) to display new entries.
  - Phase 6 (Details/Insights) depends on Phase 4 (Meetings) to load specific data.
  - Phase 7 (Analytics) and Phase 8 (Admin) can run in parallel after P1 flows are verified.
- **Polish (Phase 9)**: Depends on all stories completion.

### Parallel Opportunities

- Foundation phase utilities marked [P] can be created in parallel.
- All models marked [P] under User Stories can be written before API clients are active.
- Phase 7 (Analytics) and Phase 8 (Admin) can be developed concurrently by separate developer flows.

---

## Implementation Strategy

### MVP First (User Story 1, 2, 3)

1. Complete Setup + Foundational phases.
2. Complete Auth (Phase 3), Meetings List (Phase 4), and Upload (Phase 5).
3. **STOP and VALIDATE**: Verify users can login, view meetings, and upload new ones.
4. Integrate details (Phase 6) and analytics (Phase 7).
5. Hardening and UI polish.
