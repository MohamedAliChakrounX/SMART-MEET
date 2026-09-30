# Feature Specification: Admin Dashboard with Persistent Sidebar

**Feature Branch**: `004-admin-dashboard`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Interface Admin complète avec sidebar persistante, contrôle total sur Transcription, Traduction, PV, et Analytics comportementales"

## Clarifications

### Session 2026-04-02

- Q: How should sub-steps within a meeting (Transcription, PV, Analytics) be navigated from the admin panel? → A: The Overview section serves as the main entry point for each meeting. It provides clear and direct navigation to Transcription, PV, and Analytics — all embedded as sub-views within the admin layout.
- Q: How should the system handle navigation state when switching between primary sidebar items? → A: The system remembers the last active meeting context. Navigating back to "Meetings" returns the admin directly to the specific meeting and sub-view previously active (e.g., Transcription of meeting #123) with the secondary sidebar still open.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Navigates via Persistent Sidebar (Priority: P1)

The administrator accesses the admin panel and sees a fixed sidebar on the left side of the screen at all times. The sidebar contains four navigation items in strict order: **Meetings**, **Upload**, **Organisation**, **Users**. Clicking any item loads the corresponding content in the main area without the sidebar disappearing or re-rendering. The sidebar remains visible and interactive during all navigation events, page transitions, and content changes.

**Why this priority**: The persistent sidebar is the core structural element of the entire admin experience. Without it, the admin cannot navigate between features, and all other stories depend on it.

**Independent Test**: Can be fully tested by logging in as admin, clicking each sidebar item sequentially, and verifying the sidebar never disappears or reloads during transitions.

**Acceptance Scenarios**:

1. **Given** the admin is logged in, **When** the admin panel loads, **Then** a sidebar is visible on the left with items: Meetings, Upload, Organisation, Users — in that exact order.
2. **Given** the admin is on the Upload section, **When** the admin clicks "Organisation" in the sidebar, **Then** the Organisation content loads in the main area and the sidebar remains fully visible and unchanged.
3. **Given** the admin is on any section, **When** a secondary sidebar is needed (e.g., Overview detail view), **Then** it appears to the right of the primary sidebar, and the primary sidebar stays fixed on the left.
4. **Given** the admin clicks the logo in the top navbar, **Then** the admin is redirected to the Meetings section and the sidebar remains visible.
5. **Given** the admin is viewing a specific meeting sub-view (e.g., Transcription), **When** the admin clicks "Users" and then clicks back to "Meetings", **Then** the admin is returned exactly to the Transcription view of that same meeting.

---

### User Story 2 - Admin Manages the Full Meeting Workflow (Priority: P1)

The administrator can perform the entire meeting processing pipeline without leaving the admin panel. Starting from the Meetings list, the admin clicks on a meeting card to open its **Overview** page — the central hub for that meeting. From the Overview, the admin has direct navigation links to **Transcription**, **PV (Procès-Verbal)**, and **Behavioral Analytics**. Each of these sub-views loads in the main content area while the primary sidebar remains visible. The admin can navigate back to the Overview or switch between sub-views without losing progress.

**Why this priority**: This is the core value proposition — the admin must have unrestricted access to the complete meeting intelligence workflow in a unified, uninterrupted experience.

**Independent Test**: Can be fully tested by uploading a meeting audio file, waiting for transcription to complete, translating the transcript, generating a PV, and viewing behavioral analytics — all without the admin layout breaking.

**Acceptance Scenarios**:

1. **Given** the admin is on the Meetings section, **When** the admin clicks on a meeting card, **Then** the meeting Overview loads in the main content area while the primary sidebar stays visible.
2. **Given** the admin is viewing a meeting Overview, **When** the admin clicks the Transcription link, **Then** the Transcription view loads in the main content area with the primary sidebar still visible.
3. **Given** the admin is viewing a meeting Overview, **When** the admin clicks the PV link, **Then** the PV generation/viewing interface loads in the main content area with the primary sidebar still visible.
4. **Given** the admin is viewing a meeting Overview, **When** the admin clicks the Analytics link, **Then** the behavioral analytics dashboard loads in the main content area with the primary sidebar still visible.
5. **Given** the admin is on any meeting sub-view (Transcription, PV, or Analytics), **When** the admin clicks back or the Overview link, **Then** the admin returns to the meeting Overview without the sidebar reloading.

---

### User Story 3 - Admin Uploads Meeting Audio (Priority: P2)

The administrator clicks on "Upload" in the sidebar and is presented with the upload interface. The admin can drag-and-drop or browse for audio files, and optionally start a live recording. After uploading, transcription begins automatically and the admin can monitor progress.

**Why this priority**: Upload is the entry point for all new meeting data. Without it, the admin cannot process new meetings.

**Independent Test**: Can be fully tested by clicking "Upload" in the sidebar, uploading an audio file, and verifying transcription starts — all without leaving the admin layout.

**Acceptance Scenarios**:

1. **Given** the admin clicks "Upload" in the sidebar, **When** the upload interface loads, **Then** it appears in the main content area with drag-and-drop zone and live recording option, and the sidebar remains visible.
2. **Given** the admin uploads an audio file, **When** the upload succeeds, **Then** the system automatically begins transcription and the admin sees a progress indicator.

---

### User Story 4 - Admin Manages Organisation Structure (Priority: P2)

The administrator clicks "Organisation" in the sidebar and can manage departments, teams, and projects. The admin can create, update, and delete organizational entities. Changes persist across sessions.

**Why this priority**: Organisation management is essential for structuring meeting data and user access. It supports meeting categorization and permissions.

**Independent Test**: Can be fully tested by navigating to Organisation, creating a department, adding a team, and verifying the data persists after page refresh.

**Acceptance Scenarios**:

1. **Given** the admin clicks "Organisation" in the sidebar, **When** the section loads, **Then** the admin sees the list of departments, teams, and projects.
2. **Given** the admin creates a new department, **When** the creation is confirmed, **Then** the department appears in the list immediately.

---

### User Story 5 - Admin Manages Users and Permissions (Priority: P2)

The administrator clicks "Users" in the sidebar and can view, create, update, and delete user accounts. The admin can also assign permissions to users, controlling their access to transcription, PV, and analytics features at team and department levels.

**Why this priority**: User and permission management enables multi-user access control, which is required for any team deployment.

**Independent Test**: Can be fully tested by navigating to Users, creating a user, assigning permissions, and verifying the settings are applied.

**Acceptance Scenarios**:

1. **Given** the admin clicks "Users" in the sidebar, **When** the section loads, **Then** the admin sees the list of users with their roles and permissions.
2. **Given** the admin updates a user's permissions, **When** the changes are saved, **Then** the new permissions take effect immediately.

---

### Edge Cases

- On smaller desktop screens where the primary sidebar and secondary sidebar (e.g., Overview navigation) may compete for space, the secondary sidebar collapses or overlays — the primary sidebar always takes priority.
- If the admin triggers PV generation while a translation is still in progress, both operations run concurrently. The system displays progress for each independently.
- If the admin navigates away from an active upload (e.g., clicks "Organisation" in the sidebar), the upload continues in the background. A progress indicator remains visible in the sidebar or a notification area.
- Concurrent admin sessions modifying the same organisation data follow a last-write-wins strategy. No real-time collaborative editing is required for version 1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a persistent left sidebar containing exactly four navigation items in this order: Meetings, Upload, Organisation, Users.
- **FR-002**: The primary sidebar MUST remain visible and interactive at all times during admin navigation — it must never disappear, reload, or lose visual state.
- **FR-003**: When a secondary sidebar is required (e.g., meeting detail view), it MUST appear to the right of the primary sidebar, leaving the primary sidebar undisturbed.
- **FR-004**: Clicking the application logo in the top navbar MUST redirect the admin to the Meetings section while keeping the sidebar visible.
- **FR-005**: The admin MUST be able to initiate transcription for any uploaded meeting audio directly from the admin panel.
- **FR-006**: The admin MUST be able to trigger translation of a completed transcript into a target language from within the admin panel.
- **FR-007**: The admin MUST be able to generate a procès-verbal (PV) from a completed transcript, with real-time progress indication.
- **FR-008**: The admin MUST be able to view behavioral analytics for any completed meeting, including engagement metrics, talk-time distribution, and interruption data.
- **FR-009**: The admin MUST be able to upload audio files (MP3, WAV, M4A, WEBM) via drag-and-drop or file browser, and optionally use a live microphone recording.
- **FR-010**: The admin MUST be able to navigate the complete workflow via the meeting Overview as the central hub: Overview provides direct links to Transcription, PV, and Analytics. All sub-views load within the admin layout without losing sidebar context.
- **FR-011**: The admin MUST be able to manage departments, teams, and projects within the Organisation section.
- **FR-012**: The admin MUST be able to create, update, delete, and assign permissions to users within the Users section.
- **FR-013**: All section transitions within the admin panel MUST use smooth animations to provide visual continuity.
- **FR-014**: The system MUST persist the navigation state for the Meetings section: if an admin navigates away from a specific meeting detail and returns to "Meetings", they MUST be returned to the same meeting and sub-view (context retention).

### Key Entities

- **Meeting**: Represents a recorded meeting session with associated audio, transcript, PV, and analytics data.
- **Transcript**: The text output of speech-to-text processing for a meeting, organized by speaker segments.
- **Procès-Verbal (PV)**: A structured meeting summary generated from the transcript, containing decisions, action items, and key points.
- **Behavioral Analytics**: Statistical and interpretive data about meeting participants' engagement, talk time, interruptions, and behavioral patterns.
- **Department**: An organizational unit containing teams.
- **Team**: A group within a department containing users and associated with projects.
- **User**: A person with a role and set of permissions who can access the system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin sidebar remains visible and interactive during 100% of navigation events within the admin panel.
- **SC-002**: The admin can complete the full workflow (Upload → Transcription → Translation → PV → Analytics) in a single continuous session without leaving the admin layout.
- **SC-003**: Section transitions within the admin panel feel instantaneous — content loads visually within 300 milliseconds for locally-cached data.
- **SC-004**: The admin can access any of the four sidebar sections (Meetings, Upload, Organisation, Users) with a single click from any other section.
- **SC-005**: 95% of admin tasks (CRUD operations on users, departments, teams) are completable in under 3 clicks from the sidebar.
- **SC-006**: The admin can monitor transcription and PV generation progress in real-time without manually refreshing.
- **SC-007**: 100% of navigation events between primary sidebar items preserve the "last active" sub-state of each section.

## Assumptions

- The admin user has the `ROLE_ADMIN` role and is authenticated via JWT token before accessing the admin panel.
- The AI transcription, translation, and PV generation services are running and accessible (Flask service on port 5001).
- The existing meeting processing pipeline (Upload → Transcription → Translation → PV → Analytics) is functional and will be reused — this feature focuses on integrating it into the admin layout.
- The primary sidebar has a fixed width and is not collapsible in version 1.
- Mobile-specific admin layouts are out of scope for version 1 — the admin panel targets desktop/laptop screen sizes.
- The existing Organisation and Users management components will be reused from the current admin implementation.
- The top navbar uses the existing global Navbar component shared with the rest of the application.
