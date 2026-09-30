# Data Model: Admin Dashboard Navigation State

**Feature**: 004-admin-dashboard  
**Date**: 2026-04-02

---

## 1. Admin Navigation State (Frontend, in-memory)

This is the runtime state held in `AdminDashboard.tsx`. It is not persisted to the server.

### `AdminNavState`

```ts
type SectionType = 'meetings' | 'upload' | 'organisation' | 'users';

type MeetingSubView = 'overview' | 'transcription' | 'pv' | 'analytics';

interface AdminNavState {
  activeSection: SectionType;        // Which primary sidebar item is active
  activeMeeting: Meeting | null;     // Currently selected meeting (survives sidebar nav)
  activeMeetingView: MeetingSubView | null; // Active sub-view within a meeting
}
```

**State transitions**:

```
INITIAL → activeSection=meetings, activeMeeting=null, activeMeetingView=null
User clicks a meeting card → activeMeeting=<meeting>, activeMeetingView=overview
Admin clicks Transcription → activeMeetingView=transcription
Admin clicks PV → activeMeetingView=pv
Admin clicks Analytics → activeMeetingView=analytics
Admin clicks back/Overview → activeMeetingView=overview
Admin clicks "Upload" in sidebar → activeSection=upload (activeMeeting PRESERVED)
Admin clicks "Meetings" in sidebar → activeSection=meetings (activeMeeting PRESERVED → resumes last sub-view)
Admin clicks logo → activeSection=meetings, activeMeetingView=null (return to meeting list)
```

---

## 2. Business Entities (from Symfony/PostgreSQL)

These entities are read by the admin dashboard from the Symfony REST API.

### Meeting

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| title | string | Meeting title |
| date | datetime | Recording date |
| duration | integer | Duration in seconds |
| status | enum | `pending`, `transcribing`, `transcribed`, `translated`, `pv_generated`, `completed` |
| participants | User[] | Meeting participants |
| department | Department | Owning department |
| team | Team | Owning team |
| hasTranscript | boolean | Derived: transcript record exists |
| hasPV | boolean | Derived: summary/PV record exists |
| hasAnalytics | boolean | Derived: analytics record exists |

**Lifecycle / state transitions**:
```
pending → transcribing → transcribed → translated → pv_generated → completed
```

### Transcript

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| meetingId | integer | FK to Meeting |
| language | string | Source language (ISO 639-1) |
| translatedLanguage | string | Target language, null if not translated |
| content | Segment[] | Array of speaker-diarized segments |
| createdAt | datetime | |

### Segment

| Field | Type | Notes |
|-------|------|-------|
| speaker | string | Speaker label (SPEAKER_A, etc.) |
| start | float | Start time in seconds |
| end | float | End time in seconds |
| text | string | Transcribed text |

### PV (Procès-Verbal / Summary)

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| meetingId | integer | FK to Meeting |
| content | string | Structured PV text (markdown) |
| decisions | string[] | Key decisions extracted |
| actionItems | ActionItem[] | Assigned tasks |
| createdAt | datetime | |

### ActionItem

| Field | Type | Notes |
|-------|------|-------|
| text | string | Task description |
| assignee | string | Person name |
| dueDate | date | Optional |

### Analytics

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| meetingId | integer | FK to Meeting |
| engagementScore | float | 0-100 |
| balanceScore | float | 0-100 (talk time balance) |
| totalInterventions | integer | |
| interruptions | integer | |
| silencePercentage | float | |
| avgTurnDuration | float | Seconds |
| participantStats | ParticipantStat[] | Per-speaker breakdown |

### ParticipantStat

| Field | Type | Notes |
|-------|------|-------|
| speaker | string | Speaker label |
| talkTimePercentage | float | |
| interventionCount | integer | |
| interruptionCount | integer | |

### Department

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| name | string | |
| teams | Team[] | Child teams |
| createdAt | datetime | |
| deletedAt | datetime\|null | Soft-delete |

### Team

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| name | string | |
| departmentId | integer | FK to Department |
| members | User[] | |
| projects | Project[] | |
| deletedAt | datetime\|null | Soft-delete |

### User

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| email | string | Unique |
| firstName | string | |
| lastName | string | |
| roles | string[] | e.g. `["ROLE_USER"]`, `["ROLE_ADMIN"]` |
| teamId | integer | FK to Team |
| permissions | Permission[] | Feature-level permissions |
| deletedAt | datetime\|null | Soft-delete |

### Permission

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| userId | integer | FK to User |
| feature | enum | `transcription`, `pv`, `analytics`, `upload` |
| granted | boolean | |

### Project

| Field | Type | Notes |
|-------|------|-------|
| id | integer | Primary key |
| name | string | |
| teamId | integer | FK to Team |
| deletedAt | datetime\|null | Soft-delete |
