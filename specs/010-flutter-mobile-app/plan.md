# Implementation Plan: Flutter Mobile Application Parity

**Branch**: `010-flutter-mobile-app` | **Date**: 2026-06-03 | **Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/010-flutter-mobile-app/spec.md)
**Input**: Feature specification from `/specs/010-flutter-mobile-app/spec.md`

## Summary

This feature involves creating a Flutter mobile application from scratch in the `frontend-mobile` directory. The application must achieve 100% functional, visuelle, and behavioral parity with the existing React web application. It will communicate exclusively with the existing Symfony API (`/api/v1/`) and respect the project's service isolation guidelines. The technical stack comprises Flutter 3.22+, Riverpod for state management, Dio + Retrofit for networking, and Clean Architecture (Data/Domain/Presentation layers structured by feature) for codebase organization.

## Technical Context

**Language/Version**: Dart 3.4+ / Flutter 3.22+ (stable)  
**Primary Dependencies**: `flutter_riverpod` (v2.5+), `dio` (v5.4+), `retrofit` (v4.1+), `go_router` (v14.0+), `flutter_secure_storage` (v9.0+), `freezed_annotation`, `json_annotation`, `fl_chart` (for analytics visualizations)  
**Storage**: `flutter_secure_storage` for JWT auth credentials, `drift` or `sqflite` (optional, for local meetings metadata caching)  
**Testing**: `flutter_test` (unit/widget testing), `integration_test` (end-to-end user flows), `mocktail` (mocking dependencies)  
**Target Platform**: iOS 13+ / Android 6.0+ (API 23+)  
**Project Type**: Mobile Application (Flutter)  
**Performance Goals**: 60 fps fluid rendering, <2s app launch to home screen on standard devices, <200ms screen transitions, smooth chunk-wise audio uploads  
**Constraints**: Zero layout overflows on mobile viewports (320px–480px width), strict compliance with Symfony CORS/JWT expiration, no direct queries to Postgres or AI service  
**Scale/Scope**: Full client parity comprising 5 primary feature areas: Auth, Meetings, Upload, Analytics, and Organization Administration. Approx. 10 screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Service Isolation**: The Flutter app (`frontend-mobile/`) communicates only with the Symfony API backend (`Backend/` via `/api/v1/` routes). It does not access the Flask AI service directly. **STATUS: PASS**
- **Principle III: Security by Default**: JWT tokens are persisted securely on the mobile device using `flutter_secure_storage` (SecureStore/Keychain). No API keys or secrets are hardcoded in the codebase; they are injected via `--dart-define` at build-time. **STATUS: PASS**
- **Principle V: Observability**: Mobile-side exceptions and network failures are captured globally and logged structure-wise. Health checks of the backend are validated before initiating API sequences. **STATUS: PASS**
- **Principle VI: Test Coverage Standards**: Core flows (auth, meetings, details) will be verified with unit and widget tests (target coverage: 70%+). **STATUS: PASS**
- **Principle VII: Simplicity & YAGNI**: The app utilizes only standard Flutter and Dart widgets, maintaining the limit of 4 overall services/components in the project layout. **STATUS: PASS**

## Project Structure

### Documentation (this feature)

```text
specs/010-flutter-mobile-app/
├── plan.md              # This file
├── research.md          # Phase 0: Technology selection and caching research
├── data-model.md        # Phase 1: Dart models and state contracts
├── quickstart.md        # Phase 1: Mobile execution and build guide
├── contracts/           # Phase 1: Network schema contracts
└── tasks.md             # Phase 2: Tasks breakdown checklist
```

### Source Code (repository root)

```text
Meeting-IA-sfm/          ← Repository Root
├── Backend/             ← Symfony backend API (business logic)
├── AI/                  ← Flask AI service (inference only)
├── Frontend-Web/        ← React Web frontend
└── frontend-mobile/     ← Flutter mobile application
    ├── android/         ← Native Android configurations
    ├── ios/             ← Native iOS configurations
    ├── lib/             ← Flutter/Dart source code
    │   ├── main.dart    # Application entry point
    │   └── src/
    │       ├── app.dart # Main MaterialApp configuration (routing, themes)
    │       ├── core/    # Cross-cutting concerns (theme, routers, network client, errors)
    │       └── features/# Feature modules (Clean Architecture)
    │           ├── auth/
    │           ├── meetings/
    │           ├── analytics/
    │           ├── upload/
    │           └── admin/
    │               ├── data/         # Models, DTOs, API contracts, local sources
    │               ├── domain/       # Entities, usecases (logic contracts)
    │               └── presentation/ # Screens, custom widgets, state providers
    ├── pubspec.yaml     ← Dependencies and resources definition
    └── test/            ← Unit, widget, and integration tests
```

**Structure Decision**: Option 2 adaptation — structured as a standalone Flutter application in `frontend-mobile/` using Clean Architecture (Data/Domain/Presentation) grouped by feature.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No violations - the project structure and technology choices align completely with the project's revised constitution.)*
