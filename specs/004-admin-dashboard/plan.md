# Implementation Plan: Admin Dashboard with Persistent Sidebar

**Branch**: `004-admin-dashboard` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-admin-dashboard/spec.md`

---

## Summary

Refactor and complete the admin dashboard so that the primary sidebar is always visible and interactive, the four sections (Meetings, Upload, Organisation, Users) are rendered as embedded sub-views in correct order, and the full meeting workflow (Overview → Transcription → PV → Analytics) is navigable within the admin layout without ever leaving it. Meeting context (selected meeting + active sub-view) persists when switching between sidebar items.

**Approach**: Add `isEmbedded` + `onNavigate` callback prop to Overview, Transcription, RefineSummary, and BehavioralAnalytics pages; lift meeting navigation state into `AdminDashboard`; fix sidebar item order; patch Navbar logo behavior for admin context.

---

## Technical Context

**Language/Version**: TypeScript (admin components) + JavaScript (page components) · React 18 · Vite 7.x  
**Primary Dependencies**: framer-motion (animations), lucide-react (icons), axios (API calls via `api.js`), react-router-dom v6  
**Storage**: PostgreSQL via Symfony ORM (backend) — admin panel uses in-memory React state for nav  
**Testing**: Vitest + Testing Library (per constitution)  
**Target Platform**: Desktop browser (≥1280px viewport) — mobile out of scope per spec  
**Project Type**: Web application (React SPA frontend)  
**Performance Goals**: Section transitions < 300ms (SC-003) · Sidebar never unmounts or reloads  
**Constraints**: No new services beyond Flask/Symfony/React · No React Router nested routes (flat routing preserved) · YAGNI — no new abstractions without concrete need  
**Scale/Scope**: Single admin user per session · 7 files modified + 0 new components (reuse pattern)

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Service Isolation | ✅ PASS | React only calls Symfony. No direct Flask calls from frontend. |
| II. API-First Design | ✅ PASS | All 3 API contract files created in `contracts/` before implementation |
| III. Security by Default | ✅ PASS | Admin panel is behind `PrivateRoute` + ROLE_ADMIN check in login redirect |
| IV. Data Ownership | ✅ PASS | No data stored in Flask; Symfony is single source of truth |
| V. Observability | ⚠️ DEFERRED | React error tracking endpoint not yet configured — deferred to ops task |
| VI. Test Coverage | ✅ PLANNED | Vitest unit tests added as T043 (AdminDashboard state), T044 (Sidebar order), T045 (Navbar prop) in tasks.md — satisfies Constitution Principle VI (H2 fix) |
| VII. Simplicity & YAGNI | ✅ PASS | Reusing existing `isEmbedded` pattern; no new services or abstractions |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-dashboard/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── spec.md              ✅ Feature specification
├── contracts/
│   ├── admin-meetings-api.md       ✅ Phase 1 output
│   ├── admin-users-api.md          ✅ Phase 1 output
│   └── admin-organisation-api.md   ✅ Phase 1 output
├── checklists/
│   └── requirements.md  ✅ All items pass
└── tasks.md             🔲 Created by /speckit-tasks
```

### Source Code (repository root)

```text
Frontend-Web/
└── src/
    ├── components/
    │   └── Navbar/
    │       └── Navbar.jsx           [MODIFY] Add optional onLogoClick prop
    ├── pages/
    │   ├── Admin/
    │   │   ├── AdminDashboard.tsx   [MODIFY] Add activeMeeting + activeMeetingView state; onNavigate routing
    │   │   └── components/
    │   │       └── layout/
    │   │           └── Sidebar.tsx  [MODIFY] Reorder items: meetings→upload→organisation→users; fix default
    │   ├── Overview/
    │   │   └── Overview.jsx         [MODIFY] Add isEmbedded + onNavigate prop
    │   ├── Transcription/
    │   │   └── Transcription.jsx    [MODIFY] Add isEmbedded + onNavigate prop
    │   ├── RefineSummary/
    │   │   └── RefineSummary.jsx    [MODIFY] Add isEmbedded + onNavigate prop
    │   └── BehavioralAnalytics/
    │       └── BehavioralAnalytics.jsx [MODIFY] Add isEmbedded + onNavigate prop
    └── App.jsx                      [MODIFY if needed] Verify /admin sub-routes
```

