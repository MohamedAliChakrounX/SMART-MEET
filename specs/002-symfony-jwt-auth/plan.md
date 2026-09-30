# Implementation Plan: Symfony Backend – JWT Authentication & Role/Permission System

**Branch**: `002-symfony-jwt-auth` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-symfony-jwt-auth/spec.md`

---

## Summary

Implement a secure JWT-based authentication and granular permission system for the Meeting-IA Symfony backend. The Symfony application lives in the `/Backend` subdirectory (`Meeting-IA-sfm/Backend/`). It exposes a REST API consumed exclusively by the React frontend (`Frontend-Web/`). The system introduces two user roles (Admin / Standard) with per-user, resource-level permissions enforced on every protected route. Access tokens are short-lived (1 h) and refreshed via long-lived refresh tokens (7 d); logout invalidates tokens via a server-side denylist.

---

## Technical Context

**Language/Version**: PHP 8.2+ / Symfony 7.x  
**Primary Dependencies**:
- `lexik/jwt-authentication-bundle` (latest stable) — JWT issuance & validation  
- `gesdinet/jwt-refresh-token-bundle` (latest stable) — Refresh-token lifecycle  
- `nelmio/cors-bundle` (latest stable) — CORS for React frontend  
- `doctrine/orm` + `doctrine/doctrine-bundle` — ORM & migrations  
- `symfony/security-bundle` — Firewalls, voters, guards  
- `symfony/maker-bundle` (dev) — Scaffold boilerplate  

**Storage**: PostgreSQL 15+ (shared database with future features)  
**Testing**: PHPUnit 11 (via `symfony/test-pack`)  
**Target Platform**: Linux server / Docker container  
**Project Type**: web-service (REST API backend)  
**Performance Goals**: Auth operations < 500 ms p95 (SC-005); login response < 2 s (SC-001)  
**Constraints**:
- Token denylist for logout (DB table chosen per YAGNI; Redis deferred)  
- CORS configurable per environment  
- Soft-delete for User entity (Principle IV)  
- No public self-registration (admin-only user creation)  
- No brute-force protection in scope (clarified)  

**Scale/Scope**: Multi-admin, N standard users; granular per-user permissions table

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I — Service Isolation | ✅ PASS | Symfony owns all auth/business logic; no AI inference here |
| II — API-First | ✅ PASS | All endpoints documented in `contracts/` before code |
| III — Security by Default | ✅ PASS | JWT on all routes; `@IsPublic` only on `/login`, `/token/refresh`, `/health`; granular permissions; JWT keys in `.gitignore`; secrets in env vars |
| IV — Data Ownership | ✅ PASS | PostgreSQL via Doctrine; User soft-delete; Doctrine migrations required per schema change |
| V — Observability | ✅ PASS | Monolog JSON formatter; `GET /health` endpoint (T058); log all auth events with `correlation_id`; Stopwatch instrumentation for SC-005 (T059) |
| VI — Test Coverage | ✅ PASS | PHPUnit unit tests for all 3 service classes + PermissionVoter; integration tests for AuthController, UserController, and full auth flow (Phase 7b) |
| VII — Simplicity/YAGNI | ✅ PASS | No Redis, no extra service; uses approved bundle stack only |

**Gate result**: All principles satisfied. Proceeding to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-symfony-jwt-auth/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── auth.yaml
│   └── users.yaml
└── tasks.md             ← Phase 2 output (by /speckit-tasks)
```

### Source Code (repository root)

The Symfony backend occupies the `/Backend` subdirectory. `AI/`, `Frontend-Web/`, and `specs/` are peer subdirectories.

```text
Meeting-IA-sfm/                   ← repo root
├── AI/                           ← AI inference service (Flask)
├── Frontend-Web/                 ← Frontend (React)
├── specs/                        ← Documentation & Tasks
└── Backend/                      ← Symfony backend root
    ├── .env                      ← environment variables (secrets NOT committed)
    ├── .env.example                  ← committed template
    ├── composer.json
    ├── symfony.lock
    ├── bin/
    │   └── console
    ├── config/
    │   ├── jwt/                      ← RSA keys (private.pem EXCLUDED via .gitignore)
    │   ├── packages/
    │   │   ├── doctrine.yaml
    │   │   ├── lexik_jwt_authentication.yaml
    │   │   ├── gesdinet_jwt_refresh_token.yaml
    │   │   ├── nelmio_cors.yaml
    │   │   ├── monolog.yaml          ← JSON formatter (Principle V)
    │   │   └── security.yaml
    │   └── routes/
    │       └── api.yaml
    ├── src/
    │   ├── Controller/
    │   │   ├── AuthController.php        ← /api/v1/auth/login, /logout, /token/refresh, /me
    │   │   ├── UserController.php        ← /api/v1/users (admin CRUD + permissions)
    │   │   └── HealthController.php      ← GET /health (Principle V)
    │   ├── Entity/
    │   │   ├── User.php
    │   │   ├── Permission.php
    │   │   └── TokenDenylist.php
    │   ├── Repository/
    │   │   ├── UserRepository.php
    │   │   ├── PermissionRepository.php
    │   │   └── TokenDenylistRepository.php
    │   ├── Security/
    │   │   ├── UserChecker.php           ← checks isActive on access + refresh firewalls
    │   │   ├── DenylistTokenValidator.php
    │   │   └── PermissionVoter.php
    │   │   ⚠️  Note: JwtAuthenticator is provided automatically by LexikJWT.
    │   ├── EventSubscriber/
    │   │   ├── CorrelationIdSubscriber.php
    │   │   └── ExceptionSubscriber.php
    │   └── Service/
    │       ├── AuthService.php
    │       ├── UserService.php
    │       └── PermissionService.php
    ├── migrations/
    │   └── (Doctrine migration files)
    └── tests/
        ├── Unit/
        │   ├── Service/
        │   │   ├── AuthServiceTest.php
        │   │   ├── UserServiceTest.php
        │   │   └── PermissionServiceTest.php
        │   └── Security/
        │       └── PermissionVoterTest.php
        └── Integration/
            ├── AuthControllerTest.php
            ├── UserControllerTest.php
            └── AuthFlowTest.php          ← full login→access→logout→denylist flow
```

---

## Complexity Tracking

> No violations to justify. All dependencies are in the approved tech stack.

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| research.md | `specs/002-symfony-jwt-auth/research.md` | ✅ Generated |
| data-model.md | `specs/002-symfony-jwt-auth/data-model.md` | ✅ Generated |
| contracts/auth.yaml | `specs/002-symfony-jwt-auth/contracts/auth.yaml` | ✅ Generated |
| contracts/users.yaml | `specs/002-symfony-jwt-auth/contracts/users.yaml` | ✅ Generated |
| quickstart.md | `specs/002-symfony-jwt-auth/quickstart.md` | ✅ Generated |
