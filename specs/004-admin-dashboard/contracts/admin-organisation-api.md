# API Contract: Admin Organisation

**Feature**: 004-admin-dashboard  
**Service**: Symfony Backend (`http://127.0.0.1:8000/api/v1`)  
**Auth**: Bearer JWT + ROLE_ADMIN required on all endpoints

---

## GET /api/v1/departments

List all departments with their teams.

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Product",
      "createdAt": "2026-01-01T00:00:00Z",
      "teams": [
        { "id": 1, "name": "Core Team", "memberCount": 5, "projectCount": 3 }
      ]
    }
  ]
}
```

---

## POST /api/v1/departments

Create a department.

**Request body**: `{ "name": "Engineering" }`

**Response 201**: Created department object.

---

## PUT /api/v1/departments/{id}

Update department name.

**Request body**: `{ "name": "Engineering & DevOps" }`

**Response 200**: Updated department.

---

## DELETE /api/v1/departments/{id}

Soft-delete a department.

**Response 204**: No content.

---

## GET /api/v1/teams

List all teams (optionally filtered by department).

**Query params**: `departmentId  integer  optional`

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Core Team",
      "departmentId": 1,
      "members": [ { "id": 1, "firstName": "John", "lastName": "Doe" } ],
      "projects": [ { "id": 1, "name": "Meeting IA" } ]
    }
  ]
}
```

---

## POST /api/v1/teams

Create a team.

**Request body**: `{ "name": "Core Team", "departmentId": 1 }`

**Response 201**: Created team object.

---

## PUT /api/v1/teams/{id}

Update team name or department assignment.

**Request body**: `{ "name": "New Team Name", "departmentId": 2 }`

**Response 200**: Updated team.

---

## DELETE /api/v1/teams/{id}

Soft-delete a team.

**Response 204**: No content.

---

## GET /api/v1/projects

List projects (optionally filtered by team).

**Query params**: `teamId  integer  optional`

**Response 200**:
```json
{ "data": [ { "id": 1, "name": "Meeting IA", "teamId": 1 } ] }
```

---

## POST /api/v1/projects

Create a project.

**Request body**: `{ "name": "Meeting IA", "teamId": 1 }`

**Response 201**: Created project.

---

## PUT /api/v1/projects/{id}

Update project.

**Request body**: `{ "name": "New Name" }`

**Response 200**: Updated project.

---

## DELETE /api/v1/projects/{id}

Soft-delete a project.

**Response 204**: No content.
