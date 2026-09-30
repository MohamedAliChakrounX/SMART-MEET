# Mobile REST API Contract Specifications

**Feature Branch**: `011-mobile-parity-api-integration`  
**Date**: 2026-07-29  
**Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/011-mobile-parity-api-integration/spec.md)

## Summary

This contract documents the Symfony REST API endpoints consumed by the Flutter mobile client (`frontend-mobile/`), matching the exact endpoints used by the React Web client (`Frontend-Web/`).

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/login`
- **Description**: Authenticates user and returns JWT access token.
- **Request Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "SecretPassword123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIs...",
    "user": {
      "id": 42,
      "email": "user@example.com",
      "first_name": "Jean",
      "last_name": "Dupont",
      "role": "ROLE_MANAGER",
      "department": "Engineering"
    }
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "code": 401,
    "message": "Invalid credentials."
  }
  ```

---

## 2. Meeting Endpoints (`/api/v1/meetings`)

### `GET /api/v1/meetings`
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `page=1&limit=20&search=quarterly`
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 101,
        "title": "Comité de Direction Q3",
        "category": "Management",
        "date": "2026-07-28 14:00",
        "duration": "45 min",
        "description": "Examen des performances et stratégie IA.",
        "participants": ["Jean Dupont", "Marie Curie"],
        "starred": true,
        "status": "COMPLETED"
      }
    ],
    "total": 1
  }
  ```

### `POST /api/v1/meetings/{id}/transcribe`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Request Body**: Form field `file` containing `.m4a` or `.wav` audio.
- **Response `202 Accepted`**:
  ```json
  {
    "meeting_id": 101,
    "status": "PROCESSING",
    "message": "Audio upload received and processing initiated."
  }
  ```

---

## 3. Transcript & Analytics Endpoints

### `GET /api/v1/meetings/{id}/transcript`
- **Response `200 OK`**:
  ```json
  {
    "meeting_id": 101,
    "segments": [
      {
        "id": 1,
        "speaker": "Jean Dupont",
        "speaker_color": "#3B82F6",
        "time_start": "00:05",
        "time_end": "00:32",
        "text": "Bienvenue à tous pour cette revue stratégique."
      }
    ]
  }
  ```

### `GET /api/v1/meetings/{id}/analytics`
- **Response `200 OK`**:
  ```json
  {
    "talk_time_distribution": [
      { "name": "Jean Dupont", "value": 65.5, "color": "#3B82F6" },
      { "name": "Marie Curie", "value": 34.5, "color": "#10B981" }
    ],
    "speakers": [
      {
        "id": "1",
        "name": "Jean Dupont",
        "initials": "JD",
        "role": "Facilitator",
        "talk_time": 65.5,
        "monopolization": 12.0,
        "stress": 5.2,
        "fragmentation": 15.0,
        "interventions": 18,
        "interruptions_given": 3,
        "interruptions_received": 1,
        "avg_duration": 42.5,
        "pitch_voice": "Normal",
        "energy_voice": "High",
        "tags": ["Directeur", "Facilitateur"],
        "strengths": ["Structure la discussion", "Clarté des consignes"],
        "areas_to_watch": ["Tendance à monopoliser la parole"],
        "style_quote": "Restons concentrés sur nos objectifs du T3.",
        "style_description": "Style direct et structurant."
      }
    ]
  }
  ```

---

## 4. Export Endpoints

### `GET /api/v1/export/pdf/{meetingId}`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Binary PDF application payload (`Content-Type: application/pdf`).
