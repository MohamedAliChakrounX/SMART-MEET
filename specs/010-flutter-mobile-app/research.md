# Technical Research: Flutter Mobile Application Parity

This document outlines the technical research and technology selections for implementing the Flutter mobile application in the `frontend-mobile/` directory, ensuring 100% parity with the web platform.

## 1. State Management & Dependency Injection

### Decision
Implement **Riverpod** (`flutter_riverpod` and `riverpod_annotation`) as the primary state management and dependency injection framework.

### Rationale
- **Compile-time Safety**: Riverpod resolves providers at compile-time rather than runtime, preventing common runtime `ProviderNotFoundException` issues found in Provider.
- **AsyncNotifier**: Riverpod's `AsyncNotifier` integrates perfectly with asynchronous network requests, handling loading, data, and error states natively.
- **Independence from BuildContext**: Providers can be read or watched outside of the widget tree (e.g., in repositories or utilities), facilitating a clean separation between UI and business logic.
- **Testability**: Riverpod permits overriding providers during tests, making unit/widget testing of presentation state trivial without complex mocking frameworks.

### Alternatives Considered
- **BLoC (Business Logic Component)**: While excellent for Clean Architecture, BLoC introduces significant boilerplate (Events, States, Blocs, and event handlers) which would slow down development speed.
- **Provider**: Less robust than Riverpod, lacks compile-time safety, and forces reliance on `BuildContext` which complicates data and domain layer logic.

---

## 2. HTTP/REST Network Client

### Decision
Implement **Dio** as the underlying HTTP client, paired with **Retrofit** (`retrofit` and `retrofit_generator`) for type-safe API code generation.

### Rationale
- **Interceptors**: Dio supports request/response interceptors. This is essential for automatically appending the JWT `Authorization: Bearer <token>` header to outgoing requests and handling token refresh flows (detecting `401 Unauthorized` and retrying).
- **Upload Progress Callback**: Dio provides a `onSendProgress` parameter out-of-the-box, allowing real-time progress indicators when users upload large meeting audio files.
- **Type-safe API Calls**: Retrofit converts Dart interfaces annotated with REST metadata into concrete network requests, eliminating manual JSON decoding boilerplate and minimizing network layer bugs.

### Alternatives Considered
- **Http Package**: Lacks native interceptors, does not track upload progress natively, and requires verbose manual mapping of headers and JSON objects.

---

## 3. Secure Credentials Storage

### Decision
Implement **Flutter Secure Storage** (`flutter_secure_storage`) to store the JWT access and refresh tokens.

### Rationale
- **OS-level Encryption**: It uses Keychain on iOS and KeyStore on Android (via AES encryption), which is the industry standard for storing sensitive cryptographic keys and credentials.
- **Simplicity**: Simple key-value store interface that runs asynchronously.

### Alternatives Considered
- **SharedPreferences**: Stores data in plain XML files. This is unacceptable for JWT tokens as any process on rooted/jailbroken devices can inspect them.

---

## 4. Local Caching Strategy

### Decision
Implement **Drift** (formerly Moor) as a reactive SQLite persistence layer for caching meeting lists and details.

### Rationale
- **Reactive Queries**: Allows widgets to observe database tables and automatically rebuild when rows change.
- **Offline Support**: Enables standard users to browse previously loaded meeting transcripts, summaries, and analytics when offline.
- **SQL Power**: Supports complex querying, sorting, and relations needed to mirror web search/filter operations.

### Alternatives Considered
- **In-Memory Cache Only**: Degrades user experience if the connection drops.
- **Hive / Isar**: Fast NoSQL options, but lack relational query features which are useful for structures like Meetings → Transcripts → Action Items.
