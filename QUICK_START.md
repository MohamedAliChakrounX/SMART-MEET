# 🚀 Quick Start Guide - Meeting-IA-sfm

## 🔧 Setup rapide (5 minutes)

### Windows
```batch
cd Backend
setup.bat
```

### macOS / Linux
```bash
cd Backend
bash setup.sh
```

### Manual Setup
```bash
cd Backend

# 1. Install dependencies
composer install

# 2. Create database
php bin/console doctrine:database:create

# 3. Run migrations
php bin/console doctrine:migrations:migrate

# 4. Generate JWT keys
php bin/console lexik:jwt:generate-keypair

# 5. Create test user
php bin/console app:create-test-user
```

---

## 🎯 Démarrer l'application

### Terminal 1 - Backend
```bash
cd Backend
php -S localhost:8000 -t public
```

**Output attendu:**
```
[Wed Apr 01 17:45:00 2026] PHP 8.2.0 Development Server started at http://localhost:8000
```

### Terminal 2 - Frontend
```bash
cd Frontend-Web
npm install
npm run dev
```

**Output attendu:**
```
VITE v7.3.1  ready in 234 ms

➜  Local:   http://localhost:5173/
```

---

## ✅ Tester la connexion

### Via Frontend (plus facile)
1. Ouvrir http://localhost:5173
2. Vous voyez une page de login
3. Entrer:
   - **Email**: `test@example.com`
   - **Password**: `password123`
4. Cliquer "Login"

### Via cURL
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Réponse:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

---

## 🗂️ URLs principales

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost:5173 | Interface React |
| **Backend API** | http://localhost:8000/api/v1 | Endpoints REST |
| **Swagger/Docs** | http://localhost:8000/api/docs | (si disponible) |
| **Database** | localhost:5432 | PostgreSQL |

---

## 📝 Premier test - Créer une réunion

Après connexion, vous devez avoir un token. L'utiliser pour créer une réunion:

```bash
TOKEN="YOUR_TOKEN_HERE"

curl -X POST http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Meeting",
    "startAt": "2026-04-01T14:00:00Z",
    "durationMinutes": 60,
    "status": "In_Progress",
    "participants": ["Alice", "Bob"]
  }'
```

---

## 🆘 Troubleshooting

### ❌ Erreur: "SQLSTATE[HY000]"
**Problème**: PostgreSQL n'est pas accessible
**Solution**:
```bash
# Vérifier que PostgreSQL tourne
psql -U postgres -c "SELECT 1"

# Ou utiliser Docker
docker-compose up -d
```

### ❌ Erreur: "Port 8000 already in use"
**Problème**: Un autre processus utilise le port
**Solution**:
```bash
# Utiliser un autre port
php -S localhost:8001 -t public

# Ou tuer le processus existant
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows
```

### ❌ Erreur: "Invalid credentials"
**Problème**: L'utilisateur n'existe pas
**Solution**:
```bash
php bin/console app:create-test-user
```

### ❌ CORS Error au frontend
**Problème**: Le backend rejette les requêtes du frontend
**Solution**: Vérifier `config/packages/nelmio_cors.yaml`
```bash
# Redémarrer le backend
php -S localhost:8000 -t public
```

---

## 📚 Documentation supplémentaire

- **Auth Details**: [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)
- **API Endpoints**: [specs/001-api-endpoints.md](./specs/001-api-endpoints.md)
- **Architecture**: [specs/003-postgres-migration.md](./specs/003-postgres-migration.md)

---

## 🎊 Félicitations!

Vous pouvez maintenant:
✅ Vous connecter à l'application
✅ Créer des réunions
✅ Ajouter des transcriptions
✅ Générer des résumés
✅ Voir l'analyse comportementale

Bon développement! 🚀
