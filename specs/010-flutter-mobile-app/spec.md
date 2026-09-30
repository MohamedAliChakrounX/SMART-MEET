# Feature Specification: Flutter Mobile Application Parity

**Feature Branch**: `010-flutter-mobile-app`  
**Created**: 2026-06-03  
**Status**: Draft  
**Input**: User description: "Application mobile (Flutter) dans frontend-mobile, 100% de parité fonctionnelle et visuelle avec la version web."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Authentication & Session Management (Priority: P1)

As a registered member of the Meeting-IA platform, I want to log in securely, remain authenticated across sessions, and log out when done, so that my meeting data remains private and easily accessible.

**Why this priority**: Core requirement for access control and data security. All other features depend on a valid user session.

**Independent Test**: Can be tested by launching the app, entering credentials, successfully reaching the meetings library, closing and reopening the app (session persists), and clicking log out to return to the login screen.

**Acceptance Scenarios**:

1. **Given** the user is unauthenticated, **When** they open the app, **Then** they see a login screen.
2. **Given** the user enters valid credentials, **When** they tap the submit button, **Then** they are redirected to the meetings library.
3. **Given** the user is logged in, **When** they close the app and reopen it, **Then** they bypass the login screen and go directly to the meetings library.
4. **Given** the user is logged in, **When** they tap logout, **Then** their session is destroyed and they are returned to the login screen.

---

### User Story 2 - Meetings Library & Infinite Scroll (Priority: P1)

As a user, I want to view my meetings list with search/filter capabilities and infinite scroll, so that I can easily browse and locate any meeting record on my mobile device.

**Why this priority**: Primary navigation hub of the application.

**Independent Test**: Can be tested by logging in, viewing the list, searching for a specific meeting, and scrolling down to trigger the loading of additional items.

**Acceptance Scenarios**:

1. **Given** a list of meetings exists, **When** the page loads, **Then** the first 10 meetings are displayed with a "Voir plus" pagination or automatic infinite scroll load.
2. **Given** the user types in the search bar, **When** search results load, **Then** only matching meetings are shown.
3. **Given** the user is at the bottom of the list, **When** they scroll further, **Then** the next batch of meetings is fetched and appended.

---

### User Story 3 - Audio Upload & AI Transcription Tracking (Priority: P1)

As a user, I want to upload audio files from my mobile device and track their processing status, so that I can transcribe new meetings on the go.

**Why this priority**: Essential feature to generate new content and value in the platform.

**Independent Test**: Can be tested by tapping the upload button, choosing a local audio file, submitting it, seeing the upload progress, and verifying the new meeting appears in the library with an "In Progress" status.

**Acceptance Scenarios**:

1. **Given** the user is on the upload screen, **When** they select an audio file and submit, **Then** they see a progress indicator showing the upload status.
2. **Given** the upload is successful, **When** the app redirects to the library, **Then** the new meeting appears with the state "Traitement IA en cours...".
3. **Given** the system is transcribing, **When** transcription finishes, **Then** the status changes to complete and insights become viewable.

---

### User Story 4 - Meeting Details & Insights Editing (Priority: P2)

As a user, I want to view the transcript, AI summaries, and decisions for a meeting, and edit them directly, so that I can correct errors and refine meeting outcomes.

**Why this priority**: Primary consumption and validation screen of the application.

**Independent Test**: Can be tested by opening a meeting, switching between transcript, summary, and decision tabs, editing a line of the transcript, and confirming the change is saved on the server.

**Acceptance Scenarios**:

1. **Given** the user is viewing a meeting, **When** they tap the edit button on the transcript or summary, **Then** the text fields become editable.
2. **Given** the user saves their modifications, **When** the API request succeeds, **Then** the updated text is persisted and displayed.
3. **Given** the user is editing, **When** they tap cancel, **Then** the modifications are discarded and original content is restored.

---

### User Story 5 - Behavioral Analytics Visualizations (Priority: P3)

As a user, I want to view charts and statistics representing speaker dynamics and patterns, so that I can analyze communication behaviors during the meeting.

**Why this priority**: Core value-add analytical feature.

**Independent Test**: Can be tested by opening a completed meeting, going to the analytics tab, and verifying that the participant speaking time and turn-taking charts display correct proportions.

**Acceptance Scenarios**:

