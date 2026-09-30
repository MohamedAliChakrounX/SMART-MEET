# Research: Admin Dashboard with Persistent Sidebar

**Feature**: 004-admin-dashboard  
**Date**: 2026-04-02

---

## 1. Current Codebase State

### What already exists and works

| Component | Status | Notes |
|-----------|--------|-------|
| `AdminDashboard.tsx` | ✅ Exists | Sidebar + AnimatePresence section switching |
| `Sidebar.tsx` | ⚠️ Exists, wrong order | Current order: Organisation, Users, Meetings, Upload — spec requires Meetings, Upload, Organisation, Users |
| `ArchiveLibrary.jsx` | ✅ `isEmbedded` done | Renders without Navbar/outer shell when embedded |
| `Upload.jsx` | ✅ `isEmbedded` done | Renders without Navbar/outer shell when embedded |
| `OrganisationSection.tsx` | ✅ Exists | Uses mock data (30 KB — complex UI in place) |
| `UsersSection.tsx` | ✅ Exists | Uses mock data (24 KB — complex UI in place) |
| `Overview.jsx` | ⚠️ Exists, not embeddable | Uses `navigate('/analytics')`, `navigate('/transcription')`, `navigate('/archive')` — breaks admin context |
| `Transcription.jsx` | ❌ Not embeddable | Has own Navbar + standalone layout |
| `RefineSummary.jsx` | ❌ Not embeddable | Has own Navbar + standalone layout |
| `BehavioralAnalytics.jsx` | ❌ Not embeddable | Has own Navbar + standalone layout |
| `Navbar.jsx` (logo click) | ⚠️ Goes to `/archive` | Should keep admin in admin context (call setActiveSection) |
| `App.jsx` router | ✅ Has `/overview/:id` | Dynamic route exists |

### Key gap: navigation state persistence

The `AdminDashboard.tsx` currently only tracks `activeSection` (which of the 4 sidebar items is active). There is no state for:
- Which meeting is currently being viewed
- Which sub-view (Overview / Transcription / PV / Analytics) is currently active for that meeting

This is the biggest architectural gap to close.

---

## 2. Key Decisions

### Decision 1: How to embed Overview, Transcription, PV, Analytics in admin

**Decision**: Add an `isEmbedded` + `onNavigate` callback prop pattern to each page — consistent with the existing approach used in ArchiveLibrary and Upload.

**Rationale**: 
- Maintains constitution's service isolation (no new services)
- Reuses existing components — no rework of business logic
- Each page keeps its own rendering logic; the admin layout controls the navigation
- Alternative (React Router nested routes) would require substantial routing refactor and break the current flat routing model

**Pattern**:
```tsx
// Each embeddable page
function Overview({ isEmbedded = false, onNavigate = null }) {
  const navigate = useNavigate();
  const goTo = (path) => isEmbedded && onNavigate ? onNavigate(path) : navigate(path);
  // Replace all navigate('/transcription') → goTo('transcription')
  // Replace navigate('/archive') → goTo('back')
}
```

The `onNavigate` callback is provided by `AdminDashboard` and maps path strings to sub-view state changes.

---

### Decision 2: Admin navigation state model

**Decision**: Lift state to `AdminDashboard` using two new state variables:
- `activeMeeting: Meeting | null` — the currently selected meeting object
- `activeMeetingView: 'overview' | 'transcription' | 'pv' | 'analytics' | null`

**Rationale**: 
- Simple React state — no new abstraction needed (YAGNI)
- State is owned by the top-level dashboard component which survives sidebar navigation
- When sidebar flips to Users and back to Meetings, `activeMeeting` is still set — satisfies FR-014

**Flow**:
```
Meetings list clicked → setActiveMeeting(meeting), setActiveMeetingView('overview')
Overview → Transcription → setActiveMeetingView('transcription')
Sidebar → Users → (activeMeeting stays in memory)
Sidebar → Meetings → renders Overview/Transcription/... for last activeMeeting
```

---

### Decision 3: Sidebar item order

**Decision**: Reorder `Sidebar.tsx` navItems array to: `meetings → upload → organisation → users`.

**Rationale**: Spec FR-001 is explicit. Current order (organisation, users, meetings, upload) is wrong. Default active section must also change from `'organisation'` to `'meetings'`.

**Also**: Label for users item currently says "Utilisateurs & Permissions" — align with spec's "Users" label (or keep French — UI decision, keep French per existing convention).

---

### Decision 4: Navbar logo behavior in admin context

**Decision**: Pass an optional `onLogoClick` prop to `Navbar.jsx`. When in admin context, `AdminDashboard` provides a callback that sets `activeSection = 'meetings'` and resets `activeMeetingView = null` (go to meeting list). Default behavior (`navigate('/archive')`) is preserved for all other pages.

**Rationale**: Minimal change to existing Navbar; no breaking changes to other pages.

---

### Decision 5: API contracts for Organisation and Users sections

**Decision**: The existing `OrganisationSection.tsx` and `UsersSection.tsx` use mock data internally. In this feature, we document the Symfony API contracts they should call, but wiring to real data is a separate concern. The plan will define the contracts and note which are implemented vs pending.

**Rationale**: Constitution requires API contracts defined before code. We can document them now and implement progressively.

---

## 3. Files to Modify (summary)

| File | Change type | Change |
|------|-------------|--------|
| `Sidebar.tsx` | Modify | Reorder items; change default section to meetings |
| `AdminDashboard.tsx` | Modify | Add activeMeeting + activeMeetingView state; route onNavigate callbacks |
| `Navbar.jsx` | Modify | Add optional `onLogoClick` prop |
| `Overview.jsx` | Modify | Add isEmbedded + onNavigate prop |
| `Transcription.jsx` | Modify | Add isEmbedded + onNavigate prop |
| `RefineSummary.jsx` | Modify | Add isEmbedded + onNavigate prop |
| `BehavioralAnalytics.jsx` | Modify | Add isEmbedded + onNavigate prop |

## 4. Files to Create

| File | Purpose |
|------|---------|
| `specs/004-admin-dashboard/contracts/admin-meetings-api.md` | Symfony API contracts for meetings endpoints used in admin |
| `specs/004-admin-dashboard/contracts/admin-users-api.md` | Symfony API contracts for users/permissions |
| `specs/004-admin-dashboard/contracts/admin-organisation-api.md` | Symfony API contracts for departments/teams/projects |
| `specs/004-admin-dashboard/data-model.md` | Admin-specific data model for navigation state |

---

## 5. No NEEDS CLARIFICATION items remain

All decisions above are resolved by codebase analysis + spec clarifications.
