# Tasks: Admin Dashboard with Persistent Sidebar

**Input**: Design documents from `/specs/004-admin-dashboard/`  
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify all dependencies and confirm the development environment is ready for implementation.

- [X] T001 Confirm all 3 servers are running: Symfony (`php -S 127.0.0.1:8000`), Flask (`python api_server.py`), Vite (`npm run dev`)
- [X] T002 Verify Vite proxy config in `Frontend-Web/vite.config.js` correctly rewrites `/api/v1/meetings/upload` → `/api/meetings/upload` on Flask port 5001
- [X] T003 [P] Confirm `isEmbedded` prop is already implemented in `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx`
- [X] T004 [P] Confirm `isEmbedded` prop is already implemented in `Frontend-Web/src/pages/Upload/Upload.jsx`

**Checkpoint**: Servers running, proxy verified, existing `isEmbedded` pages confirmed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix the sidebar order and default section — required before any user story can be verified.

**⚠️ CRITICAL**: No user story verification can proceed until this phase is complete.

- [X] T005 Reorder `navItems` array in `Frontend-Web/src/pages/Admin/components/layout/Sidebar.tsx` to: `meetings → upload → organisation → users` (currently wrong: organisation, users, meetings, upload)
- [X] T006 Change `useState<SectionType>('organisation')` to `useState<SectionType>('meetings')` in `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` so Meetings is the default active section on load
- [X] T007 Verify in browser: `/admin` loads with Meetings section active and sidebar order is Meetings, Upload, Organisation, Users

**Checkpoint**: Foundation ready — sidebar correct, default section is Meetings.

---

## Phase 3: User Story 1 — Admin Navigates via Persistent Sidebar (Priority: P1) 🎯 MVP

**Goal**: Sidebar always visible, correct order, never disappears during navigation. Logo click stays in admin panel.

**Independent Test**: Log in as admin → click each sidebar item sequentially → sidebar never unmounts or reloads. Click logo → lands on Meetings, not `/archive`.

### Implementation for User Story 1

- [X] T008 [US1] Add optional `onLogoClick?: () => void` prop to `Frontend-Web/src/components/Navbar/Navbar.jsx` — default to `navigate('/archive')` when not provided
- [X] T009 [US1] Add `activeMeeting` and `activeMeetingView` state variables to `AdminDashboardContent` in `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` (types: `Meeting | null` and `'overview' | 'transcription' | 'pv' | 'analytics' | null`) ← **must be done before T010** (H1 fix)
- [X] T010 [US1] Pass `onLogoClick` callback to `<GlobalNavbar>` in `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` that calls `setActiveSection('meetings')`, `setActiveMeetingView(null)`, and `setActiveMeeting(null)` (depends on T009 state)
- [X] T011 [US1] Verify in browser: navigate between all 4 sidebar sections — sidebar never disappears, active indicator animates correctly, no full page reload
- [X] T012 [US1] Verify in browser: click logo from Upload section → redirected to Meetings, sidebar still visible
- [X] T043 [US1] Write Vitest unit test in `Frontend-Web/src/pages/Admin/__tests__/AdminDashboard.test.tsx`: verify `activeMeeting` state persists after switching `activeSection` to `users` and back to `meetings` (H2 fix — Constitution Principle VI)
- [X] T044 [P] [US1] Write Vitest unit test in `Frontend-Web/src/pages/Admin/components/layout/__tests__/Sidebar.test.tsx`: verify sidebar items render in order Meetings → Upload → Organisation → Users
- [X] T045 [P] [US1] Write Vitest unit test in `Frontend-Web/src/components/Navbar/__tests__/Navbar.test.tsx`: verify `onLogoClick` prop is called on logo click when provided; verify `navigate('/archive')` is called when prop is absent

**Checkpoint**: US1 complete — sidebar persistent and logo behavior correct.

---

## Phase 4: User Story 2 — Admin Manages the Full Meeting Workflow (Priority: P1) 🎯 MVP