---

## Implementation Phases

### Phase A: Foundation — Sidebar Order & Default Section (FR-001, FR-002)

**Files**: `Sidebar.tsx`, `AdminDashboard.tsx`

1. Reorder `navItems` array in `Sidebar.tsx` to: `meetings → upload → organisation → users`
2. Change `useState<SectionType>('organisation')` in `AdminDashboard.tsx` to `'meetings'`
3. Verify sidebar active indicator (`layoutId="sidebar-indicator"`) still animates correctly

**Why first**: Every other phase depends on the correct initial section being Meetings.

---

### Phase B: Navigation State Persistence (FR-014, SC-007)

**Files**: `AdminDashboard.tsx`

Add two new state variables to `AdminDashboardContent`:

```tsx
const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
const [activeMeetingView, setActiveMeetingView] = 
  useState<'overview' | 'transcription' | 'pv' | 'analytics' | null>(null);
```

Define the `onNavigate` callback to be passed to embedded pages:

```tsx
const handleMeetingNavigate = (target: string) => {
  switch (target) {
    case 'transcription': setActiveMeetingView('transcription'); break;
    case 'pv':            setActiveMeetingView('pv'); break;
    case 'analytics':     setActiveMeetingView('analytics'); break;
    case 'overview':      setActiveMeetingView('overview'); break;
    case 'back':          setActiveMeeting(null); setActiveMeetingView(null); break;
  }
};
```

Update `renderSection()` to:
- When `activeSection === 'meetings'` and `activeMeeting !== null` → render the appropriate sub-view based on `activeMeetingView`
- When `activeSection === 'meetings'` and `activeMeeting === null` → render `<ArchiveLibrary isEmbedded onMeetingSelect={(m) => { setActiveMeeting(m); setActiveMeetingView('overview'); }} />`

Switching sidebar items does NOT reset `activeMeeting` — it only changes `activeSection`.

---

### Phase C: Navbar Logo Behavior (FR-004)

**Files**: `Navbar.jsx`

Add optional prop `onLogoClick?: () => void`:

```jsx
const Navbar = ({ currentStep, hideSteps, onLogoClick }) => {
  const defaultLogoClick = () => navigate('/archive');
  // ...
  <div onClick={onLogoClick ?? defaultLogoClick}>
    <img src={logoSFM} ... />
  </div>
```

In `AdminDashboard.tsx`, pass:
```tsx
<GlobalNavbar 
  hideSteps={true} 
  currentStep={0}
  onLogoClick={() => { setActiveSection('meetings'); setActiveMeetingView(null); setActiveMeeting(null); }}
/>
```

---

### Phase D: Embed Overview (FR-010, US-2)

**Files**: `Overview.jsx`

Add `isEmbedded = false`, `onNavigate = null` props:

```jsx
export function Overview({ isEmbedded = false, onNavigate = null }) {
  const navigate = useNavigate();
  const go = (path) => isEmbedded && onNavigate ? onNavigate(path) : navigate(path);

  // Replace:
  //   navigate('/analytics')         → go('analytics')
  //   navigate('/transcription?...')  → go('transcription')
  //   navigate('/archive')           → go('back')
  //   navigate('/summary?...')       → go('pv')
```

- When `isEmbedded=true`, hide the standalone `<Navbar>` component and the back button that navigates to `/archive`
- The Overview's own secondary sidebar (VerticalProgressNav) is kept — it scrolls within sections of the Overview page itself (meeting-info, behavioral-analytics, transcription) — this is the *intra-overview* nav, not the inter-view nav

