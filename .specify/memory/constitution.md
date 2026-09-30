<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Bump type: MINOR — Added Principle VIII (Mobile Frontend Parity, API Integration & Architectural Preservation) and updated governing guidelines for mobile refactoring.

Added sections:
  - III. Core Principles / Principle VIII: Mobile Frontend Parity, API Integration & Architectural Preservation (NON-NEGOTIABLE)

Modified principles:
  - I. Service Isolation: Clarified mobile responsibility to match Web feature parity via Symfony API.
  - VII. Simplicity & YAGNI: Explicitly prohibited ground-up rewrites of existing mobile codebase; enforced incremental refactoring and maximum code reuse.
  - Architecture & Tech Stack Constraints: Reinforced mobile API integration requirement and Web functional reference rule.

Templates updated:
  ✅ .specify/templates/plan-template.md  — Verified alignment with mobile API integration and Web parity architecture.
  ✅ .specify/templates/spec-template.md  — Verified alignment with functional parity user stories.
  ✅ .specify/templates/tasks-template.md — Verified path conventions for frontend-mobile/ and Symfony API endpoints.

Deferred TODOs:
  - None.
-->

# Meeting-IA Constitution

## Core Principles

### I. Service Isolation (NON-NEGOTIABLE)

Each service MUST own exactly one responsibility domain and MUST NOT encroach on another
service's domain:

- **Flask AI Service** (`AI/`): MUST handle only AI/ML workloads — transcription, translation,
  NLP analysis, and behavioural analytics. It MUST NOT store business data or manage users.
- **Symfony Backend** (`Backend/`): MUST centralise all business logic, data persistence
  (PostgreSQL via Doctrine ORM), authentication/authorisation (JWT), and REST API exposure.
  It MUST NOT perform AI inference; it delegates to Flask via internal HTTP calls.
- **React Frontend** (`Frontend-Web/`): MUST consume only the Symfony API. It MUST NOT call the
  Flask AI service directly. All AI results are mediated through Symfony. It serves as the
  functional reference for application capabilities.
- **Mobile Frontend** (`frontend-mobile/`): MUST consume only the Symfony API. It MUST NOT call the
  Flask AI service directly. All AI results are mediated through Symfony.

**Rationale**: Prevents tight coupling between the AI research layer and the business layer,
enabling independent scaling, versioning, and replacement of each service.

### II. API-First Design

All cross-service communication MUST be defined as explicit REST contracts before implementation.

- Symfony-to-Flask and Frontend-to-Symfony endpoints MUST be documented in `specs/*/contracts/`
  before any code is written for that feature.
- Request/response schemas MUST use JSON. Binary payloads (audio files) MUST use multipart/form-data
  with clearly versioned upload endpoints.
- API versioning (e.g., `/api/v1/`) MUST be used from day one to avoid breaking clients
  on schema evolution.

**Rationale**: API-first design surfaces incompatibilities early and enables frontend and backend
teams to develop in parallel against a stable contract.

### III. Security by Default (NON-NEGOTIABLE)

- All Symfony endpoints MUST be protected by JWT authentication unless explicitly annotated
  `@IsPublic` with a documented justification.
- Granular, permission-based access control (not role-only) MUST be enforced for every sensitive
  resource (transcripts, summaries, analytics, admin operations).
- Flask MUST accept requests only from the Symfony backend (IP allowlist or shared secret header)
  and MUST NOT be reachable directly from the internet in production.
- All file uploads MUST be validated (MIME type, size limit) before processing.
- Secrets (API keys, database credentials) MUST be stored in environment variables or a secrets
  manager and MUST NOT appear in source code or version control.
- **Mobile Client Security**: The JWT token MUST be stored securely on the mobile device (e.g.,
  using secure storage APIs like Expo SecureStore, iOS Keychain, or Android Keystore). It MUST NOT
  be stored in unencrypted local storage (like AsyncStorage).
- **No Hardcoded API Keys**: API credentials, keys, or secrets MUST NOT be hardcoded in the mobile
  application binary or repository code. They must be loaded dynamically or injected at build-time
  from environment variables.

