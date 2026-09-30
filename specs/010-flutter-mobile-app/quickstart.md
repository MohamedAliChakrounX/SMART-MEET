# Flutter Mobile Application: Quickstart Guide

This document describes how to initialize, configure, and run the Flutter mobile application inside the `frontend-mobile/` directory, connecting it to the existing Symfony backend.

---

## 1. Project Initialization

Navigate to the repository root and run the following command to create the Flutter project:

```powershell
flutter create --org com.meetingia --project-name frontend_mobile --platforms=ios,android frontend-mobile
```

*Note: The project folder will be `frontend-mobile`, and the internal package/module name is `frontend_mobile` (using underscores as required by Dart).*

---

## 2. Dependencies Setup

Navigate into the created directory and install the primary dependencies:

```powershell
cd frontend-mobile

# Primary dependencies
flutter pub add flutter_riverpod dio retrofit go_router flutter_secure_storage fl_chart logger path_provider

# Dev dependencies (for code generation, styling, and testing)
flutter pub add --dev build_runner retrofit_generator freezed json_serializable freezed_annotation mocktail custom_lint
```

---

## 3. Code Generation

The project uses code generation for models (`freezed`, `json_serializable`) and network API clients (`retrofit`). Run the builder command to generate the `.freezed.dart` and `.g.dart` files:

```powershell
# Run a one-time build
dart run build_runner build --delete-conflicting-outputs

# Watch files and rebuild on changes (recommended during development)
dart run build_runner watch --delete-conflicting-outputs
```

---

## 4. Environment Configuration & Launching

To connect the mobile client to the Symfony API backend, you must inject the API base URL. Use `--dart-define` to supply the backend address at build/run time.

### Running on Android Emulator
The Android emulator redirects requests to `10.0.2.2:8000` to reach the host machine's `localhost:8000`:
```powershell
flutter run --dart-define=BASE_URL=http://10.0.2.2:8000
```

### Running on iOS Simulator
The iOS simulator shares the network stack with the host:
```powershell
flutter run --dart-define=BASE_URL=http://localhost:8000
```

### Running on Real Device
Find your computer's local IP address (e.g. `192.168.1.50`) and run:
```powershell
flutter run --dart-define=BASE_URL=http://192.168.1.50:8000
```
*Make sure your device and development computer are connected to the same Wi-Fi network.*

---

## 5. Directory Layout & Best Practices

Organize the `lib/src/` folder following a feature-first Clean Architecture pattern:

```text
lib/
├── main.dart             # Initializes SecureStorage, configures providers, starts app
└── src/
    ├── app.dart          # Configures MaterialApp, theme data, and GoRouter routes
    ├── core/             # Generic configs: HTTP client interceptors, themes, routers, custom loggers
    └── features/         # Functional components
        ├── auth/
        ├── meetings/
        └── analytics/
            ├── data/     # API Client contracts (Dio/Retrofit interfaces), Models
            ├── domain/   # Logical interfaces and entities
            └── presentation/ # UI Screens, widgets, and Riverpod StateNotifier providers
```
