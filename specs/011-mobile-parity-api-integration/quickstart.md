# Quickstart & Developer Guide: Mobile API Integration

**Feature Branch**: `011-mobile-parity-api-integration`  
**Date**: 2026-07-29  
**Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/011-mobile-parity-api-integration/spec.md)

## Development Setup & Verification

### 1. Prerequisites

- **Symfony Backend**: Running locally on `http://127.0.0.1:8000` or via Docker.
- **Flutter SDK**: `>= 3.0.0` configured with Android SDK / iOS Xcode simulator.
- **Dependencies**: Run `flutter pub get` inside `frontend-mobile/`.

### 2. Configure Environment URL

In `frontend-mobile/lib/config/api_config.dart`:

- **Android Emulator**: `http://10.0.2.2:8000/api/v1`
- **iOS Simulator / Web**: `http://localhost:8000/api/v1`
- **Physical Mobile Device**: `http://<your-local-ip>:8000/api/v1`

### 3. Running the Mobile Application

```bash
cd frontend-mobile
flutter pub get
flutter run
```

### 4. Verification & Testing

#### Unit & Widget Tests
```bash
cd frontend-mobile
flutter test
```

#### Manual Functional Parity Check
1. Open Web Frontend (`Frontend-Web/`) and Mobile App (`frontend-mobile/`).
2. Log in on mobile using valid backend credentials.
3. Verify meeting list matches live backend entries.
4. Record audio or select an audio file on mobile and confirm status transitions to `PROCESSING` and `COMPLETED`.
5. Open meeting details, transcript, and analytics tabs on mobile to verify figures match Web frontend outputs.
