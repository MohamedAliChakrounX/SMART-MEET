# Implementation Plan: Mobile Frontend API Integration & Full Web Parity

**Branch**: `011-mobile-parity-api-integration` | **Date**: 2026-07-29 | **Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/011-mobile-parity-api-integration/spec.md)  
**Input**: Complete mobile Flutter frontend (`frontend-mobile/`) by wiring it to live Symfony REST APIs (`Backend/`), replacing all mock data with real endpoints, maintaining existing UI design and code architecture, and achieving 100% functional parity with the Web application (`Frontend-Web/`).

## Summary

The backend (Symfony + PostgreSQL + Flask AI) and Web frontend (React) are completely built and integrated. The mobile Flutter app has a well-designed UI but uses static mock data (`lib/data/mock_data.dart`) and incomplete user flows. 

This implementation plan defines the step-by-step technical architecture to:
1. Introduce HTTP service layer (`ApiClient`, `AuthService`, `MeetingService`, `AnalyticsService`, `PVService`).
2. Implement secure JWT session persistence (`flutter_secure_storage`).
3. Wire Flutter state providers (`AuthProvider`, `MeetingProvider`, `AnalyticsProvider`, `PVProvider`) to live REST APIs.
4. Replace mock data fallbacks in screens (`overview`, `transcription`, `behavioral_analytics`, `refine_summary`, `upload`, `archive_library`, `settings`) with live API data streams.
5. Provide audio recording/upload streaming to Symfony ingestion endpoints.
6. Verify 100% Web functional parity with zero visual regressions on mobile.

## Technical Context

**Language/Version**: Dart 3.x / Flutter SDK >= 3.0.0  
**Primary Dependencies**: `flutter`, `provider` (6.1.2), `go_router` (14.0.0), `http` (HTTP client wrapper), `flutter_secure_storage` (secure JWT persistence), `fl_chart` (1.1.1), `record` (6.2.0), `just_audio` (0.9.38), `file_picker` (10.0.0)  
**Storage**: Symfony PostgreSQL backend via REST API; Local Secure Storage (Keychain/Keystore) for JWT tokens  
**Testing**: `flutter_test` (unit tests for services/providers & widget tests for screens)  
**Target Platform**: Android / iOS Mobile Devices & Emulators  
**Project Type**: Mobile Application (`frontend-mobile/`)  
**Performance Goals**: API response rendering < 3s, 60 FPS UI animation performance, background chunked audio upload  
**Constraints**: Zero production mock fallbacks, 100% Web feature parity, strictly preserve current Flutter directory layout, theme styling, and component structures  
**Scale/Scope**: 7 mobile screen modules, ~15 API endpoints, full mobile client integration  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Service Isolation (PASS)**: `frontend-mobile/` consumes only the Symfony API (`Backend/`). It does NOT call Flask directly or access database instances directly.
- **Principle II: API-First Design (PASS)**: Endpoints mapped strictly to documented REST contracts in `specs/011-mobile-parity-api-integration/contracts/`.
- **Principle III: Security by Default (PASS)**: JWT authentication enforced on all endpoints; tokens stored in `flutter_secure_storage` (Keychain/Keystore); no hardcoded secrets in mobile code.
- **Principle IV: Data Ownership & Persistence (PASS)**: Symfony (PostgreSQL) is single source of truth; mobile app does not store persistent business data locally.
- **Principle V: Observability (PASS)**: API error logging and user-facing SnackBar alerts for HTTP failures.
- **Principle VI: Test Coverage Standards (PASS)**: `flutter_test` unit tests for API clients, Providers, and key widget screens.
- **Principle VII: Simplicity & YAGNI (PASS)**: No ground-up rewrites. Incremental extension of existing Flutter structure and `provider` state management.
- **Principle VIII: Mobile Parity, API Integration & Architectural Preservation (PASS)**: Web frontend is functional reference; mock data eliminated; mobile UI and architecture preserved.

## Project Structure

### Documentation (this feature)

```text
specs/011-mobile-parity-api-integration/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical decisions & best practices
├── data-model.md        # Entity mappings & JSON serializable Dart models
├── quickstart.md        # Developer setup & testing guide
├── contracts/           # Mobile REST API contract specification
└── checklists/          # Specification quality checklist
```

### Source Code Layout

```text
frontend-mobile/
├── lib/
│   ├── config/          # API base URL & configuration constants
│   ├── data/            # [DEPRECATED] mock_data.dart (phased out)
│   ├── models/          # Dart models with fromJson/toJson mappers (models.dart)
│   ├── pages/           # Screen widgets (overview, transcription, analytics, etc.)
│   ├── providers/       # State Providers (auth_provider, meeting_provider, etc.)
│   ├── services/        # HTTP API services (api_client, auth_service, meeting_service)
│   ├── theme/           # UI theme & color tokens
│   ├── widgets/         # Reusable UI widgets
│   ├── main.dart        # Entrypoint initializing providers & router
│   └── router.dart      # GoRouter route definitions & auth guards
└── test/                # Flutter unit & widget tests
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | All rules satisfied cleanly | N/A |
