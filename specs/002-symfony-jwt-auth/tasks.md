# Tasks: Symfony Backend – JWT Authentication & Role/Permission System

**Input**: Design documents from `/specs/002-symfony-jwt-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: PHPUnit tests are **MANDATORY** per Constitution Principle VI for all service classes and controllers. A feature MUST NOT be merged to `main` if coverage drops below 70%.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Paths follow the Symfony backend at repository root (`Meeting-IA-sfm/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install all required Composer packages, generate cryptographic keys, and configure environment templates.

- [ ] T001 Install Composer dependencies: `lexik/jwt-authentication-bundle`, `gesdinet/jwt-refresh-token-bundle`, `nelmio/cors-bundle`, `symfony/security-bundle`, `symfony/maker-bundle` (dev) — run `composer require` in repo root
- [ ] T002 Generate RSA key pair for JWT signing with `php bin/console lexik:jwt:generate-keypair` and store keys in `Backend/config/jwt/`
- [ ] T003 [P] Create `.env.example` template with all required secrets: `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE`, `DATABASE_URL`, `CORS_ALLOW_ORIGIN` at repo root `.env.example`; add `Backend/config/jwt/private.pem` and `Backend/config/jwt/public.pem` to `.gitignore` (Constitution Principle III: secrets MUST NOT appear in VCS)
- [ ] T004 [P] Create bundle configuration file `Backend/config/packages/lexik_jwt_authentication.yaml` (token_ttl: 3600, RSA key paths)
- [ ] T005 [P] Create bundle configuration file `Backend/config/packages/gesdinet_jwt_refresh_token.yaml` (ttl: 604800, ttl_update: true)
- [ ] T006 [P] Create CORS configuration file `Backend/config/packages/nelmio_cors.yaml` with `CORS_ALLOW_ORIGIN` env-driven allowed origins for `/api/` paths
- [ ] T006b [P] Configure Monolog in `Backend/config/packages/monolog.yaml` to use `JsonFormatter` for the main channel in all environments; ensure all log records include the Constitution V mandatory fields: `timestamp`, `service`, `level`, `message`, `correlation_id`