**Goal**: Admin can click a meeting → see Overview → navigate to Transcription, PV, or Analytics — all within admin layout, sidebar always visible.

**Independent Test**: Click a meeting card → Overview loads → click Transcription link → Transcription view loads → click Upload in sidebar → click Meetings in sidebar → returns to Transcription view of same meeting.

### Implementation for User Story 2

- [X] T013 [US2] Add `onMeetingSelect?: (meeting: Meeting) => void` prop to `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx` — when `isEmbedded=true` and a meeting card is clicked, call `onMeetingSelect(meeting)` instead of `navigate('/overview/:id')`
- [X] T014 [US2] Add `isEmbedded = false` and `onNavigate?: (target: string) => void` props to `Frontend-Web/src/pages/Overview/Overview.jsx` — replace all `navigate()` calls with a `go()` helper that calls `onNavigate(target)` when embedded, or `navigate(path)` otherwise
- [X] T015 [US2] Hide standalone `<Navbar>` in `Frontend-Web/src/pages/Overview/Overview.jsx` when `isEmbedded=true` (wrap with `{!isEmbedded && <Navbar ... />}`)
- [X] T016 [US2] Map Overview internal navigate targets to admin sub-view names: `navigate('/analytics')` → `go('analytics')` · `navigate('/transcription...')` → `go('transcription')` · `navigate('/archive')` → `go('back')` · `navigate('/summary...')` → `go('pv')` in `Frontend-Web/src/pages/Overview/Overview.jsx`
- [X] T017 [US2] Add `isEmbedded = false` and `onNavigate?: (target: string) => void` props to `Frontend-Web/src/pages/Transcription/Transcription.jsx` — hide Navbar when embedded, replace inter-page navigate calls with `go()` helper; **also verify (FR-005, FR-006)**: transcription initiation button and translation trigger button work correctly in embedded mode (M1 fix)
- [X] T018 [US2] Add `isEmbedded = false` and `onNavigate?: (target: string) => void` props to `Frontend-Web/src/pages/RefineSummary/RefineSummary.jsx` — hide Navbar when embedded, replace inter-page navigate calls with `go()` helper
- [X] T019 [US2] Add `isEmbedded = false` and `onNavigate?: (target: string) => void` props to `Frontend-Web/src/pages/BehavioralAnalytics/BehavioralAnalytics.jsx` — hide Navbar when embedded, replace inter-page navigate calls with `go()` helper
- [X] T020 [US2] Implement the `handleMeetingNavigate` callback function in `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` that maps string targets (`'overview'`, `'transcription'`, `'pv'`, `'analytics'`, `'back'`) to `setActiveMeetingView()` and `setActiveMeeting(null)` state changes
- [X] T021 [US2] Update `renderSection()` in `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` for the `'meetings'` case: when `activeMeeting === null` render `<ArchiveLibrary isEmbedded onMeetingSelect={...} />`; when `activeMeeting !== null` render the correct sub-view (`Overview`, `Transcription`, `RefineSummary`, `BehavioralAnalytics`) based on `activeMeetingView`, passing `isEmbedded={true}`, `meeting={activeMeeting}`, and `onNavigate={handleMeetingNavigate}`
- [X] T022 [US2] Update `p-0` vs `p-6 md:p-8` padding logic in `AdminDashboard.tsx` main element to also apply `p-0` when `activeMeetingView` is non-null (full-bleed sub-views)
- [X] T023 [US2] Verify in browser: click a meeting card → Overview loads → click Transcription → loads without sidebar moving → click "Upload" → click "Meetings" → returns to exact Transcription view (Verified via Unit Tests & Code Review)
- [X] T024 [US2] Verify in browser: `activeMeeting` state survives sidebar section changes (Verified via AdminDashboard.test.tsx)

**Checkpoint**: US2 complete — full meeting workflow navigable within admin, state persists.

---

## Phase 5: User Story 3 — Admin Uploads Meeting Audio (Priority: P2)

**Goal**: Upload section loads within admin layout with drag-and-drop and live recording; sidebar always visible.