---

### Phase E: Embed Transcription, RefineSummary, BehavioralAnalytics (FR-005–FR-008)

**Files**: `Transcription.jsx`, `RefineSummary.jsx`, `BehavioralAnalytics.jsx`

Same pattern for each:
1. Add `isEmbedded = false` and `onNavigate = null` props
2. Replace `<Navbar ...>` with `{!isEmbedded && <Navbar ... />}`
3. Replace standalone `navigate()` calls for inter-page navigation with `go()` helper
4. Keep all internal business logic (transcription display, PV editor, analytics charts) unchanged

For each page, the back navigation should call `onNavigate('overview')` when embedded, so the admin returns to the meeting Overview.

---

### Phase F: Wire ArchiveLibrary Meeting Selection (US-1 Scenario 1)

**Files**: `ArchiveLibrary.jsx`, `AdminDashboard.tsx`

Add `onMeetingSelect?: (meeting: Meeting) => void` prop to `ArchiveLibrary`:
- When `isEmbedded=true` and user clicks a meeting card: call `onMeetingSelect(meeting)` instead of `navigate('/overview/:id')`

In `AdminDashboard`: 
```tsx
<ArchiveLibrary 
  isEmbedded={true}
  onMeetingSelect={(m) => { setActiveMeeting(m); setActiveMeetingView('overview'); }}
/>
```

---

### Phase G: Render Meeting Sub-Views in Admin (US-2)

**Files**: `AdminDashboard.tsx`

Complete the `renderSection()` logic for the Meetings section:

```tsx
case 'meetings':
  if (!activeMeeting) {
    return <ArchiveLibrary isEmbedded onMeetingSelect={...} />;
  }
  switch (activeMeetingView) {
    case 'overview':     return <Overview isEmbedded meeting={activeMeeting} onNavigate={handleMeetingNavigate} />;
    case 'transcription': return <Transcription isEmbedded meeting={activeMeeting} onNavigate={handleMeetingNavigate} />;
    case 'pv':           return <RefineSummary isEmbedded meeting={activeMeeting} onNavigate={handleMeetingNavigate} />;
    case 'analytics':    return <BehavioralAnalytics isEmbedded meeting={activeMeeting} onNavigate={handleMeetingNavigate} />;
  }
```

The `meeting` prop is passed down so embedded pages can use the meeting ID to fetch data from the API.

---

## Complexity Tracking

No constitution violations. All new code reuses existing `isEmbedded` pattern. No new services or abstractions introduced.

---

## Verification Plan

### Automated Tests (to add in tasks)

1. **Unit test** (`AdminDashboard.test.tsx`): `activeMeeting` persists after switching `activeSection` to `users` and back to `meetings`
2. **Unit test** (`Sidebar.test.tsx`): Items render in order: Meetings, Upload, Organisation, Users
3. **Unit test** (`Navbar.test.jsx`): `onLogoClick` prop is called on logo click when provided
4. **Integration test** (`admin-flow.test.tsx`): Full embedded navigation chain — click meeting → Overview → Transcription → back to Overview — sidebar always visible

### Manual Verification Checklist

- [ ] Admin logs in → lands on Meetings section (not Organisation)
- [ ] Sidebar order: Meetings, Upload, Organisation, Users
- [ ] Click a meeting → Overview loads in main area, primary sidebar unchanged
- [ ] Click Transcription from Overview → Transcription view loads, sidebar unchanged
- [ ] Click "Upload" in sidebar → Upload section loads, then click "Meetings" → returns to same meeting Transcription view
- [ ] Click logo in navbar → returns to Meetings list (not to /archive page)
- [ ] Upload section loads with drag-and-drop, sidebar unchanged

---

## Post-Plan Agent Context Update

Run after Phase 1 completes:
```
.specify/scripts/powershell/update-agent-context.ps1 -AgentType agy
```