**Checkpoint**: All bundles installed, keys generated, env template committed, Monolog JSON format configured — no code changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core entities, migrations, security configuration, and infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Create `Backend/src/Entity/User.php` implementing `UserInterface` and `PasswordAuthenticatedUserInterface` with fields: `id` (uuid), `email`, `password`, `roles` (json), `first_name`, `last_name`, `is_active`, `deleted_at`, `created_at`, `updated_at` and ManyToMany relation to `Permission`
- [ ] T008 Create `Backend/src/Entity/Permission.php` with fields: `id` (uuid), `key` (string 100, unique), `description` (nullable string 255)
- [ ] T009 Create `Backend/src/Entity/TokenDenylist.php` with fields: `id` (int auto-increment), `jti` (string 100, unique, indexed), `expires_at` (datetime_immutable, indexed)
- [ ] T010 [P] Create `Backend/src/Repository/UserRepository.php` extending `ServiceEntityRepository` with methods: `findActiveByEmail()`, `findNonDeleted()`, `findNonDeletedById()`
- [ ] T011 [P] Create `Backend/src/Repository/PermissionRepository.php` extending `ServiceEntityRepository` with method: `findByKeys(array $keys)`
- [ ] T012 [P] Create `Backend/src/Repository/TokenDenylistRepository.php` extending `ServiceEntityRepository` with methods: `isTokenRevoked(string $jti)`, `purgeExpired()`
- [ ] T013 Generate and run Doctrine migrations for all custom entities: `User`, `Permission`, `UserPermission` join table, `TokenDenylist` using `php bin/console doctrine:migrations:diff` and `doctrine:migrations:migrate`
- [ ] T014 Run `gesdinet` bundle migration to create the `refresh_tokens` table (bundle's own migration or `php bin/console doctrine:migrations:migrate`)
- [ ] T015 Create permission seed data fixture or SQL script to insert the 9 initial `Permission` records (`meeting.read`, `meeting.create`, `meeting.update`, `meeting.delete`, `transcript.read`, `transcript.create`, `summary.read`, `analytics.read`, `admin.users`) into the `permission` table
- [ ] T016 Create `Backend/src/Security/UserChecker.php` implementing `UserCheckerInterface`; `checkPreAuth()` throws `DisabledException` if `!$user->isActive()`
- [ ] T017 Create `Backend/src/Security/DenylistTokenValidator.php` as a Kernel request event listener (priority > 0); extracts `jti` claim from decoded JWT and returns 401 if found in `TokenDenylist`
- [ ] T018 Create `Backend/src/Security/PermissionVoter.php` extending `Voter`; `supports()` checks attribute is a known permission key; `voteOnAttribute()` grants ROLE_ADMIN automatically, otherwise checks `User->getPermissions()` collection
- [ ] T019 Write full `Backend/config/packages/security.yaml`: password hashers (bcrypt), providers (entity/email), firewalls (`login` with json_login + LexikJWT handlers, `refresh` with `user_checker: App\Security\UserChecker` **(CRITICAL: prevents disabled users from obtaining new tokens via refresh — fixes SC-007)**, `api` firewall with jwt + UserChecker), access_control rules (PUBLIC `/health`, `/login` and `/token/refresh`, ROLE_ADMIN for `/api/v1/users`, IS_AUTHENTICATED_FULLY for all `/api`)
- [ ] T020 [P] Register `DenylistTokenValidator` as a service and tag/configure it as a `kernel.event_listener` for `KernelEvents::REQUEST` in `Backend/config/services.yaml`
- [ ] T021 [P] Register `PermissionVoter` as a service tagged with `security.voter` in `Backend/config/services.yaml`
- [ ] T022 [P] Register `UserChecker` (`App\Security\UserChecker`) as a service in `Backend/config/services.yaml` and reference it in `security.yaml` `user_checker` key under `api` firewall
- [ ] T023 [P] Configure `Backend/config/routes/api.yaml` with route prefix `/api/v1` pointing to `Backend/src/Controller/` for attribute-based routing

**Checkpoint**: Foundation ready — all entities, migrations, security configuration, voters, and event listeners are in place. User story implementation can now begin.

---

## Phase 3: User Story 1 – Authentification sécurisée (Priority: P1) 🎯 MVP

**Goal**: Users (Admin or Standard) can authenticate with email + password, receive a valid JWT access token and refresh token, and use that token to access protected routes. Token refresh works without re-authentication.

**Independent Test**: Call `POST /api/v1/auth/login` with valid credentials → receive `token` + `refresh_token`. Then call any protected route with `Authorization: Bearer <token>` → success. Call with expired/invalid token → 401. Call `POST /api/token/refresh` with valid refresh_token → receive new `token`.

### Implementation for User Story 1

- [ ] T024 [US1] Create `Backend/src/Controller/AuthController.php` with `#[Route('/api/v1/auth')]` prefix; implement `login()` action mapped to `POST /api/v1/auth/login` — handled by LexikJWT `json_login` firewall; controller method builds and returns the enriched response (token, refresh_token, user object with `redirect_to`)
- [ ] T025 [US1] Create `Backend/src/Service/AuthService.php` with method `buildLoginPayload(User $user): array` — returns the JSON login response shape including `token`, `refresh_token`, `user` (id, email, first_name, last_name, role, redirect_to based on ROLE_ADMIN check)
- [ ] T026 [US1] Subscribe to `JWTCreatedEvent` in `AuthService` (or a dedicated `JwtEventListener`) to enrich the JWT payload with `user_id` and `role`; register listener in `Backend/config/services.yaml`
- [ ] T027 [US1] Implement `GET /api/v1/auth/me` action in `AuthController.php`; returns authenticated user's id, email, first_name, last_name, role, is_active, permissions (array of keys), created_at — requires `IS_AUTHENTICATED_FULLY` (secured via firewall)
- [ ] T028 [US1] Validate login error response: ensure LexikJWT failure handler returns `{"code": 401, "message": "Invalid credentials."}` — configure `lexik_jwt_authentication.yaml` failure_response or override `AuthenticationFailureResponse` if needed
- [ ] T029 [US1] Add structured logging (Monolog) in `AuthService` for successful login events: log `user_id`, `email`, `role`, timestamp, and `correlation_id` header value (if present) to satisfy Principle V (Observability)

**Checkpoint**: `POST /api/v1/auth/login` returns token + user object; `POST /api/token/refresh` works via bundle; `GET /api/v1/auth/me` returns profile; invalid credentials return 401.

---

## Phase 4: User Story 2 – Redirection post-connexion selon le rôle (Priority: P1)

**Goal**: The login response exposes the user's role and a `redirect_to` URL so the React frontend can route the user to the correct interface (`/admin` for ROLE_ADMIN, `/dashboard` for ROLE_USER) without additional API calls.

**Independent Test**: Login as an admin → response body contains `"role": "ROLE_ADMIN"` and `"redirect_to": "/admin"`. Login as a standard user → response body contains `"role": "ROLE_USER"` and `"redirect_to": "/dashboard"`. Frontend consumes these fields without a second request.

### Implementation for User Story 2

- [ ] T030 [US2] Extend `AuthService::buildLoginPayload()` (from T025) to include `redirect_to` field logic: return `"/admin"` if user has `ROLE_ADMIN`, else `"/dashboard"` — verify this matches the `POST /api/v1/auth/login` contract in `contracts/auth.yaml`
- [ ] T031 [US2] Validate that `GET /api/v1/auth/me` also exposes `role` field in its response (already included in T027's implementation); confirm the role value format is `"ROLE_ADMIN"` or `"ROLE_USER"` as specified in `contracts/auth.yaml`

> ℹ️ **Note**: Role redirection curl validation is consolidated into T055 (Phase 8) to avoid duplicate edits to `quickstart.md` — see finding A2.

**Checkpoint**: Login response includes `role` + `redirect_to` for both Admin and Standard users; React frontend can read these fields directly.

---

## Phase 5: User Story 3 – Gestion des utilisateurs par l'Admin (Priority: P2)

**Goal**: Authenticated admins can create, retrieve, update (including activate/deactivate), and soft-delete user accounts, and manage per-user granular permissions via dedicated endpoints.

**Independent Test**: Authenticate as admin → `POST /api/v1/users` creates a user → `GET /api/v1/users/{id}` retrieves it → `PUT /api/v1/users/{id}/permissions` assigns permissions → newly created user can log in and only access permitted resources → `PATCH /api/v1/users/{id}` with `is_active: false` disables the account → disabled user cannot log in. Standard user cannot access any `/api/v1/users` endpoint (403).

### Implementation for User Story 3

- [ ] T033 [US3] Create `Backend/src/Service/UserService.php` with methods: `createUser(array $data): User`, `findUser(string $id): User`, `listUsers(array $filters, int $page, int $limit): array`, `updateUser(string $id, array $data): User`, `deleteUser(string $id, User $currentAdmin): void` (guard: throw AccessDeniedException if deleting own account), `setPermissions(string $userId, array $permissionKeys): User`
- [ ] T034 [US3] Create `Backend/src/Controller/UserController.php` with `#[Route('/api/v1/users')]` prefix and implement:
  - `GET /api/v1/users` — paginated list (page, limit, active filter) → delegates to `UserService::listUsers()`
  - `POST /api/v1/users` — create user → delegates to `UserService::createUser()`
  - `GET /api/v1/users/{id}` — single user → delegates to `UserService::findUser()`
  - `PATCH /api/v1/users/{id}` — partial update → delegates to `UserService::updateUser()`
  - `DELETE /api/v1/users/{id}` — soft-delete → delegates to `UserService::deleteUser()`
- [ ] T035 [US3] Implement `PUT /api/v1/users/{id}/permissions` action in `UserController.php` → delegates to `UserService::setPermissions()` — validates all submitted permission keys exist in `Permission` table, replaces the full ManyToMany set
- [ ] T036 [US3] Implement `GET /api/v1/permissions` action in `UserController.php` (or a dedicated `PermissionController.php`); returns all `Permission` records as `[{key, description}]` array — secured with `ROLE_ADMIN`
- [ ] T037 [P] [US3] Create `Backend/src/Service/PermissionService.php` with methods: `listAll(): array`, `findByKeys(array $keys): array` — used by UserService to validate and resolve permission keys
- [ ] T038 [US3] Add input validation in `UserController` for `POST /api/v1/users` and `PATCH /api/v1/users/{id}`: validate email format/uniqueness (409 on conflict), password min-8-chars, first_name/last_name 1-100 chars, role must be `ROLE_ADMIN` or `ROLE_USER` — return 422 with structured error body on failure
- [ ] T039 [US3] Implement soft-delete logic in `UserService::deleteUser()`: set `deleted_at = new DateTimeImmutable()` on the User entity; ensure `UserRepository::findNonDeleted()` excludes soft-deleted records
- [ ] T040 [US3] Implement duplicate email guard: in `UserService::createUser()` and `updateUser()`, query `UserRepository` for existing non-deleted user with same email; throw conflict exception mapped to 409 response
- [ ] T041 [US3] Add structured logging in `UserService` for all mutation events (user created, updated, deleted, permissions changed): log `admin_id`, `target_user_id`, action, and `correlation_id` to satisfy Principle V

**Checkpoint**: Full CRUD + permission management for users is available under `/api/v1/users`. Admin can manage all users; standard users receive 403 on all these endpoints.

---

## Phase 6: User Story 4 – Contrôle d'accès aux routes selon les permissions (Priority: P2)

**Goal**: Every API route enforces authentication (401 for missing/invalid token) and permission checks (403 for authenticated users lacking the required permission). Permission checks are real-time (DB lookup on every request), so revocations take effect immediately.

**Independent Test**: (a) Request any protected route with no token → 401. (b) Request with valid token but without required permission → 403. (c) Request with valid token and correct permission → 200 with data. (d) Revoke permission then re-request → 403 without re-login.

### Implementation for User Story 4

- [ ] T042 [US4] Apply `$this->denyAccessUnlessGranted('meeting.read')` (or equivalent `#[IsGranted]` attribute) on a sample resource controller action to validate `PermissionVoter` integration end-to-end — document used pattern for all future controllers
- [ ] T043 [P] [US4] Validate `UserChecker` wiring on **both** token paths: (a) access token request for a disabled user account → 401; (b) `POST /api/token/refresh` for a disabled user → 401. Both the `api` and `refresh` firewalls must reference `user_checker: App\Security\UserChecker` (see T019). File already created in T016 — this task is **validation only**.
- [ ] T044 [US4] Validate `DenylistTokenValidator` end-to-end: call a protected route with a known-revoked JTI (manually insert into `token_denylist`) and confirm 401 is returned
- [ ] T045 [US4] Implement global exception handling / JSON error responses: create `Backend/src/EventSubscriber/ExceptionSubscriber.php` subscribing to `KernelEvents::EXCEPTION`; maps `AccessDeniedException` → 403 JSON, `AuthenticationException` → 401 JSON following the global error format from `contracts/users.yaml`
- [ ] T046 [US4] Add structured logging in `DenylistTokenValidator` and `PermissionVoter` for permission-denied events: log `user_id`, `attempted_resource`, `permission_required`, `correlation_id` — satisfies Principle V

**Checkpoint**: All 401/403 scenarios work correctly and return proper JSON. DenylistTokenValidator, UserChecker, and PermissionVoter are all active and tested by curl.

---

## Phase 7: User Story 5 – Déconnexion sécurisée (Priority: P3)

**Goal**: An authenticated user can call `POST /api/v1/auth/logout` to invalidate their current access token. Any subsequent use of that token (before natural expiry) returns 401.

**Independent Test**: Authenticate → call `POST /api/v1/auth/logout` with token → receive `{"message": "Logged out successfully."}` → retry same token on any protected route → 401. Token after natural expiry also rejected by denylist.

### Implementation for User Story 5

- [ ] T047 [US5] Implement `logout()` action in `AuthController.php` at `POST /api/v1/auth/logout`; extracts `jti` and `exp` from the current JWT payload; delegates to `AuthService::logout(string $jti, \DateTimeImmutable $expiresAt)`
- [ ] T048 [US5] Implement `AuthService::logout(string $jti, \DateTimeImmutable $expiresAt): void` — creates and persists a `TokenDenylist` entity with the given `jti` and `expires_at`; flushes via Doctrine EntityManager
- [ ] T049 [US5] Implement `TokenDenylistRepository::purgeExpired()` — deletes all rows where `expires_at < NOW()`; create a Symfony Console Command `Backend/src/Command/PurgeTokenDenylistCommand.php` (command name: `app:purge-token-denylist`) to run this on a schedule or manually via cron
- [ ] T050 [US5] Add structured logging in `AuthService::logout()`: log `user_id`, `jti`, `expires_at`, `correlation_id` for audit trail — satisfies Principle V

**Checkpoint**: Logout invalidates tokens immediately; revoked JTIs in denylist are rejected by `DenylistTokenValidator`; expired denylist entries can be purged via CLI command.

---

## Phase 7b: Test Coverage (Constitution Principle VI — MANDATORY)

**Purpose**: PHPUnit unit and integration tests for all service classes and controllers. **A feature MUST NOT be merged to `main` if coverage drops below 70%.** Tests verify the contract between components and protect against regressions.

> ⚠️ **Write tests FIRST, verify they FAIL, then implement.** (TDD within each story where possible.)

### Unit Tests

- [ ] T051b [P] [US1] Write unit tests for `AuthService` in `Backend/tests/Unit/Service/AuthServiceTest.php` — test `buildLoginPayload()` (role/redirect_to values), `logout()` (denylist persistence), JWT event enrichment; mock `EntityManager`, `TokenDenylistRepository`
- [ ] T052b [P] [US3] Write unit tests for `UserService` in `Backend/tests/Unit/Service/UserServiceTest.php` — test `createUser()`, `updateUser()`, `deleteUser()` (incl. self-delete guard → `AccessDeniedException`), `setPermissions()`, duplicate email guard → conflict exception
- [ ] T053b [P] [US3] Write unit tests for `PermissionService` in `Backend/tests/Unit/Service/PermissionServiceTest.php` — test `listAll()`, `findByKeys()` with valid and unknown permission keys
- [ ] T054b [P] [US4] Write unit tests for `PermissionVoter` in `Backend/tests/Unit/Security/PermissionVoterTest.php` — test `supports()` for known/unknown attributes; `voteOnAttribute()` for ROLE_ADMIN bypass, user with matching permission (GRANT), user without (DENY)

### Integration Tests

- [ ] T055b [US1] Write integration tests for `AuthController` in `Backend/tests/Integration/AuthControllerTest.php` — cover: `POST /api/v1/auth/login` (valid → 200 with token, invalid → 401), `GET /api/v1/auth/me` (authenticated → 200, unauthenticated → 401), `POST /api/v1/auth/logout` (→ 200, token reuse → 401), `POST /api/token/refresh` (valid → 200, expired → 401)
- [ ] T056b [US3] Write integration tests for `UserController` in `Backend/tests/Integration/UserControllerTest.php` — cover: full CRUD cycle as admin, permission assignment (`PUT /permissions`), standard user on any `/users` endpoint → 403, duplicate email → 409, admin self-delete → 403
- [ ] T057b Write integration test for the full `login → access protected route → logout → token reuse` flow in `Backend/tests/Integration/AuthFlowTest.php` — validates the token denylist end-to-end; also validates that a disabled user's refresh token is rejected (SC-007)

**Checkpoint**: All service classes and controllers have PHPUnit coverage. Run `php bin/phpunit --coverage-text` — overall coverage must be ≥ 70% before merging.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: CORS validation, observability finalization, .env configuration, API completeness verification, security hardening, and documentation.

- [ ] T051 [P] Validate CORS configuration end-to-end: start the Symfony dev server and issue a cross-origin request from `http://localhost:5173` (React dev server origin) — confirm `Access-Control-Allow-Origin` header is present and no CORS errors occur (SC-006)
- [ ] T052 [P] Update `Backend/config/routes/api.yaml` to ensure all `AuthController` and `UserController` routes are correctly declared with their HTTP methods and paths matching the contracts in `contracts/auth.yaml` and `contracts/users.yaml`
- [ ] T053 Add a `correlation_id` middleware: create `Backend/src/EventSubscriber/CorrelationIdSubscriber.php` that reads `X-Correlation-Id` request header (or generates a UUID if absent) and stores it in the request attributes for use by all loggers — register as a `kernel.event_subscriber`
- [ ] T054 [P] Create an admin seed fixture or CLI command `Backend/src/Command/CreateAdminUserCommand.php` (command: `app:create-admin`) to create an initial admin user from environment-provided credentials — essential for first-run
- [ ] T055 [P] Update `specs/002-symfony-jwt-auth/quickstart.md` with end-to-end curl commands for: login → get token → access protected route → refresh token → logout → verify revocation; include role redirection validation section (admin → `/admin`, standard → `/dashboard`)
- [ ] T056 Review and harden Symfony security config: confirm `stateless: true` on all API firewalls, confirm no session is created, confirm `PUBLIC_ACCESS` is limited to only `/health`, `/api/v1/auth/login` and `/api/token/refresh`
- [ ] T057 [P] Verify all buildable success criteria: SC-002 (all protected routes reject unauthenticated), SC-003 (standard user blocked 100%), SC-004 (admin creates user in < 5 steps), SC-006 (no CORS errors from React), SC-007 (disabled user blocked on both access and refresh token paths within 60s) — document results in `specs/002-symfony-jwt-auth/quickstart.md`
- [ ] T058 [P] Implement `GET /health` endpoint in `Backend/src/Controller/HealthController.php` returning `{"status":"ok","service":"symfony-backend"}` with `PUBLIC_ACCESS` (no JWT required); add `{ path: ^/health, roles: PUBLIC_ACCESS }` to `security.yaml` access_control — **required by Constitution Principle V**
- [ ] T059 [P] Instrument `AuthService`, `PermissionVoter`, and `DenylistTokenValidator` with Symfony `Stopwatch` component; log `duration_ms` field in each structured log entry to enable p95 performance validation (SC-005: < 500ms server-side)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 / Phase 3**: Depends on Phase 2 (LexikJWT handlers, firewalls, User entity)
- **US2 / Phase 4**: Depends on Phase 3 (`buildLoginPayload()` already implemented in T025)
- **US3 / Phase 5**: Depends on Phase 2 (User entity, PermissionVoter, UserRepository)
- **US4 / Phase 6**: Depends on Phase 2 (PermissionVoter, DenylistTokenValidator, UserChecker)
- **US5 / Phase 7**: Depends on Phase 2 (TokenDenylist entity + repo) and Phase 3 (AuthController in place)
- **Tests (Phase 7b)**: Can be written alongside each user story phase (TDD) or consolidated after Phase 7
- **Polish (Phase 8)**: Depends on all user stories and Phase 7b being complete

### User Story Dependencies

```
Phase 1 (Setup)
    └─► Phase 2 (Foundational) ──► US1 (Phase 3) ──► US2 (Phase 4)
                                ├─► US3 (Phase 5) [independent of US1/US2]
                                ├─► US4 (Phase 6) [independent of US1/US2/US3]
                                └─► US5 (Phase 7) [depends on Phase 3 AuthController]
```

- **US3, US4, US5** are independently startable after Phase 2 (with US5 needing Phase 3's `AuthController` file to exist)
- **US2** is a minor extension of US1 (shares `buildLoginPayload`) — implement immediately after US1

### Within Each User Story

- Repositories → Entities → Services → Controllers
- Observers/Subscribers → Services (for event-driven patterns)
- Logging added alongside each service method

### Parallel Opportunities

- T003, T004, T005, T006 (Phase 1 config files) can all run in parallel
- T010, T011, T012 (repositories) can run in parallel
- T020, T021, T022, T023 (service/voter registration) can run in parallel
- T037 (`PermissionService`) is parallel with T033 and T034 in US3
- T043 (UserChecker validation) is parallel within US4
- T051b, T052b, T053b, T054b (unit tests in Phase 7b) can all run in parallel
- T051, T052, T054, T055, T057, T058, T059 (Phase 8 Polish tasks) can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Run in parallel (different files, no inter-dependencies):
Task T010: Create UserRepository.php
Task T011: Create PermissionRepository.php
Task T012: Create TokenDenylistRepository.php

# Then in parallel (registration tasks after entities are defined):
Task T020: Register DenylistTokenValidator as event listener
Task T021: Register PermissionVoter as security.voter
Task T022: Register UserChecker service
Task T023: Configure routes/api.yaml
```

## Parallel Example: Phase 5 (User Story 3 – US3)

```bash
# Run in parallel:
Task T037: Create PermissionService.php
Task T033: Create UserService.php  ← depends on PermissionService at call time only

# Then sequentially:
Task T034: Create UserController.php (depends on UserService)
Task T035: PUT permissions endpoint (depends on UserController + PermissionService)
Task T036: GET /permissions endpoint (can be parallel with T035)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational — T007–T023 (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — T024–T029
4. **STOP and VALIDATE**: Test login flow independently via curl
5. Demo: functional JWT authentication end-to-end

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Login/token/refresh/me working → **MVP demo**
3. Add US2 → Role-based redirect in login response
4. Add US3 → Full user + permission management  
5. Add US4 → Full route access control validated
6. Add US5 → Secure logout with token denylist
7. Polish → CORS, observability, quickstart docs

### Parallel Team Strategy

With multiple developers, once Phase 2 is complete:
- **Dev A**: User Story 1 + 2 (Auth flow + role redirect)
- **Dev B**: User Story 3 (User management CRUD)
- **Dev C**: User Story 4 + 5 (Route security + logout)

---

## Notes

- [P] tasks = different files, no blocking dependencies at time of execution
- [Story] label maps each task to its user story for traceability
- Each user story has an independent test criterion — verify before moving to the next story
- Commit after each phase or logical group (entities, migrations, services, controllers separately)
- Stop at each **Checkpoint** to validate the story independently
- Security firewall must be validated early (Phase 2) — all stories depend on it
- Permission revocation is real-time (DB check on every request) — no caching of permissions
- Admin self-deletion guard is in `UserService::deleteUser()` — not in the voter
- `TokenDenylist` purge command is maintenance-only; it does not affect security if delayed
