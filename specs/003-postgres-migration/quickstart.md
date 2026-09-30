# Quickstart: Migration vers PostgreSQL

**Feature**: 003-postgres-migration | **Date**: 2026-04-01

## Prerequisites

- PHP 8.2+ with extensions: `pdo_pgsql`, `intl`, `sodium`
- Composer 2.x
- PostgreSQL 15+ running on `localhost:5432`
- Node.js 18+ / npm 9+
- Symfony CLI (optional, for `symfony serve`)

## 1. Database Setup

```bash
# Create the PostgreSQL database (if not already done)
cd Backend
php bin/console doctrine:database:create --if-not-exists

# Run all migrations (existing auth + new meeting entities)
php bin/console doctrine:migrations:migrate --no-interaction
```

## 2. Backend — New Entities & Endpoints

After migration, the following Doctrine entities will be available:

| Entity | Table | Repository |
|--------|-------|------------|
| `Meeting` | `meeting` | `MeetingRepository` |
| `TranscriptSegment` | `transcript_segment` | `TranscriptSegmentRepository` |
| `Summary` | `summary` | `SummaryRepository` |
| `AnalyticData` | `analytic_data` | `AnalyticDataRepository` |

### Verify entities

```bash
cd Backend
php bin/console doctrine:schema:validate
```

### Seed test data (dev only)

```bash
php bin/console app:seed-meetings
```

### Start backend

```bash
cd Backend
symfony serve --port=8000
# or: php -S localhost:8000 -t public
```

## 3. Frontend — API Rewiring

The Vite proxy must be updated to route business endpoints to Symfony:

```bash
cd Frontend-Web
npm install
npm run dev
```

After the migration:
- `/api/v1/meetings*` → Symfony (`:8000`)
- `/api/v1/summaries*` → Symfony (`:8000`)
- `/api/v1/analytics*` → Symfony (`:8000`)
- `/api/upload`, `/api/meetings/*/transcribe`, `/api/meetings/*/status` → Flask (`:5001`)

## 4. Verify End-to-End

1. Login via Frontend → JWT token obtained from Symfony
2. Navigate to Archive Library → meetings loaded from PostgreSQL
3. Click a meeting → details + transcript loaded from Symfony API
4. Check browser DevTools Network tab → all calls to `localhost:8000`, zero mock interceptors

## 5. Run Tests

```bash
# Backend
cd Backend
php bin/phpunit

# Frontend (when component tests added)
cd Frontend-Web
npm run test
```
