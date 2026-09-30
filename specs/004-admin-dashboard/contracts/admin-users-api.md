# API Contract: Admin Users & Permissions

**Feature**: 004-admin-dashboard  
**Service**: Symfony Backend (`http://127.0.0.1:8000/api/v1`)  
**Auth**: Bearer JWT + ROLE_ADMIN required on all endpoints

---

## GET /api/v1/users

List all users.

**Query params**:
```
page    integer  default: 1
limit   integer  default: 20
teamId  integer  optional — filter by team
search  string   optional — filter by name/email
```

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["ROLE_USER"],
      "team": { "id": 1, "name": "Core Team" },
      "permissions": [
        { "feature": "transcription", "granted": true },
        { "feature": "pv", "granted": false }
      ]
    }
  ],
  "meta": { "currentPage": 1, "totalPages": 2, "totalItems": 18 }
}
```

---

## POST /api/v1/users

Create a new user.

**Request body**:
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "temporaryPassword123",
  "teamId": 1,
  "roles": ["ROLE_USER"]
}
```

**Response 201**: Created user object.

---

## PUT /api/v1/users/{id}

Update user details.

**Request body**: Partial user object (email, firstName, lastName, teamId, roles).

**Response 200**: Updated user object.

---

## DELETE /api/v1/users/{id}

Soft-delete a user (sets `deletedAt`, does not remove from DB).

**Response 204**: No content.

---

## PUT /api/v1/users/{id}/permissions

Update a user's feature permissions.

**Request body**:
```json
{
  "permissions": [
    { "feature": "transcription", "granted": true },
    { "feature": "pv", "granted": true },
    { "feature": "analytics", "granted": false },
    { "feature": "upload", "granted": false }
  ]
}
```

**Response 200**: Updated permissions array.

---

## GET /api/v1/roles

List available roles (for the role assignment dropdown).

**Response 200**:
```json
{ "roles": ["ROLE_USER", "ROLE_ADMIN"] }
```
