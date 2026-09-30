# Research & Technical Decisions: Mobile Frontend API Integration

**Feature Branch**: `011-mobile-parity-api-integration`  
**Date**: 2026-07-29  
**Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/011-mobile-parity-api-integration/spec.md)

## Overview

This document resolves technical choices, library selection, and architectural patterns required to connect the Flutter mobile frontend (`frontend-mobile/`) to the live Symfony backend (`Backend/`), achieving complete mock elimination and 100% functional parity with the Web application (`Frontend-Web/`).

---

## Technical Decisions

### Decision 1: HTTP Client & JWT Authentication Pipeline

- **Choice**: Use the standard Flutter `http` package with an `ApiClient` wrapper service and `flutter_secure_storage` for token management.
- **Rationale**: 
  - `flutter_secure_storage` uses iOS Keychain and Android Keystore (EncryptedSharedPreferences), fulfilling Constitution Principle III (Security by Default - Mobile Client Security).
  - An `ApiClient` class centralizes base URL configuration, JWT header injection (`Authorization: Bearer <token>`), 401 Unauthorized handling, and automatic token refresh/logout triggers.
- **Alternatives Considered**:
  - *Dio package*: Offers interceptors out of the box, but adds extra dependency overhead when standard `http` with a lightweight wrapper fits the existing Provider architecture seamlessly.

### Decision 2: State Management Architecture Extension

- **Choice**: Extend the existing `provider` pattern (`ChangeNotifier`) by creating dedicated, domain-focused state providers:
  - `AuthProvider`: Manages user login state, current user profile, JWT token lifecycle, and authentication status.
  - `MeetingProvider`: Manages meeting list fetching, search/filter criteria, active meeting detail, creation, and audio upload tracking.
  - `AnalyticsProvider`: Manages fetching and caching of meeting analytics, participant talk time, sentiment ratios, and topic breakdown.
  - `PVProvider`: Manages summary/PV content, action item status toggles, and document export triggers.
- **Rationale**: 
  - Preserves existing Flutter architecture and code style (Constitution Principle VIII).
  - Decouples UI widgets from raw HTTP logic, enabling clean unit testing with mock HTTP clients.
- **Alternatives Considered**:
  - *Riverpod or Bloc migration*: Would require a major architectural rewrite, explicitly violating Constitution Principle VII (YAGNI) and Principle VIII (Architectural Preservation).

### Decision 3: Audio File Upload Pipeline

- **Choice**: Use `http.MultipartRequest` with `http.MultipartFile.fromPath` combined with stream progress monitoring.
- **Rationale**:
  - Mobile audio recordings captured via the existing `record` package generate `.m4a` or `.wav` files on local device storage.
  - The Symfony backend accepts `multipart/form-data` uploads at `/api/v1/meetings/{id}/transcribe` or creation endpoints.
  - Progress reporting allows displaying an upload percentage indicator on the mobile upload screen.
- **Alternatives Considered**:
  - *Base64 JSON encoding*: Increases payload size by ~33% and risks out-of-memory errors on large meeting recordings.

### Decision 4: JSON Deserialization & Entity Mapping Strategy

- **Choice**: Implement explicit `factory Model.fromJson(Map<String, dynamic> json)` and `Map<String, dynamic> toJson()` methods on Flutter data models in `lib/models/models.dart`.
- **Rationale**:
  - Provides type safety and explicit fallback defaults for optional backend fields.
  - Matches the exact field structure returned by Symfony controllers (`Backend/src/Controller/`).
- **Alternatives Considered**:
  - *Code generation (`json_serializable`)*: Requires build_runner scripts and extra boilerplate files, whereas manual mappers are concise and transparent for the current model scope.

---

## Best Practices & Guidelines

1. **Environment Configuration**: Store backend base URL (e.g., `http://10.0.2.2:8000` for Android emulator or `http://localhost:8000` for iOS/web) in an environment config class (`lib/config/api_config.dart`).
2. **Error Handling**: Standardize API error responses (`ApiException` class) capturing HTTP status codes, error messages, and validation detail maps. Show user-friendly SnackBar / Toast alerts.
3. **Mock Data Removal**: Deprecate `lib/data/mock_data.dart` cleanly by removing imports in all screens and replacing data sources with Provider calls.
