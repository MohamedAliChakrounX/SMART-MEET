# Research: Migration vers PostgreSQL

**Feature**: 003-postgres-migration | **Date**: 2026-04-01

## R1: Doctrine Soft-Delete Strategy

**Decision**: Use a native `deletedAt` nullable column with Doctrine filters (no third-party bundle).

**Rationale**: The constitution explicitly requires soft-delete for Meeting and User entities (Principle IV). Using a native Doctrine SQL Filter (`SoftDeleteableFilter`) keeps dependencies minimal (YAGNI, Principle VII) while automatically excluding soft-deleted records from all queries unless explicitly bypassed.

**Alternatives considered**:
- `gedmo/doctrine-extensions` SoftDeleteable: Adds a full behavioral extension suite when only soft-delete is needed. Rejected per Principle VII.
- Manual `WHERE deletedAt IS NULL` on every query: Error-prone, no centralized enforcement. Rejected.

## R2: Pagination Strategy for Meeting List

**Decision**: Offset/limit pagination via query parameters (`?page=1&limit=20`).

**Rationale**: The Frontend will implement infinite scroll / "Voir plus" (spec clarification). Offset-based pagination is the simplest approach that maps directly to SQL `LIMIT/OFFSET` and is well-supported by Doctrine's `Paginator`. Cursor-based pagination is not needed at the anticipated scale (<10k meetings per org).

**Alternatives considered**:
- Cursor-based pagination: Better for very large datasets but adds complexity. Premature for current scale. Deferred.
- Load all: Ruled out by spec clarification.

## R3: Vite Proxy Reconfiguration

**Decision**: Split the Vite proxy to route `/api/v1/meetings`, `/api/v1/summaries`, `/api/v1/analytics` to Symfony (`localhost:8000`) while keeping AI-specific routes (`/api/upload`, `/api/meetings/:id/transcribe`, `/api/meetings/:id/status`) on Flask (`localhost:5001`).

**Rationale**: The current `vite.config.js` proxies ALL `/api` calls to Flask (port 5001). Post-migration, business data endpoints must hit Symfony (port 8000). The Vite proxy needs path-based routing to support both backends during the transition.

**Alternatives considered**:
- Single gateway/reverse-proxy (Nginx): Adds infrastructure complexity for a dev environment. Better suited for production. Deferred.
- Flask forwarding to Symfony: Violates constitution Principle I (Service Isolation) — Flask MUST NOT call Symfony.

## R4: Mock Data Removal Strategy

**Decision**: Replace Axios interceptors with direct API calls; delete `mockData.js` entirely.

**Rationale**: The current `api.js` uses Axios request interceptors to short-circuit requests with mock data for `id < 100_000`. Post-migration, all meeting IDs will be UUIDs from PostgreSQL. The interceptor pattern and the `mockData.js` file must be fully removed (FR-005), and `api.js` rewritten to make real HTTP calls.

**Alternatives considered**:
- Feature flag toggle (mock vs real): Adds dead code paths. Rejected — spec explicitly requires removal.
- Gradual migration (keep mocks as fallback): Risk of data inconsistency. Rejected.

## R5: Entity Relationship Design

**Decision**: One-to-Many from Meeting to TranscriptSegment, Summary, and AnalyticData. Meeting owns the User relationship via a ManyToOne (creator/owner).

**Rationale**: Matches the existing `mockData.js` structure where each meeting has arrays of segments, a summary object, and analytics data. The 1:N relationships allow efficient cascade loading and are straightforward to model in Doctrine.

**Alternatives considered**:
- Many-to-Many Meeting↔User (participants): Possible future need for multi-user meetings but not in current spec scope. A simple `participants` JSON column on Meeting is sufficient for display. Can be promoted to a join table later if needed.

## R6: JSON Format for Summary Content

**Decision**: Store Summary content as a JSON column (`JSONB` in PostgreSQL).

**Rationale**: The mock data shows the summary has a nested structure (`executiveOverview`, `keyDecisions[]`, `nextSteps[]`). Storing as JSONB allows direct querying of sub-fields if needed, while keeping a single column. Doctrine supports `json` column type which maps to PostgreSQL `jsonb`.

**Alternatives considered**:
- Markdown string: Loses structure for programmatic access (e.g., listing key decisions). Rejected.
- Separate normalized tables for each summary section: Over-engineering for current needs. Rejected per Principle VII.
