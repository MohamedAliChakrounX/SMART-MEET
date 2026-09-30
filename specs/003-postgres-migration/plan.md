# Implementation Plan: Migration vers PostgreSQL

**Branch**: `003-postgres-migration` | **Date**: 2026-04-01 | **Spec**: [spec.md](file:///c:/Users/lenovo/.gemini/antigravity/scratch/Meeting-IA-sfm/specs/003-postgres-migration/spec.md)
**Input**: Feature specification from `/specs/003-postgres-migration/spec.md`

## Summary

Migrate the Meeting-IA-sfm application from mock/simulated data to real PostgreSQL persistence via the Symfony backend. This involves:
1. Creating Doctrine entities (Meeting, TranscriptSegment, Summary, AnalyticData)
2. Exposing REST API endpoints on Symfony for full CRUD + pagination
3. Implementing a Flask→Symfony webhook for AI result ingestion
4. Rewiring the React Frontend to consume the Symfony API instead of mock interceptors
5. Removing all mock data and Axios interceptors

## Technical Context

**Language/Version**: PHP 8.2 (Symfony 7.x) + JavaScript (React 18 / Vite 5)
**Primary Dependencies**: Doctrine ORM, LexikJWTAuthenticationBundle, Axios, React
**Storage**: PostgreSQL 15+ via Doctrine ORM
**Testing**: PHPUnit (Backend), Vitest (Frontend)
**Target Platform**: Linux/Windows dev server, Docker production
**Project Type**: Web application (Backend API + Frontend SPA)
**Performance Goals**: <500ms for 50 meetings list load (SC-002)
**Constraints**: Soft-delete required (Constitution IV), JWT auth on all endpoints (Constitution III)
**Scale/Scope**: < 10k meetings per organization initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Service Isolation** | ✅ PASS | New entities in Symfony only. Flask pushes results via webhook. Frontend consumes Symfony API only. |
| **II. API-First Design** | ✅ PASS | Contracts defined in `contracts/api-endpoints.md` before implementation. All endpoints under `/api/v1/`. |
| **III. Security by Default** | ✅ PASS | All new endpoints protected by JWT. Internal webhook uses `X-Internal-Secret`. |
| **IV. Data Ownership** | ✅ PASS | PostgreSQL is the single source of truth. Soft-delete on Meeting entity. Doctrine migrations committed. |
| **V. Observability** | ✅ PASS | Health check already exists. New endpoints will log auth events and API calls. |
| **VI. Test Coverage** | ✅ PASS | PHPUnit tests planned for all services and controllers. |
| **VII. Simplicity / YAGNI** | ✅ PASS | Only 4 new entities. No new services beyond Flask/Symfony/React. JSON columns for flexible data (no over-normalized tables). |

## Project Structure

### Documentation (this feature)

```text
specs/003-postgres-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output — technical decisions
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — dev setup guide
├── contracts/
│   └── api-endpoints.md # Phase 1 output — REST API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
Backend/
├── src/
│   ├── Entity/
│   │   ├── User.php                    # EXISTING
│   │   ├── Meeting.php                 # NEW
│   │   ├── TranscriptSegment.php       # NEW
│   │   ├── Summary.php                 # NEW
│   │   └── AnalyticData.php            # NEW
│   ├── Repository/
│   │   ├── MeetingRepository.php       # NEW (with pagination, soft-delete filter)
│   │   ├── TranscriptSegmentRepository.php # NEW
│   │   ├── SummaryRepository.php       # NEW
│   │   └── AnalyticDataRepository.php  # NEW
│   ├── Controller/
│   │   ├── MeetingController.php       # NEW (CRUD + pagination)
│   │   ├── TranscriptController.php    # NEW (GET/PUT segments)
│   │   ├── SummaryController.php       # NEW (GET/PUT summary + settings)
│   │   ├── AnalyticsController.php     # NEW (GET analytics)
│   │   └── InternalWebhookController.php # NEW (Flask → Symfony AI results)
│   └── Service/
│       └── MeetingService.php          # NEW (business logic, soft-delete)
├── config/
│   └── routes/
│       └── api.yaml                    # MODIFY (add new routes)
├── migrations/
│   └── VersionXXXX_MeetingEntities.php # NEW (auto-generated)
└── tests/
    ├── MeetingApiTest.php              # NEW
    ├── TranscriptApiTest.php           # NEW
    └── SummaryApiTest.php              # NEW

Frontend-Web/
├── src/
│   ├── services/
│   │   └── api.js                      # MODIFY (remove all interceptors, add Symfony routes)
│   ├── data/
│   │   └── mockData.js                 # DELETE
│   └── pages/
│       └── ArchiveLibrary/
│           └── ArchiveLibrary.jsx      # MODIFY (add infinite scroll)
└── vite.config.js                      # MODIFY (split proxy: Symfony + Flask)
```

**Structure Decision**: Option 2 (Web application) — the project already follows this pattern with `Backend/` and `Frontend-Web/` as separate directories.

## Complexity Tracking

> No constitution violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
