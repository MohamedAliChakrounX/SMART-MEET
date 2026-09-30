# Symfony API REST Contracts (Mobile Client)

This document describes the REST API endpoints exposed by the Symfony backend (`Backend/`) and consumed by the Flutter mobile client (`frontend-mobile/`).

All requests MUST include the header `Authorization: Bearer <jwt_token>` unless marked as public.

---

## 1. Authentication

### POST `/api/v1/auth/login` (PUBLIC)
Performs user login and returns JWT.

- **Request Body**:
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "test@example.com",
      "name": "John Doe",
      "role": "ROLE_ADMIN",
      "department": "Engineering"
    }
  }
  ```

---

## 2. Meetings Management

### GET `/api/v1/meetings?page={page}&search={search}`
Fetch paginated meetings list. Supports infinite scrolling and optional search queries.

- **Response (200 OK)**:
  ```json
  {
    "meetings": [
      {
        "id": 1,
        "title": "Weekly Planning Meeting",
        "date": "2026-06-03T10:00:00Z",
        "durationSeconds": 1820,
        "project": "Meeting-IA Mobile",
        "creatorName": "John Doe",
        "status": "Complete",
        "audioFilePath": "/uploads/audio/meeting_1.mp3"
      }
    ],
    "currentPage": 1,
    "hasMore": true
  }
  ```

### GET `/api/v1/meetings/{id}`
Fetch detailed properties of a single meeting.

- **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "title": "Weekly Planning Meeting",
    "date": "2026-06-03T10:00:00Z",
    "durationSeconds": 1820,
    "project": "Meeting-IA Mobile",
    "creatorName": "John Doe",
    "status": "Complete",
    "audioFilePath": "/uploads/audio/meeting_1.mp3"
  }
  ```

### POST `/api/v1/meetings` (Multipart)
Upload a new meeting audio file.

- **Request Headers**: `Content-Type: multipart/form-data`
- **Request Body**:
  - `file`: Binary audio file payload (MP3, WAV, etc.)
  - `title`: "Project Kickoff" (String)
  - `project`: "AI Platform" (String, optional)
- **Response (202 Accepted)**:
  ```json
  {
    "message": "Meeting audio uploaded successfully. AI processing queued.",
    "meetingId": 12,
    "status": "In_Progress"
  }
  ```

### PUT `/api/v1/meetings/{id}`
Update meeting meta properties.

- **Request Body**:
  ```json
  {
    "title": "Updated Title",
    "project": "New Project Name"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": 1,
    "title": "Updated Title",
    "project": "New Project Name",
    "status": "Complete"
  }
  ```

---

## 3. Transcription & Summary Insights

### GET `/api/v1/meetings/{id}/transcript`
Get the text segment list of the meeting transcript.

- **Response (200 OK)**:
  ```json
  {
    "meetingId": 1,
    "segments": [
      {
        "speaker": "Speaker 1",
        "timestamp": "00:00:15",
        "text": "Bonjour à tous, commençons la réunion."
      },
      {
        "speaker": "Speaker 2",
        "timestamp": "00:00:32",
        "text": "Oui, nous devons passer en revue le design system."
      }
    ],
    "lastUpdated": "2026-06-03T11:15:00Z"
  }
  ```

### PUT `/api/v1/meetings/{id}/transcript`
Update transcript segments.

- **Request Body**:
  ```json
  {
    "segments": [
      {
        "speaker": "John Doe",
        "timestamp": "00:00:15",
        "text": "Bonjour à tous, commençons notre session."
      }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Transcript updated successfully."
  }
  ```

### GET `/api/v1/meetings/{id}/summary`
Get the generated summary.

- **Response (200 OK)**:
  ```json
  {
    "id": 5,
    "meetingId": 1,
    "content": "Cette réunion a permis de valider le design system mobile...",
    "keyTopics": ["Design System", "Riverpod Integration"],
    "generatedAt": "2026-06-03T11:15:30Z"
  }
  ```

---

## 4. Behavioral Analytics

### GET `/api/v1/meetings/{id}/analytics`
Fetch speaking dynamics metrics.

- **Response (200 OK)**:
  ```json
  {
    "meetingId": 1,
    "totalDurationSeconds": 1820,
    "totalSpeakersCount": 2,
    "speakerMetrics": [
      {
        "speakerName": "John Doe",
        "speakingTimePercentage": 60.5,
        "turnCount": 18,
        "totalWords": 450
      },
      {
        "speakerName": "Jane Smith",
        "speakingTimePercentage": 39.5,
        "turnCount": 15,
        "totalWords": 310
      }
    ]
  }
  ```
