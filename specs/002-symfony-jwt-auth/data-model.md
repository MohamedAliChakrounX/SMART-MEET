# Data Model: Symfony Backend – JWT Authentication & Role/Permission System

**Feature**: `002-symfony-jwt-auth`  
**Phase**: 1 — Design & Contracts  
**Generated**: 2026-03-31

---

## Entities

### 1. `User`

Primary identity entity. Holds credentials, role, status, and associated permissions.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `uuid` | PK, auto-generated | UUID v4 |
| `email` | `string(180)` | NOT NULL, UNIQUE | Used as login identifier |
| `password` | `string(255)` | NOT NULL | Bcrypt-hashed via Symfony PasswordHasher |
| `roles` | `json` | NOT NULL, default `["ROLE_USER"]` | Symfony security roles array |
| `first_name` | `string(100)` | NOT NULL | |
| `last_name` | `string(100)` | NOT NULL | |
| `is_active` | `boolean` | NOT NULL, default `true` | Soft-disable (Principle IV) |
| `deleted_at` | `datetime_immutable\|null` | nullable | Soft-delete timestamp (Principle IV) |
| `created_at` | `datetime_immutable` | NOT NULL, auto-set | |
| `updated_at` | `datetime_immutable` | NOT NULL, auto-updated | |

**Roles**: Symfony array field. Admins have `["ROLE_ADMIN", "ROLE_USER"]`; standard users have `["ROLE_USER"]`.

**Validation rules**:
- `email`: valid email format, max 180 chars, unique across non-deleted records
- `password` (plain, pre-hash): min 8 chars
- `first_name`, `last_name`: 1–100 chars, not blank

**State transitions**:
```
ACTIVE ──(admin disables)──► DISABLED (is_active = false)
ACTIVE ──(admin deletes)───► SOFT-DELETED (deleted_at set)
DISABLED ──(admin re-enables)──► ACTIVE
```

**Symfony implements**: `UserInterface`, `PasswordAuthenticatedUserInterface`

---

### 2. `Permission`

Represents a granular, named right. Assigned directly to `User` records (not to roles).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `uuid` | PK, auto-generated | |
| `key` | `string(100)` | NOT NULL, UNIQUE | Dot-notation: `resource.action` |
| `description` | `string(255)` | nullable | Human-readable label |

**Seed data (initial permission keys)**:

| Key | Description |
|-----|-------------|
| `meeting.read` | View meetings |
| `meeting.create` | Create meetings |
| `meeting.update` | Edit meetings |
| `meeting.delete` | Delete meetings |
| `transcript.read` | View transcripts |
| `transcript.create` | Trigger transcription |
| `summary.read` | View summaries |
| `analytics.read` | View analytics |
| `admin.users` | Manage user accounts (admin-only by convention) |

**Validation rules**:
- `key`: lowercase, dot-separated `[a-z]+\.[a-z]+`, unique

---

### 3. `UserPermission` (join table)

Many-to-many between `User` and `Permission`. Doctrine handles the join table automatically via
`@ManyToMany` on the `User` entity.

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | `uuid` (FK → user.id) | |
| `permission_id` | `uuid` (FK → permission.id) | |

Table name: `user_permission`  
Composite PK: `(user_id, permission_id)`

---

### 4. `RefreshToken`

Managed by `gesdinet/jwt-refresh-token-bundle`. The bundle generates this entity and its migration.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `int` | Auto-increment PK |
| `refresh_token` | `string(128)` | Opaque token string, unique, indexed |
| `username` | `string(255)` | Maps to User email |
| `valid` | `datetime` | Expiry timestamp (7 days from issuance) |

Table name: `refresh_tokens` (bundle default, customisable)

---

### 5. `TokenDenylist`

Stores JTI claims of revoked (logged-out) access tokens until their natural expiry.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `int` | PK, auto-increment | |
| `jti` | `string(100)` | NOT NULL, UNIQUE, indexed | JWT ID claim |
| `expires_at` | `datetime_immutable` | NOT NULL, indexed | Original token expiry for purge |

Table name: `token_denylist`

**Maintenance**: A Symfony scheduled command (or cron) purges rows where `expires_at < NOW()`.

---

## Relationships Diagram

```
User ◄────────────── UserPermission ──────────────► Permission
 1                        N:M                           N

User ◄──────────────────────────────────────────── RefreshToken
 1                                                      N

TokenDenylist (standalone — stores revoked JTI strings only)
```

---

## Doctrine Migrations Required

| Migration | Trigger |
|-----------|---------|
| `CreateUserTable` | New `User` entity |
| `CreatePermissionTable` | New `Permission` entity |
| `CreateUserPermissionTable` | ManyToMany join |
| `CreateTokenDenylistTable` | New `TokenDenylist` entity |
| `CreateRefreshTokensTable` | gesdinet bundle migration |

Each migration MUST be committed alongside the code change that requires it (Principle IV).

---

## Security Configuration Sketch

```yaml
# config/packages/security.yaml (key sections)
security:
    password_hashers:
        App\Entity\User:
            algorithm: bcrypt

    providers:
        app_user_provider:
            entity:
                class: App\Entity\User
                property: email

    firewalls:
        login:
            pattern: ^/api/v1/auth/login
            stateless: true
            json_login:
                check_path: /api/v1/auth/login
                username_path: email
                password_path: password
                success_handler: lexik_jwt_authentication.handler.authentication_success
                failure_handler: lexik_jwt_authentication.handler.authentication_failure

        refresh:
            pattern: ^/api/token/refresh
            stateless: true
            user_checker: App\Security\UserChecker

        api:
            pattern: ^/api
            stateless: true
            jwt: ~
            user_checker: App\Security\UserChecker

    access_control:
        - { path: ^/health, roles: PUBLIC_ACCESS }
        - { path: ^/api/v1/auth/login, roles: PUBLIC_ACCESS }
        - { path: ^/api/token/refresh, roles: PUBLIC_ACCESS }
        - { path: ^/api/v1/users, roles: ROLE_ADMIN }
        - { path: ^/api, roles: IS_AUTHENTICATED_FULLY }
```
