# Quickstart: Symfony Backend – JWT Authentication

**Feature**: `002-symfony-jwt-auth`  
**Audience**: Developer setting up the Symfony backend for the first time  
**Prerequisites**: PHP 8.2+, Composer, PostgreSQL 15+, OpenSSL

---

## 1. Create the Symfony Project

Run from the **repository root** (`Meeting-IA-sfm/`):

```bash
composer create-project symfony/skeleton . --no-interaction
```

> `symfony/skeleton` installs the minimal Symfony 7 core. We'll add bundles individually.

---

## 2. Install Required Bundles

```bash
# ORM + PostgreSQL driver
composer require symfony/orm-pack doctrine/doctrine-bundle \
    doctrine/doctrine-migrations-bundle

# Security
composer require symfony/security-bundle

# JWT
composer require lexik/jwt-authentication-bundle

# Refresh tokens
composer require gesdinet/jwt-refresh-token-bundle

# CORS
composer require nelmio/cors-bundle

# Validation
composer require symfony/validator

# Serializer (JSON responses)
composer require symfony/serializer-pack

# Dev tools
composer require --dev symfony/maker-bundle symfony/test-pack
```

---

## 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Fill in `.env`:
```dotenv
APP_ENV=dev
APP_SECRET=change-me-to-a-random-string

DATABASE_URL="postgresql://db_user:db_password@127.0.0.1:5432/meeting_ia?serverVersion=15&charset=utf8"

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=change-me

CORS_ALLOW_ORIGIN=^http://localhost:5173$
```

> **Never commit `.env` with real secrets.** The `.env.example` (no secrets) IS committed.

---

## 4. Generate JWT Key Pair

```bash
php bin/console lexik:jwt:generate-keypair
```

This creates `config/jwt/private.pem` and `config/jwt/public.pem`.  
Add `config/jwt/` to `.gitignore`.

---

## 5. Create & Run Migrations

```bash
# Create the database (if not already created)
php bin/console doctrine:database:create

# Generate migrations from entities
php bin/console make:migration

# Run all pending migrations
php bin/console doctrine:migrations:migrate
```

---

## 6. Seed Permission Data

```bash
php bin/console app:seed:permissions
```

> A custom Symfony command (`SeedPermissionsCommand`) inserts the initial `Permission` rows
> (`meeting.read`, `meeting.create`, etc.) as defined in `data-model.md`.

---

## 7. Create the First Admin User

```bash
php bin/console app:create-admin \
    --email="admin@meeting-ia.local" \
    --password="AdminPass123!" \
    --first-name="Super" \
    --last-name="Admin"
```

---

## 8. Start the Dev Server

```bash
symfony server:start --no-tls
# OR (without Symfony CLI):
php -S 127.0.0.1:8000 -t public/
```

The API is now available at `http://127.0.0.1:8000/api/v1/`.

---

## 9. Quick Smoke Test

```bash
# Login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@meeting-ia.local","password":"AdminPass123!"}' | jq .

# Use the returned token
TOKEN="<paste token here>"

# Access protected route
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/auth/me | jq .

# List users (admin only)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/users | jq .
```

---

## 10. Run Tests

```bash
php bin/phpunit
```

Expected: all tests in `tests/Unit/` and `tests/Integration/` pass.

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `config/packages/security.yaml` | Firewalls, access_control, password hashers |
| `config/packages/lexik_jwt_authentication.yaml` | JWT TTL, key paths |
| `config/packages/gesdinet_jwt_refresh_token.yaml` | Refresh token TTL |
| `config/packages/nelmio_cors.yaml` | CORS origins |
| `config/packages/doctrine.yaml` | Database connection |
| `.env` | Runtime secrets (NOT committed) |
| `.env.example` | Template with placeholder values (committed) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `JWT key not found` | Run `php bin/console lexik:jwt:generate-keypair` |
| `CORS error in browser` | Check `CORS_ALLOW_ORIGIN` in `.env` matches your Vite dev URL |
| `401 on valid token` | Check token denylist; check `is_active` on the User |
| `500 on login` | Check `DATABASE_URL` and run migrations |
