# Feature Specification: Mobile Frontend API Integration & Full Web Parity

**Feature Branch**: `011-mobile-parity-api-integration`  
**Created**: 2026-07-29  
**Status**: Draft  
**Input**: Complete mobile frontend by replacing mock data with real backend API calls, preserving existing mobile design and architecture, and achieving 100% functional parity with the Web frontend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Authentication & Session Management (Priority: P1)

As a mobile application user, I want to log in using my real account credentials and have my session securely managed so that I can access my personalized dashboard and resources without re-authenticating repeatedly or using mock user data.

**Why this priority**: Authentication is the blocking prerequisite for all personalized features. Without real backend authentication and secure token handling, no live user data or meeting management can function.

**Independent Test**: Can be fully tested by attempting login with valid and invalid backend credentials on a mobile device/emulator, verifying session persistence across app re-launches, and confirming automatic redirect on token expiration.

**Acceptance Scenarios**:

1. **Given** an unauthenticated mobile user on the login screen, **When** they submit valid credentials, **Then** the app authenticates against the live backend API, securely stores the session token, and navigates to the user's live dashboard.
2. **Given** an unauthenticated user, **When** they enter invalid credentials, **Then** the app displays a clear error message from the backend without storing any session state.
3. **Given** an authenticated user whose session token has expired, **When** they attempt any action requiring authorization, **Then** the app gracefully prompts for re-authentication and clears invalid session tokens.
4. **Given** an authenticated user, **When** they trigger the logout action, **Then** all local secure tokens are invalidated and the app returns to the unauthenticated login screen.

---

### User Story 2 - Real-Time Meeting Management & Audio Upload (Priority: P1)

As a mobile application user, I want to view my actual meetings, record or upload meeting audio, and follow processing status so that I can manage and review my meetings on the go identically to the Web application.

**Why this priority**: Core value proposition of Meeting-IA is meeting processing and review. Replacing mock meeting lists and mock upload flows with live API integration provides immediate user utility.

**Independent Test**: Can be fully tested by creating a meeting, recording/uploading audio from the mobile interface, and verifying that the live backend processes the file, updates meeting status, and returns the real generated transcript.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the mobile meeting list screen, **When** the screen loads, **Then** the app fetches and displays the actual list of meetings from the live backend database (filtered by user access permissions).
2. **Given** an authenticated user on the mobile meeting creation screen, **When** they submit meeting details and audio recordings, **Then** the audio payload is transmitted to the backend API, and the meeting transitions into a processing state.
3. **Given** a meeting currently being processed, **When** the backend completes transcription/analysis, **Then** the mobile interface reflects the updated status and displays the full generated transcript.
4. **Given** an existing meeting, **When** the user searches or filters meetings by title, date, or tag, **Then** the list updates dynamically based on backend search responses matching Web frontend behavior.

---

### User Story 3 - Meeting Analytics & Behavioural Insights (Priority: P2)

As a manager or meeting participant, I want to view detailed meeting analytics and participant behavioural insights on mobile so that I have complete visibility into meeting metrics equal to the Web application.

**Why this priority**: Provides key analytical value for decision-makers. Existing mobile screens show static/mock charts that must be wired to real aggregated backend metrics.

**Independent Test**: Can be fully tested by navigating to the analytics view of a processed meeting or department dashboard and verifying that chart figures, talk-time ratios, sentiment scores, and engagement rates match live backend data.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a processed meeting detail screen, **When** selecting the analytics tab, **Then** the app renders real-time participant talk time distribution, sentiment analysis, and key topic metrics fetched from the backend.
2. **Given** an executive user viewing global or department dashboard metrics, **When** adjusting the date range or team filter, **Then** summary graphs update accurately based on live backend aggregation APIs.

---

### User Story 4 - Procès-Verbal (PV) Generation & Action Item Tracking (Priority: P2)

As a project member, I want to view generated official PV documents, edit action items, and export summaries directly from the mobile app so that task management remains synchronized across Web and Mobile.

**Why this priority**: Action item tracking and PV documentation drive post-meeting workflow execution. Parity with Web ensures mobile users can fulfill operational tasks on mobile devices.

**Independent Test**: Can be fully tested by completing an action item on mobile, marking a PV section as reviewed, and confirming that changes reflect in the backend database and on the Web interface.

**Acceptance Scenarios**:

1. **Given** a user reviewing a meeting's official PV document on mobile, **When** opening the document view, **Then** the application displays the structured summary, decision points, and action items retrieved from the backend API.
2. **Given** an assigned user on mobile, **When** updating an action item's status (e.g., from Pending to Completed), **Then** the update is sent to the backend and immediately synchronized across all client platforms.
3. **Given** a user requesting document export (PDF/Word), **When** triggering export on mobile, **Then** the backend document generation endpoint returns the downloadable file.

---

### User Story 5 - Team & Organization Management (Priority: P3)