1. **Given** a completed meeting has analytics data, **When** the user taps the analytics tab, **Then** speaking time percentages and turn-taking distribution are rendered as interactive mobile charts.

---

### User Story 6 - Organization & User Administration (Priority: P3)

As an administrator, I want to manage organization details, teams, departments, and user accounts, so that I can control platform access and departments structure.

**Why this priority**: Required for administrative governance; low priority for standard mobile users but required for parity.

**Independent Test**: Can be tested by logging in as an admin, navigating to the administration panel, viewing users, and updating a user's role.

**Acceptance Scenarios**:

1. **Given** an admin user is logged in, **When** they open the administration section, **Then** they see options for Users, Teams, and Organizations.
2. **Given** a standard user is logged in, **When** they attempt to access administration routes, **Then** they are blocked and receive a permission error.

---

### Edge Cases

- **Network loss during audio upload**: The app must handle disconnection gracefully, pause the upload, show an offline warning, and allow the user to retry when connection is restored.
- **Background uploading**: If the user minimizes the app during a large audio file upload, the upload should continue if possible or notify the user to keep the app open.
- **Large file limits**: The app must prevent selection of files larger than the maximum size allowed by the Symfony backend (e.g. 50MB) and display a clear error message.
- **Token expiration**: When a request returns a `401 Unauthorized` error, the app must attempt to use the refresh token silently. If refreshing fails, the user must be redirected to the login screen with an explanatory message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users via JWT credentials against the existing Symfony backend.
- **FR-002**: The application MUST support infinite scroll pagination in the meetings library list.
- **FR-003**: Users MUST be able to search and filter meetings by title, department, or date.
- **FR-004**: Users MUST be able to upload audio files in standard formats (e.g., MP3, WAV, M4A) up to the backend limit.
- **FR-005**: The application MUST show the real-time AI processing status of meetings in the library and detail views.
- **FR-006**: Users MUST be able to view and edit meeting transcripts, summaries, action items, and decisions.
- **FR-007**: The application MUST display behavioral analytics including speaker time percentages and turn-taking charts.
- **FR-008**: Administrators MUST be able to view, edit, create, and delete users, teams, and departments.
- **FR-009**: The mobile app UI/UX MUST adapt to mobile portrait/landscape orientations without layout overflow or loss of functional parity with the web interface.
- **FR-010**: The application MUST use Riverpod for state management and dependency injection.
- **FR-011**: The application MUST use Dio combined with Retrofit as the HTTP/API client.
- **FR-012**: The application MUST target Flutter 3.22+ (stable) with a minimum OS support of iOS 13+ and Android 6.0+ (API 23+).

### Key Entities *(include if feature involves data)*

- **User**: Represents a platform user with email, name, role (Admin/Standard), and department.
- **Meeting**: Represents a recorded meeting with title, date, duration, project, creator, and current status (Upload, In_Progress, Complete).
- **Transcript**: The written dialogue of the meeting, divided into segments with timestamps and speaker identifiers.
- **Summary**: The AI-generated summary of the meeting, including key topics and highlights.
- **Analytics**: Behavioral metrics of speakers, including talking duration and turn counts.
- **ActionItem**: A specific task assigned to a user during a meeting with status and deadline.
- **Decision**: A key decision recorded during the meeting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% functional parity with the React web application (all user flows and actions successfully executable on mobile).
- **SC-002**: Users can log in and reach the meetings library in under 2 seconds on a standard 4G connection.
- **SC-003**: The app successfully recovers session state (silent JWT refresh or auto-login) 100% of the time upon restart with a valid session.
- **SC-004**: Audio uploads under 20MB complete successfully with progress visual cues on standard Wi-Fi/cellular networks.
- **SC-005**: UI components render without any layout overflows or clipping across typical mobile viewport widths (320px to 480px).

## Assumptions

- **Existing Backend**: The Symfony backend API (`/api/v1/`) and the Flask AI service are fully functional, require no modifications, and are accessible over HTTP/HTTPS by the mobile client.
- **Network Dependency**: The mobile device has an active internet connection to consume the APIs (no full offline write-mode is expected for v1, only read-only local caching of loaded meetings).
- **Storage**: Tokens are stored locally on the client using secure OS-level keychain/keystore capabilities.
