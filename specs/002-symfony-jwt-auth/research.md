# Research: Symfony Backend – JWT Authentication & Role/Permission System

**Feature**: `002-symfony-jwt-auth`  
**Phase**: 0 — Outline & Research  
**Generated**: 2026-03-31

---

## Research Topics

The following unknowns were identified in the Technical Context and investigated before Phase 1 design.

---

### R-01: LexikJWTAuthenticationBundle with Symfony 7

**Decision**: Use `lexik/jwt-authentication-bundle` v2.x (supports Symfony 7 and PHP 8.2).

**Rationale**:
- Official, widely-adopted bundle with native Symfony Security integration.
- Supports custom JWT payload enrichment (role, permissions hash) via `JWTCreatedEvent`.
- Works with the `symfony/security-bundle` firewall system out-of-the-box.
- Requires RSA or ECDSA key pair (recommended over HMAC for multi-service deployments).

**Alternatives considered**:
- `firebase/php-jwt` (raw library) — rejected: requires manual Symfony integration, more boilerplate.
- `web-token/jwt-bundle` — rejected: overkill for this scope; higher complexity.

**Configuration summary**:
```yaml
# config/packages/lexik_jwt_authentication.yaml
lexik_jwt_authentication:
    secret_key: '%env(resolve:JWT_SECRET_KEY)%'
    public_key: '%env(resolve:JWT_PUBLIC_KEY)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    token_ttl: 3600   # 1 hour
```

**Key pair generation** (at project setup):
```bash
php bin/console lexik:jwt:generate-keypair
```

---

### R-02: Refresh Token Strategy

**Decision**: Use `gesdinet/jwt-refresh-token-bundle` v1.x (Symfony 7-compatible).

**Rationale**:
- Extends LexikJWT with a dedicated `RefreshToken` entity persisted in PostgreSQL.
- Provides `/api/token/refresh` endpoint out-of-the-box.
- TTL configurable (set to 7 days per spec clarification).
- Supports token rotation (old token invalidated on use) — improves security.

**Alternatives considered**:
- Manual refresh token table — rejected: re-implements what the bundle provides; violates YAGNI.
- Redis-backed refresh tokens — deferred: adds infrastructure dependency not needed at this scale.

**Configuration summary**:
```yaml
# config/packages/gesdinet_jwt_refresh_token.yaml
gesdinet_jwt_refresh_token:
    refresh_token_class: App\Entity\RefreshToken
    ttl: 604800   # 7 days (seconds)
    ttl_update: true   # sliding window
```

---

### R-03: Token Denylist (Logout Invalidation)

**Decision**: Implement a `TokenDenylist` database table with a Doctrine entity storing the
token JTI (JWT ID) claim and its expiry timestamp. A custom Symfony event listener checks the
denylist on every authenticated request.

**Rationale**:
- JWT is stateless by design; logout requires server-side state to invalidate issued tokens.
- DB-based denylist is the simplest implementation compatible with PostgreSQL-only infrastructure.
- JTI uniquely identifies each token; indexing on JTI + expiry makes lookups fast.
- A scheduled purge of expired entries keeps the table bounded.

**Alternatives considered**:
- Redis denylist — preferred in high-scale scenarios. Deferred per YAGNI (constitution Principle VII).
- Rotating secret (global logout) — too blunt; logs out all users on any logout event.
- Short TTL only (no denylist) — rejected: spec explicitly requires token invalidation on logout (FR-011).

**Implementation pattern**:
```php
// src/Security/DenylistTokenValidator.php
// Registered as a listener on KernelEvents::REQUEST (priority > 0)
// Extracts JTI from decoded JWT payload, queries TokenDenylist repository.
// Returns 401 if found.
```

---

### R-04: Granular Per-User Permissions in Symfony

**Decision**: Store `Permission` records as a ManyToMany relationship between `User` and a
`Permission` entity. Enforce via a custom Symfony `PermissionVoter`.

**Rationale**:
- The spec requires per-user granular permissions (not role-only). A voter is the Symfony-idiomatic
  way to implement fine-grained access control decisions.
- Permission strings follow dot-notation convention: `resource.action` (e.g., `meeting.read`,
  `transcript.create`).