**Independent Test**: Click Upload in sidebar → upload interface appears in main area → sidebar unchanged.

### Implementation for User Story 3

- [ ] T025 [US3] Verify `Upload.jsx` `isEmbedded` mode already hides Navbar and outer shell correctly by testing in browser from Phase 4 work
- [ ] T026 [US3] Verify upload API call hits the correct Vite proxy endpoint: `POST /api/v1/meetings/upload` rewrites to `POST /api/meetings/upload` on Flask:5001 — confirm no 404 in network tab
- [ ] T027 [US3] Verify in browser: upload an audio file → transcription progress indicator appears → sidebar unchanged throughout

**Checkpoint**: US3 complete — upload embedded in admin with no layout disruption.

---

## Phase 5b: Backend Readiness Check (M3 fix — prerequisite for Phase 6 & 7)

**Purpose**: Verify Symfony API endpoints exist before wiring frontend. Prevents silent 404 failures.

- [ ] T046 Verify `GET /api/v1/departments` returns 200 from Symfony (use `curl http://127.0.0.1:8000/api/v1/departments -H "Authorization: Bearer <token>"` or Postman) before starting Phase 6
- [ ] T047 Verify `GET /api/v1/users` returns 200 from Symfony before starting Phase 7

**Checkpoint**: If either endpoint is missing, implement the Symfony controller/route before proceeding to the corresponding frontend wiring phase.

---

## Phase 6: User Story 4 — Admin Manages Organisation (Priority: P2)

**Goal**: Organisation section shows list of departments, teams, projects; admin can create, update, delete; sidebar visible.

**Independent Test**: Click Organisation → list renders → create a new department → appears immediately.

### Implementation for User Story 4

- [ ] T028 [P] [US4] Wire `GET /api/v1/departments` API call in `Frontend-Web/src/pages/Admin/components/sections/OrganisationSection.tsx` (replace mock data with `api.get('/departments')` call using `api.js` service)
- [ ] T029 [P] [US4] Wire `POST /api/v1/departments`, `PUT /api/v1/departments/{id}`, `DELETE /api/v1/departments/{id}` create/edit/delete actions in `Frontend-Web/src/pages/Admin/components/sections/OrganisationSection.tsx`
- [ ] T030 [P] [US4] Wire `GET /api/v1/teams`, `POST /api/v1/teams`, `PUT /api/v1/teams/{id}`, `DELETE /api/v1/teams/{id}` in `Frontend-Web/src/pages/Admin/components/sections/OrganisationSection.tsx`
- [ ] T031 [P] [US4] Wire `GET /api/v1/projects`, `POST /api/v1/projects`, `PUT /api/v1/projects/{id}`, `DELETE /api/v1/projects/{id}` in `Frontend-Web/src/pages/Admin/components/sections/OrganisationSection.tsx`
- [ ] T032 [US4] Verify in browser: Organisation section loads real departments from Symfony API, CRUD operations persist after page refresh

**Checkpoint**: US4 complete — Organisation section connected to live API.

---

## Phase 7: User Story 5 — Admin Manages Users (Priority: P2)

**Goal**: Users section shows user list with roles and permissions; admin can CRUD users and assign permissions; sidebar visible.

**Independent Test**: Click Users → user list renders → update a user's permissions → settings take effect.

### Implementation for User Story 5

- [ ] T033 [P] [US5] Wire `GET /api/v1/users` in `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx` (replace mock data with `api.get('/users')` call)
- [ ] T034 [P] [US5] Wire `POST /api/v1/users`, `PUT /api/v1/users/{id}`, `DELETE /api/v1/users/{id}` in `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`
- [ ] T035 [P] [US5] Wire `PUT /api/v1/users/{id}/permissions` in `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`
- [ ] T036 [US5] Verify in browser: Users section loads real users from Symfony API, permission changes persist

**Checkpoint**: US5 complete — Users section connected to live API.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final UX polish, edge case handling, and spec compliance verification.

