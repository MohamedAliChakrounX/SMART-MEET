# API Contract: Admin Meetings

**Feature**: 004-admin-dashboard  
**Service**: Symfony Backend (`http://127.0.0.1:8000/api/v1`)  
**Auth**: Bearer JWT token required on all endpoints

---

## GET /api/v1/meetings

List paginated meetings (used by ArchiveLibrary embedded in admin).

**Query params**:
```
page    integer  default: 1
limit   integer  default: 20
search  string   optional — filter by title
status  string   optional — filter by status enum
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Q4 Product Strategy Review",
      "date": "2023-10-24T09:00:00Z",
      "duration": 4500,
      "status": "completed",
      "hasTranscript": true,
      "hasPV": true,
      "hasAnalytics": true,
      "participants": [
        { "id": 1, "firstName": "Sarah", "lastName": "M.", "email": "sarah@example.com" }
      ],
      "department": { "id": 1, "name": "Product" },
      "team": { "id": 1, "name": "Core Team" }
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 42
  }
}
```

---

## GET /api/v1/meetings/{id}

Get a single meeting's full detail (used by Overview embedded in admin).

**Response 200**:
```json
{
  "id": 1,
  "title": "Q4 Product Strategy Review",
  "date": "2023-10-24T09:00:00Z",
  "duration": 4500,
  "status": "completed",
  "hasTranscript": true,
  "hasPV": true,
  "hasAnalytics": true,
  "participants": [ ... ],
  "department": { "id": 1, "name": "Product" },
  "team": { "id": 1, "name": "Core Team" }
}
```

---

## GET /api/v1/meetings/{id}/transcript

Get the transcript for a meeting (used by Transcription embedded in admin).

**Response 200**:
```json
{
  "id": 5,
  "meetingId": 1,
  "language": "fr",
  "translatedLanguage": "en",
  "segments": [
    { "speaker": "SPEAKER_A", "start": 0.0, "end": 45.2, "text": "Bonjour à tous..." }
  ],
  "createdAt": "2023-10-24T11:00:00Z"
}
```

**Response 404**: No transcript available yet.

---

## POST /api/v1/meetings/{id}/transcribe

Trigger transcription for a meeting (delegates to Flask AI service internally).

**Response 202**: Transcription job started.
```json
{ "status": "transcribing", "message": "Transcription started" }
```

---

## POST /api/v1/meetings/{id}/translate

Trigger translation of an existing transcript.

**Request body**:
```json
{ "targetLanguage": "en" }
```

**Response 202**: Translation job started.

---

## GET /api/v1/meetings/{id}/summary

Get the PV/summary for a meeting (used by RefineSummary embedded in admin).

**Response 200**:
```json
{
  "id": 3,
  "meetingId": 1,
  "content": "# Procès-Verbal\n\n## Décisions\n...",
  "decisions": ["Validate Q4 roadmap", "Hire 2 devs"],
  "actionItems": [
    { "text": "Update roadmap doc", "assignee": "Sarah M.", "dueDate": "2023-11-01" }
  ],
  "createdAt": "2023-10-24T12:00:00Z"
}
```

---

## POST /api/v1/meetings/{id}/generate-summary

Trigger PV generation (delegates to Flask AI service internally).

**Response 202**: PV generation started.

---

## GET /api/v1/meetings/{id}/analytics

Get behavioral analytics for a meeting (used by BehavioralAnalytics embedded in admin).

**Response 200**:
```json
{
  "id": 2,
  "meetingId": 1,
  "engagementScore": 78.0,
  "balanceScore": 65.0,
  "totalInterventions": 103,
  "interruptions": 12,
  "silencePercentage": 15.0,
  "avgTurnDuration": 42.0,
  "participantStats": [
    { "speaker": "SPEAKER_A", "talkTimePercentage": 35, "interventionCount": 40, "interruptionCount": 3 }
  ]
}
```

---

## POST /api/v1/meetings/upload

Upload a new meeting audio file (used by Upload embedded in admin).

**Request**: multipart/form-data
```
file        binary   Audio file (MP3, WAV, M4A, WEBM)
title       string   Meeting title
date        string   ISO 8601 date
departmentId integer  Optional
teamId       integer  Optional
```

**Response 201**:
```json
{ "id": 42, "status": "pending", "title": "New Meeting" }
```

**Implementation note**: The Vite proxy rewrites `POST /api/v1/meetings/upload` → `POST /api/meetings/upload` on the Flask server (port 5001). The proxy is already configured in `vite.config.js`.