- Admin users bypass the voter check entirely via `ROLE_ADMIN` shortcut in the security config.
- The JWT payload includes the user's role; permissions are NOT embedded in the token (they are
  verified server-side on every request per the real-time revocation requirement).

**Permission matrix (initial set)**:

| Permission Key | Resource | Description |
|----------------|----------|-------------|
| `meeting.read` | Meeting | View meeting list and details |
| `meeting.create` | Meeting | Create a new meeting |
| `meeting.update` | Meeting | Edit meeting metadata |
| `meeting.delete` | Meeting | Delete/soft-delete a meeting |
| `transcript.read` | Transcript | View transcripts |
| `transcript.create` | Transcript | Upload/trigger transcription |
| `summary.read` | Summary | View meeting summaries |
| `analytics.read` | Analytics | View analytics dashboards |
| `admin.users` | User | Administer user accounts (admin only) |

**Voter pattern**:
```php
// src/Security/PermissionVoter.php extends Voter
// supports(string $attribute): checks if $attribute is a known permission key
// voteOnAttribute(): queries User->getPermissions(); Admins always granted.
```

---

### R-05: CORS Configuration for React Frontend

**Decision**: Use `nelmio/cors-bundle` with environment-driven allowed origins.

**Rationale**:
- React dev server runs on `http://localhost:5173` (Vite default); production origin will differ.
- NelmioCors integrates directly with Symfony's request handling and supports regex origin matching.
- Configured per-route prefix to apply only to `/api/` paths.

**Configuration summary**:
```yaml
# config/packages/nelmio_cors.yaml
nelmio_cors:
    defaults:
        origin_regex: true
        allow_origin: ['%env(CORS_ALLOW_ORIGIN)%']
        allow_methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']
        allow_headers: ['Content-Type', 'Authorization']
        expose_headers: ['Link']
        max_age: 3600
    paths:
        '^/api/': ~
```

**.env**: `CORS_ALLOW_ORIGIN=^http://localhost:5173$`

---

### R-06: Disabled-User Token Rejection

**Decision**: Check `user.isActive` flag in a custom Symfony `UserChecker` implementation.

**Rationale**:
- Symfony Security provides a `UserCheckerInterface` hook called on every authenticated request.
- If `isActive === false`, throw `DisabledException` → Symfony converts to 401.
- This ensures real-time enforcement (SC-007: disabled user blocked within 60 s).

**Implementation**:
```php
// src/Security/UserChecker.php implements UserCheckerInterface
// checkPreAuth(): if !$user->isActive() throw new DisabledException()
```
Registered in `security.yaml` as `user_checker: App\Security\UserChecker`.

---

### R-07: Admin Self-Deletion Prevention

**Decision**: Enforce in `UserService::deleteUser()` — check if target user is the authenticated
caller and throw `AccessDeniedException` if true.

**Rationale**: Simple service-layer guard is sufficient; no complex voter needed for this edge case.

---

### R-08: Observability & Health Checks (Principle V)

**Decision**: Configure `monolog/monolog` with `JsonFormatter` and implement a dedicated `GET /health` endpoint.

**Rationale**:
- Constitution Principle V explicitly mandates structured logs (JSON format) and a health-check endpoint.
- `JsonFormatter` ensures logs include mandatory fields: `timestamp`, `service`, `level`, `message`, and `correlation_id` (propagated via listener).
- `GET /health` provides a reliable signal for load balancers and monitoring tools to verify Symfony backend availability.

**Implementation**:
- `config/packages/monolog.yaml`: set `formatter: monolog.formatter.json` on the `main` handler.
- `src/Controller/HealthController.php`: returns `{"status":"ok","service":"symfony-backend"}` with `PUBLIC_ACCESS`.

---

## Resolution Summary

| Item | Status |
|------|--------|
| R-01: LexikJWT + Symfony 7 | ✅ Resolved |
| R-02: Refresh token bundle | ✅ Resolved |
| R-03: Token denylist (DB) | ✅ Resolved |
| R-04: Per-user permission voter | ✅ Resolved |
| R-05: CORS (NelmioCors) | ✅ Resolved |
| R-06: Disabled-user rejection | ✅ Resolved |
| R-07: Admin self-deletion guard | ✅ Resolved |
| R-08: Observability & Health | ✅ Resolved |

**All NEEDS CLARIFICATION items resolved. Proceeding to Phase 1.**