As an organization admin or team member, I want to view team structures, department rosters, and user profiles on mobile so that organizational collaboration features match Web capabilities.

**Why this priority**: Completes organizational parity for administrative and multi-user collaboration features on mobile.

**Independent Test**: Can be fully tested by viewing team member lists and profile details on mobile and verifying accurate alignment with backend directory records.

**Acceptance Scenarios**:

1. **Given** an authenticated user navigating to the Team or Department screen, **When** data is loaded, **Then** real organizational members, roles, and assigned meetings are displayed from backend APIs.
2. **Given** a user modifying their profile settings (e.g., display name, notification preferences), **When** saving changes, **Then** the updated profile is persisted via backend REST endpoints.

---

### Edge Cases

- **Network Interruption during Audio Upload**: Mobile loses network connection while transmitting a multi-megabyte meeting audio file. The application must display clear connection retry prompts without losing local recording files or corrupting state.
- **Session Expiration during Active Use**: JWT token expires while a user is editing an action item or filling out meeting metadata. The app must preserve unsaved text locally, prompt re-authentication, and resume submitting upon successful login.
- **Backend API Error Responses**: Backend returns 500 error or validation failures (422/400). The app must display user-friendly, localized error notifications rather than crashing or showing blank mock screens.
- **Large Transcripts / High Volume Data**: Meetings with hundreds of transcript lines or extensive analytics. The mobile UI must handle long scroll views smoothly without memory spikes or lag.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mobile application MUST authenticate users via live backend REST JWT endpoints and enforce secure token storage.
- **FR-002**: Mobile application MUST eliminate all static mock data objects, mock repositories, and simulated API delays across all screens.
- **FR-003**: Mobile application MUST fetch, display, search, and filter meetings directly from backend REST endpoints.
- **FR-004**: Mobile application MUST support uploading meeting audio recordings to backend ingestion endpoints with progress indicators.
- **FR-005**: Mobile application MUST display live meeting processing status (transcription, translation, analysis) updated via polling or backend events matching Web behavior.
- **FR-006**: Mobile application MUST render interactive meeting transcripts, speaker labels, timestamps, and search highlights powered by backend data.
- **FR-007**: Mobile application MUST display meeting analytics (participant speak ratios, sentiment trends, topic breakdown) using backend analytics REST endpoints.
- **FR-008**: Mobile application MUST display generated Procès-Verbal (PV) documents and enable action item status updates synchronized with backend storage.
- **FR-009**: Mobile application MUST support document download and export triggers matching Web capabilities.
- **FR-010**: Mobile application MUST fetch user profiles, team rosters, and department structures from live backend REST endpoints.
- **FR-011**: Mobile application MUST handle API errors, offline states, and token expiration gracefully without data loss or UI crashes.
- **FR-012**: Mobile application MUST preserve the existing visual theme, component hierarchy, navigation structure, and UX styling without introducing visual regressions.
- **FR-013**: Mobile application MUST enforce role-based access restrictions on mobile screens in full alignment with backend permissions and Web client capabilities.

### Key Entities

- **User**: System user with authentication credentials, role (Admin, Manager, Member), department membership, and profile settings.
- **Meeting**: Scheduled or recorded meeting entity containing title, date, duration, participants, status, and raw audio references.
- **Transcript**: Sequential text elements linked to a meeting, containing speaker identifiers, timestamps, text snippets, and sentiment scores.
- **PV Document**: Official Procès-Verbal document linked to a meeting, containing executive summary, key decisions, and structured action items.
- **Action Item**: Individual task assigned during a meeting, with assignee, description, due date, and completion status.
- **Analytics Record**: Aggregated data entity detailing talk-time ratios, emotion/sentiment breakdown, and topic distribution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of mobile screens and components operate on live backend REST API data with zero mock data references in production builds.
- **SC-002**: Mobile application achieves 100% functional feature parity with the Web application for authentication, meeting processing, transcript viewing, analytics, PV management, and profile settings.
- **SC-003**: Users can successfully log in, record/upload a meeting, view live transcripts, and inspect analytics on mobile with under 3 seconds latency for standard API calls.
- **SC-004**: Mobile UI design, screen flow, navigation, and brand identity remain 100% consistent with existing mobile design assets with zero visual or layout regressions.
- **SC-005**: Zero app crashes or unhandled state exceptions occur when handling network drops or backend API error responses during mobile operations.

## Assumptions

- The backend REST API endpoints and data models are fully implemented, documented, tested, and operational.
- The Web frontend (`Frontend-Web/`) is fully functional and serves as the definitive reference for expected feature behavior, API usage, and business logic.
- The existing mobile code (`frontend-mobile/`) provides the complete visual UI layout and navigation structure, requiring connection to backend services rather than visual re-design.
- Mobile client authentication will utilize secure device storage (Expo SecureStore / Keychain) for JWT token persistence.