**Rationale**: Meeting data (audio, transcripts, participant behaviour) is sensitive. A breach
would violate user trust and potentially regulatory requirements (GDPR).

### IV. Data Ownership & Persistence

- Symfony (PostgreSQL) is the **single source of truth** for all business entities: Users,
  Meetings, Teams, Departments, Projects, Transcripts, PV documents, and Analytics records.
- Flask MUST return AI results to Symfony for persistence; it MUST NOT maintain its own
  durable database for business data.
- All database schema changes MUST be managed via Doctrine migrations and committed to version
  control alongside the code change that requires them.
- Soft-delete MUST be preferred over hard-delete for Meeting and User entities to preserve
  audit trails.

**Rationale**: Centralised persistence prevents data fragmentation across services and ensures
consistent querying, reporting, and backup strategies.

### V. Observability & Structured Logging

- Every service MUST emit structured logs (JSON format) with a minimum of: `timestamp`,
  `service`, `level`, `message`, and `correlation_id` (request trace ID propagated across
  service boundaries).
- Flask MUST log the duration of every AI inference call (transcription, translation, NLP).
- Symfony MUST log all authentication events, permission denials, and API proxy calls to Flask.
- React/Web and React Native/Mobile clients MUST report uncaught errors to a configured error tracking endpoint.

**Rationale**: In a multi-service architecture, traceability across service boundaries is
essential for debugging and performance optimisation.

### VI. Test Coverage Standards

- Symfony: MUST have PHPUnit tests for all service classes and API controllers. Integration
  tests MUST cover the critical Symfony→Flask proxy flow.
- Flask: MUST have pytest tests for all AI pipeline endpoints. Tests MAY use recorded audio
  fixtures instead of live model inference to remain fast.
- React Web: MUST have component tests (Vitest + Testing Library) for all UI flows involving
  authentication, meeting upload, and admin operations.
- Mobile Frontend: MUST have component/unit tests (e.g., Jest + React Native Testing Library) covering the
  core flows: authentication, meeting list/upload, and analytics views.
- A feature MUST NOT be merged to `main` if it reduces overall test coverage below 70%.

**Rationale**: Automated tests are the safety net that allows confident refactoring and
scaling of a multi-service codebase.

### VII. Simplicity & YAGNI

- New abstractions (services, repositories, mappers) MUST be justified by an existing,
  concrete need — not speculative future use.
- Ground-up rewrites of existing mobile code are STRICTLY PROHIBITED. Developers MUST refactor and extend existing mobile components and structures.
- The number of services/components MUST NOT grow beyond the four defined (Flask, Symfony, React Web, React Native Mobile)
  without explicit constitutional amendment and documented justification.
- Complexity introduced in violation of this principle MUST be documented in the
  "Complexity Tracking" table of the relevant plan.md.

**Rationale**: Premature abstraction and redundant rewrites introduce bugs and slow down integration. YAGNI keeps the codebase navigable.

### VIII. Mobile Frontend Parity, API Integration & Architectural Preservation (NON-NEGOTIABLE)

- **Web as Functional Reference**: The React Web frontend (`Frontend-Web/`) constitutes the functional reference of the application. The Mobile application MUST achieve 100% functional parity with the Web version, adhering strictly to the same backend REST API contracts, data models, and business logic.
- **Complete Mock Elimination**: All mock data stores, static JSON stubs, and simulated API delays in `frontend-mobile/` MUST be systematically replaced with real calls to the Symfony backend REST endpoints. Production mobile code MUST NOT contain mock data fallbacks.
- **Architectural & Code Style Preservation**: Implementation MUST preserve the current architecture, folder layout, naming conventions, component patterns, state management, and navigation system of `frontend-mobile/`. Existing code MUST be reused to the maximum extent possible.
- **UI Design Preservation**: The visual design, theme, and user experience of the existing Mobile application MUST be preserved. Design changes are strictly restricted to adjustments required to support missing Web capabilities.
- **Zero Regression Principle**: All existing, working mobile capabilities MUST remain fully functional. Mobile feature integration MUST proceed incrementally with continuous verification to avoid regressions.

