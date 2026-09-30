# API Contracts: Meeting Endpoints

**Feature**: 003-postgres-migration | **Base URL**: `/api/v1`

## GET /meetings

List all meetings for the authenticated user (paginated).

### Request

```http
GET /api/v1/meetings?page=1&limit=20 HTTP/1.1
Authorization: Bearer <JWT>
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-indexed) |
| `limit` | int | 20 | Items per page (max 100) |

### Response 200

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Weekly Sync: Product Growth & Analytics",
      "category": "PRODUCT DEV",
      "date": "2023-10-24T14:00:00+00:00",
      "duration": "14:00 (45m)",
      "description": "Key decisions included the shift to...",
      "participants": ["Jane Doe", "John Smith", "Sarah Chen"],
      "starred": true,
      "status": "Completed"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 50,
    "itemsPerPage": 20
  }
}
```

### Response 401

```json
{ "code": 401, "message": "JWT Token not found" }
```

---

## GET /meetings/{id}

Get full meeting details with associated data.

### Request

```http
GET /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <JWT>
```

### Response 200

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Q4 Strategic Planning & Budget Review",
  "date": "2023-10-24",
  "startTime": "10:00 AM",
  "endTime": "11:30 AM",
  "location": "Executive Conference Room 3 (Hybrid)",
  "facilitator": "Jane Doe (Chief Operations Officer)",
  "status": "Completed",
  "confidential": true,
  "participants": [
    { "id": 1, "name": "Jane Doe", "role": "Product", "initials": "JD", "color": "#3B82F6" }
  ],
  "agendaItems": [
    "Review of Q3 financial performance..."
  ],
  "decisions": [
    "The Q4 Marketing budget is approved at $2.4M."
  ],
  "actionItems": [
    {
      "id": 1,
      "task": "Draft APAC Compliance Plan",
      "assignee": "Sarah Connor",
      "dueDate": "Nov 12, 2023",
      "status": "PENDING"
    }
  ]
}
```

### Response 404

```json
{ "code": 404, "message": "Meeting not found" }
```

---

## DELETE /meetings/{id}

Soft-delete a meeting (sets `deletedAt` timestamp).

### Request

```http
DELETE /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <JWT>
```

### Response 204

No content.

---

## GET /meetings/{id}/transcript

Get all transcript segments for a meeting (no pagination — FR-007).

### Request

```http
GET /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000/transcript HTTP/1.1
Authorization: Bearer <JWT>
```

### Response 200

```json
[
  {
    "id": 1,
    "speaker": "Speaker A",
    "speakerColor": "#3B82F6",
    "timeStart": "00:00",
    "timeEnd": "00:45",
    "text": "Good morning everyone..."
  }
]
```

### Response 200 (AI processing in progress)

When `meeting.status == "In_Progress"` and no segments exist yet:

```json
[]
```

Frontend displays "Traitement IA en cours..." placeholder when array is empty and status is `In_Progress`.

---

## PUT /meetings/{id}/transcript

Update transcript segments (batch upsert).

### Request

```http
PUT /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000/transcript HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

[
  {
    "id": 1,
    "speaker": "Speaker A",
    "speakerColor": "#3B82F6",
    "timeStart": "00:00",
    "timeEnd": "00:45",
    "text": "Updated content..."
  }
]
```

### Response 200

```json
{ "ok": true }
```

---

## GET /summaries/{meetingId}

Get the summary for a meeting.

### Request

```http
GET /api/v1/summaries/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <JWT>
```

### Response 200

```json
{
  "id": "...",
  "title": "Product Sync: Q3 Roadmap & Design Review",
  "modified": "2 mins ago",
  "detailLevel": "medium",
  "focusAreas": {
    "keyDecisions": true,
    "discussions": true,
    "actionItems": true
  },
  "content": {
    "executiveOverview": "The team convened to finalize...",
    "keyDecisions": ["Approved the integration of..."],
    "nextSteps": [
      { "task": "Sarah to finalize Figma prototypes", "due": "Wednesday, Sept 20", "completed": true }
    ]
  }
}
```

### Response 200 (not yet generated)

When summary is null (AI still processing):

```json
null
```

Frontend displays "Traitement IA en cours..." placeholder.

---

## PUT /summaries/{meetingId}

Update an existing summary.

### Request

```http
PUT /api/v1/summaries/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Updated title",
  "content": { "executiveOverview": "...", "keyDecisions": [], "nextSteps": [] },
  "detailLevel": "detailed",
  "focusAreas": { "keyDecisions": true, "discussions": false, "actionItems": true }
}
```

### Response 200

```json
{ "success": true, "summary": { "..." } }
```

---

## PUT /summaries/{meetingId}/settings

Update summary display settings.

### Request

```http
PUT /api/v1/summaries/550e8400-e29b-41d4-a716-446655440000/settings HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

{ "detailLevel": "short", "focusAreas": { "keyDecisions": true, "discussions": false, "actionItems": true } }
```

### Response 200

```json
{ "success": true, "settings": { "..." } }
```

---

## PUT /meetings/{id}/decisions

Update meeting decisions.

### Request

```http
PUT /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000/decisions HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

["Updated decision 1", "Updated decision 2"]
```

### Response 200

```json
{ "success": true, "decisions": ["..."] }
```

---

## POST /meetings/{id}/action-items

Add an action item to a meeting.

### Request

```http
POST /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000/action-items HTTP/1.1
Authorization: Bearer <JWT>
Content-Type: application/json

{ "task": "Review compliance plan", "assignee": "Jane Doe", "dueDate": "Nov 15, 2023" }
```

### Response 201

```json
{
  "success": true,
  "actionItem": { "id": "...", "task": "Review compliance plan", "assignee": "Jane Doe", "dueDate": "Nov 15, 2023", "status": "PENDING" }
}
```

---

## GET /meetings/{id}/analytics

Get behavioral analytics for a meeting.

### Request

```http
GET /api/v1/meetings/550e8400-e29b-41d4-a716-446655440000/analytics HTTP/1.1
Authorization: Bearer <JWT>
```

### Response 200

```json
{
  "meetingInfo": { "title": "...", "date": "...", "duration": "...", "participants": 4 },
  "summaryMetrics": [
    { "label": "ENGAGEMENT", "value": "78%", "color": "text-emerald-600", "bgColor": "bg-emerald-50" }
  ],
  "meetingDynamics": { "text": "..." },
  "talkTimeData": [ { "name": "Sarah", "value": 46, "fill": "#475569" } ],
  "radarData": [ { "subject": "Monopolization", "A": 72, "B": 45, "C": 25, "fullMark": 100 } ],
  "speakers": [ { "id": "SPK_01", "name": "Sarah Chen", "..." : "..." } ],
  "metricDefinitions": [ { "title": "Monopolization", "description": "..." } ]
}
```

---

## Flask → Symfony Webhook (Internal)

### POST /api/v1/internal/meetings/{id}/ai-results

Flask pushes AI processing results to Symfony for persistence.

**Authentication**: Shared secret header (`X-Internal-Secret`).

### Request

```http
POST /api/v1/internal/meetings/550e8400.../ai-results HTTP/1.1
X-Internal-Secret: <shared-secret>
Content-Type: application/json

{
  "type": "transcript|summary|analytics",
  "payload": { "..." }
}
```

### Response 200

```json
{ "ok": true }
```

### Response 401

```json
{ "code": 401, "message": "Invalid internal secret" }
```