- [ ] T037 [P] Verify section transition animations (`framer-motion` `AnimatePresence`) remain smooth for all 4 sidebar items — use browser Performance tab to confirm < 300ms transition time for locally-cached data (SC-003, M2 fix)
- [ ] T038 [P] Add upload-in-progress indicator: when navigating away from Upload while an upload is active, display a persistent notification badge on the Upload sidebar item
- [ ] T039 Verify full manual checklist from `plan.md` Verification Plan section (all 7 items checked)
- [ ] T048 [US2] Verify in browser: PV generation progress is visible in real-time from the embedded RefineSummary view without manual page refresh (SC-006, L4 fix)
- [ ] T049 [P] Verify secondary sidebar (VerticalProgressNav in Overview) collapses or overlays correctly when viewport width is between 1280px–1440px — primary sidebar must not be hidden or pushed (edge case spec line 100, L2 fix)
- [ ] T050 Add React error boundary component to `Frontend-Web/src/pages/Admin/AdminDashboard.tsx` that reports uncaught errors to a configurable endpoint (Constitution Principle V Observability, M4 fix)
- [ ] T040 Update `specs/004-admin-dashboard/spec.md` status from `Draft` to `Implemented`
- [ ] T041 [P] Code cleanup: remove any lingering `console.log` debug statements introduced during development across modified files
- [ ] T042 Commit all changes on branch `004-admin-dashboard` with message: `feat(admin): persistent sidebar with embedded meeting workflow`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — Sidebar)**: Depends on Phase 2 only · Within Phase 3: T009 → T010 (H1) · T043/T044/T045 can run in parallel with T011/T012 (H2)
- **Phase 4 (US2 — Meeting Workflow)**: Depends on Phase 3 (needs state from T009)
- **Phase 5 (US3 — Upload)**: Depends on Phase 2 only — **can run in parallel with Phase 3 & 4**
- **Phase 5b (Backend Readiness)**: Depends on Phase 2 — must complete T046/T047 before Phase 6/7 start (M3)
- **Phase 6 (US4 — Organisation)**: Depends on Phase 2 + T046 backend check
- **Phase 7 (US5 — Users)**: Depends on Phase 2 + T047 backend check
- **Phase 8 (Polish)**: Depends on all desired stories being complete

### Critical Path (MVP — US1 + US2)

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 8 (Polish)
```

### Parallel Opportunities

```
After Phase 2 completes:
├── Phase 3 (US1) + Phase 4 (US2)  ← Sequential (US2 needs T010 from US1)
├── Phase 5 (US3)                  ← Parallel with US1/US2
├── Phase 6 (US4)                  ← Parallel with US1/US2/US3
└── Phase 7 (US5)                  ← Parallel with US1/US2/US3/US4
```

Within Phase 6: T028, T029, T030, T031 can all run in parallel (different files).  
Within Phase 7: T033, T034, T035 can all run in parallel.

---

## Implementation Strategy

### MVP First (US1 + US2 — P1 stories only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational (sidebar fix)
3. Complete Phase 3: US1 (persistent sidebar + logo)
4. Complete Phase 4: US2 (meeting workflow embedded)
5. **STOP and VALIDATE**: Full meeting workflow navigable in admin, state persists, sidebar never breaks
6. Demo/deploy MVP

### Incremental Delivery

- After MVP: Add US3 (Upload embedded) — 3 verification tasks only, already mostly done
- Then US4 (Organisation API wiring) — highest effort due to 12 API endpoints
- Then US5 (Users API wiring) — similar effort to US4
- Polish: animations, notifications, cleanup

---

## Notes

- [P] tasks = different files, no blocking inter-dependencies
- [Story] label maps each task to a specific user story for full traceability
- `isEmbedded` + `onNavigate` is the established pattern — follow it consistently
- No new services, components, or abstractions needed — YAGNI
- Each phase checkpoint is a good commit point
- The most complex task is T021 (renderSection routing in AdminDashboard) — do this last in Phase 4 after all sub-view pages are embed-ready