**Rationale**: The backend and web frontend are fully functional and integrated. Complete functional parity on mobile is best achieved by preserving the mobile app's established design and codebase while wiring it directly to the proven backend APIs.

## Architecture & Tech Stack Constraints

### Approved Technology Stack

| Layer | Technology | Version Constraint |
|---|---|---|
| Frontend Web | React + Vite | React 18+, Vite 5+ |
| Frontend Web styling | Tailwind CSS | 3.x (already configured) |
| Frontend Mobile | React Native + Expo | SDK 50+ (React Native 0.73+) |
| Backend API | Symfony | 7.x |
| Backend ORM | Doctrine ORM | Bundled with Symfony 7 |
| Backend auth | LexikJWTAuthenticationBundle | Latest stable |
| Database | PostgreSQL | 15+ |
| AI Service | Flask | 3.x |
| AI models | Whisper (transcription), Helsinki-NLP (translation), custom NLP | As pinned in requirements.txt |
| Inter-service | HTTP/REST (Symfony→Flask) | JSON + multipart |

### Directory Layout

```text
Meeting-IA-sfm/          ← Repository Root
├── Backend/             ← Symfony backend (business logic, API, persistence)
├── AI/                  ← Flask AI microservice (inference only)
├── Frontend-Web/        ← React web frontend (UI, consumes Symfony API only, functional reference)
├── frontend-mobile/     ← React Native mobile frontend (UI, consumes Symfony API only)
└── .specify/            ← Spec-kit project governance files
```

### Dependency Rules

- Frontend-Web and frontend-mobile MUST NOT import from AI/ or Backend/ directly.
- Flask (`AI/`) MUST NOT import Symfony bundles or query the Symfony database directly.
- Symfony MAY call Flask via HTTP; Flask MUST NOT call Symfony.

## Development Workflow & Quality Gates

### Branch Strategy

- Feature branches: `feature/###-short-description`
- Bugfix branches: `fix/###-short-description`
- All branches MUST target `develop`; `main` receives only release merges.

### Pull Request Requirements

Every PR MUST:
1. Pass all automated tests (PHPUnit, pytest, Vitest, Jest for mobile) with no regressions.
2. Include a Constitution Check confirmation (reference the specific principle(s) exercised).
3. Update or add API contract documentation in `specs/*/contracts/` if a new endpoint is added
   or an existing one is changed.
4. Include a Doctrine migration file if the database schema changes.
5. Not introduce hardcoded secrets or credentials.
6. Verify that no mock data fallbacks remain in touched mobile components.

### AI Pipeline Flow (enforced pattern)

```
User (React/Mobile) → POST /api/v1/meetings/{id}/transcribe (Symfony)
                       → POST http://flask-internal/transcribe (multipart audio)
                       ← JSON result
                     → Persist result to PostgreSQL
                     ← Return transcript to React/Mobile
```

Deviations from this flow MUST be documented in the relevant spec and reviewed by a maintainer.

## Governance

This constitution supersedes all prior informal conventions described in code comments,
README files, or chat history. In case of conflict, this document takes precedence.

### Amendment Procedure

1. Open a PR that modifies `.specify/memory/constitution.md`.
2. Increment `CONSTITUTION_VERSION` according to semantic versioning rules defined in the
   `speckit-constitution` skill.
3. Run `/speckit-constitution` to propagate changes to all dependent templates.
4. Obtain at least one peer review and explicit approval before merging.
5. Add an entry to the Sync Impact Report (HTML comment at top of this file).

### Versioning Policy

- **MAJOR**: Principle removed, redefined with incompatible semantics, or service boundary changed.
- **MINOR**: New principle or section added; material guidance expansion.
- **PATCH**: Clarifications, typo fixes, wording improvements with no semantic change.

### Compliance Review

- Constitution compliance MUST be verified in every PR via the "Constitution Check" section
  of the feature's `plan.md`.
- A quarterly review of this document SHOULD be scheduled to remove stale guidance and
  align with the current state of the codebase.

**Version**: 1.2.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-07-29
