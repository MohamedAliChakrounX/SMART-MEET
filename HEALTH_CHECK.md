# Application Health Check

## ✅ Vérifier que tout fonctionne

Exécutez ces commandes pour valider votre setup:

### 1️⃣ Vérifier PHP et Composer
```bash
php --version
composer --version
```

**Résultat attendu:**
- PHP >= 8.2
- Composer >= 2.0

### 2️⃣ Vérifier Node.js et npm
```bash
node --version
npm --version
```

**Résultat attendu:**
- Node >= 16
- npm >= 7

### 3️⃣ Vérifier PostgreSQL
```bash
psql -U postgres -c "SELECT version();"
```

**Résultat attendu:**
```
PostgreSQL 14 or higher
```

### 4️⃣ Vérifier la base de données
```bash
cd Backend
php bin/console doctrine:database:create --if-not-exists
```

**Résultat attendu:**
```
Database "meetingDB" created successfully
```

### 5️⃣ Vérifier les migrations
```bash
php bin/console doctrine:migrations:status
```

**Résultat attendu:**
```
Available Migrations:  X migrations
Executed Migrations:   X migrations
New Migrations:        0 migrations
```

### 6️⃣ Vérifier les utilisateurs
```bash
php bin/console doctrine:query:sql "SELECT COUNT(*) as count FROM \"user\""
```

**Résultat attendu:**
```
count | 1
```

### 7️⃣ Vérifier le serveur Symfony
```bash
php -S localhost:8000 -t public &
sleep 2
curl -s http://localhost:8000/api/v1/auth/login -o /dev/null -w "%{http_code}\n"
```

**Résultat attendu:**
```
400  (ou 401, mais PAS 404 ou 500)
```

### 8️⃣ Vérifier le login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Résultat attendu:**
```json
{
  "token": "...",
  "user": { ... }
}
```

### 9️⃣ Vérifier le frontend
```bash
cd Frontend-Web
npm run build
```

**Résultat attendu:**
```
✓ 1234 modules transformed.
  dist/index.html    12.5 kB │ gzip: 3.8 kB
  dist/assets/...    45.2 kB │ gzip: 12.3 kB
  ✓ built in 5.23s
```

### 🔟 Vérifier les API endpoints
```bash
TOKEN="your_token_here"

# Lister les réunions
curl -X GET http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer $TOKEN"

# Infos utilisateur
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Checklist complète

- [ ] PHP 8.2+ installé
- [ ] Composer installé
- [ ] Node.js 16+ installé
- [ ] PostgreSQL 14+ en cours d'exécution
- [ ] Base de données créée
- [ ] Migrations exécutées
- [ ] JWT keypair généré
- [ ] Utilisateur de test créé
- [ ] Backend démarre sans erreurs
- [ ] Frontend démarre sans erreurs
- [ ] Login fonctionne
- [ ] Endpoints API répondent

---

## 🆘 En cas de problème

1. **Vérifiez les logs**:
   ```bash
   # Backend
   tail -f var/log/dev.log
   
   # Frontend (console du navigateur)
   F12 > Console
   ```

2. **Nettoyez et recommencez**:
   ```bash
   cd Backend
   rm -rf vendor/
   rm -rf var/
   composer install
   php bin/console doctrine:database:drop --force
   php bin/console doctrine:database:create
   php bin/console doctrine:migrations:migrate
   ```

3. **Consultez la documentation**:
   - [QUICK_START.md](./QUICK_START.md)
   - [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)

---

## 📊 Performance et optimisation

Une fois en production:

1. **Compiler les assets**:
   ```bash
   cd Frontend-Web
   npm run build
   # Servir depuis `dist/` avec un web server
   ```

2. **Compiler PHP pour production**:
   ```bash
   cd Backend
   composer install --no-dev --optimize-autoloader
   php bin/console cache:clear --env=prod
   ```

3. **Vérifier la sécurité**:
   ```bash
   composer audit
   npm audit
   ```

---

## ✅ Succès!

Si tous les checks passent, vous êtes prêt à:
- Développer des fonctionnalités
- Déployer en staging
- Déployer en production

Bon courage! 🚀
