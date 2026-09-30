# Meeting-IA-sfm Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-07-29

## Active Technologies
- PostgreSQL 15+ (shared database with future features) (002-symfony-jwt-auth)
- PHP 8.2 (Symfony 7.x) + JavaScript (React 18 / Vite 5) + Doctrine ORM, LexikJWTAuthenticationBundle, Axios, React (003-postgres-migration)
- PostgreSQL 15+ via Doctrine ORM (003-postgres-migration)
- TypeScript (admin components) + JavaScript (page components) · React 18 · Vite 7.x + framer-motion (animations), lucide-react (icons), axios (API calls via `api.js`), react-router-dom v6 (004-admin-dashboard)
- PostgreSQL via Symfony ORM (backend) — admin panel uses in-memory React state for nav (004-admin-dashboard)
- PHP 8.2 (Symfony 7.x) / JavaScript ES2022 (React 18 + Vite 5) + Doctrine ORM, LexikJWTAuthenticationBundle, Symfony Security, Vitest + Testing Library (006-user-permissions)
- PostgreSQL 15 via Doctrine ORM (006-user-permissions)
- PHP 8.1+ (Symfony 7) · TypeScript/TSX (React 18, Vite 5) + LexikJWTAuthenticationBundle, Doctrine ORM, framer-motion (existant) (007-user-permissions-backend)
- PostgreSQL 15+ via Doctrine ORM (schéma inchangé) (007-user-permissions-backend)
- PHP 8.2+ (Symfony 7.4), JavaScript/React 18 (Vite 5) (008-pv-export)
- PostgreSQL 15 (read-only for this feature — no schema changes) (008-pv-export)
- Python 3.11+ + Flask (3.0+), LangChain (0.1+), psycopg2-binary, pgvector, PyJWT, faster-whisper, kokoro, soundfile, requests, numpy, cachetools (009-multimodal-meeting-agent)
- PostgreSQL (15+) avec extension `pgvector` activée (009-multimodal-meeting-agent)
- Dart 3.4+ / Flutter 3.22+ (stable) + `flutter_riverpod` (v2.5+), `dio` (v5.4+), `retrofit` (v4.1+), `go_router` (v14.0+), `flutter_secure_storage` (v9.0+), `freezed_annotation`, `json_annotation`, `fl_chart` (for analytics visualizations) (010-flutter-mobile-app)
- `flutter_secure_storage` for JWT auth credentials, `drift` or `sqflite` (optional, for local meetings metadata caching) (010-flutter-mobile-app)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (011-mobile-parity-api-integration)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (011-mobile-parity-api-integration)

- PHP 8.2+ / Symfony 7.x (002-symfony-jwt-auth)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

# Add commands for PHP 8.2+ / Symfony 7.x

## Code Style

PHP 8.2+ / Symfony 7.x: Follow standard conventions

## Recent Changes
- 011-mobile-parity-api-integration: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 010-flutter-mobile-app: Added Dart 3.4+ / Flutter 3.22+ (stable) + `flutter_riverpod` (v2.5+), `dio` (v5.4+), `retrofit` (v4.1+), `go_router` (v14.0+), `flutter_secure_storage` (v9.0+), `freezed_annotation`, `json_annotation`, `fl_chart` (for analytics visualizations)
- 009-multimodal-meeting-agent: Added Python 3.11+ + Flask (3.0+), LangChain (0.1+), psycopg2-binary, pgvector, PyJWT, faster-whisper, kokoro, soundfile, requests, numpy, cachetools


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
