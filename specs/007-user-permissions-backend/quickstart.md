# Quickstart: Gestion des Permissions Utilisateurs Standards

**Feature**: 007-user-permissions-backend  
**Date**: 2026-05-01

## Prérequis

- Symfony backend démarré : `php -S 127.0.0.1:8000 -t public` (dans `Backend/`)
- Frontend Vite démarré : `npm run dev` (dans `Frontend-Web/`)
- Base de données PostgreSQL accessible et migrations à jour

---

## Étape 1 — Seeder les 9 clés de permission en base

```bash
# Depuis le dossier Backend/
php bin/console app:seed:permissions
```

Vérifie que les 9 entrées existent dans la table `permission` :
```bash
php bin/console doctrine:query:sql "SELECT key FROM permission ORDER BY key"
```

Résultat attendu :
```
dept.analytics.others
dept.analytics.self
dept.pv.read
dept.transcript.read
meeting.upload
team.analytics.others
team.analytics.self
team.pv.read
team.transcript.read
```

---

## Étape 2 — Créer un utilisateur standard de test

```bash
# Créer un utilisateur standard (si pas encore fait)
php bin/console app:create:user --email=user@test.com --password=Test1234 --firstName=Alice --lastName=Test
```

---

## Étape 3 — Tester les endpoints via curl

### Lister les utilisateurs (avec permissions)
```bash
# D'abord obtenir un token admin
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sfm.com","password":"Admin1234"}' | jq -r '.token')

# Lister les utilisateurs
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users | jq .
```

### Attribuer des permissions à un utilisateur
```bash
USER_ID="<uuid-de-alice>"

curl -X PATCH http://localhost:8000/api/v1/users/$USER_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["meeting.upload", "team.transcript.read", "team.pv.read"]}' | jq .
```

### Désactiver un compte utilisateur
```bash
curl -X PATCH http://localhost:8000/api/v1/users/$USER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' | jq .
```

---

## Étape 4 — Tester via l'interface admin

1. Se connecter en tant qu'administrateur sur `http://localhost:5173`
2. Naviguer vers **Admin → Utilisateurs**
3. Cliquer sur un utilisateur standard → le panneau de permissions se déploie
4. Les toggles doivent refléter les permissions actuelles en base
5. Activer/désactiver des permissions → cliquer **"Sauvegarder les permissions"**
6. Recharger la page → vérifier que les toggles sont dans le même état

---

## Étape 5 — Vérifier le contrôle d'accès

### Test : utilisateur sans permission d'upload
1. Se connecter avec `user@test.com` (sans `meeting.upload`)
2. Tenter d'accéder à la page d'upload
3. **Résultat attendu** : message d'accès refusé affiché, pas de redirection silencieuse

### Test : compte désactivé
1. Désactiver `user@test.com` via le panneau admin
2. Se déconnecter
3. Tenter de se connecter avec `user@test.com`
4. **Résultat attendu** : message `"Ce compte a été désactivé."` (HTTP 401)

---

## Lancer les tests

```bash
# Tests PHPUnit (backend)
cd Backend/
php bin/phpunit tests/Controller/UserControllerTest.php
php bin/phpunit tests/Security/ActiveUserCheckerTest.php
php bin/phpunit tests/Security/PermissionVoterTest.php

# Tests Vitest (frontend)
cd Frontend-Web/
npm run test -- UsersSection
```

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|---------------|---------|
| `500` sur `PATCH /permissions` | Clé inconnue envoyée | Vérifier que `app:seed:permissions` a bien été exécuté |
| Toggles tous désactivés malgré permissions en base | `GET /users` ne retourne pas `permissions` | Vérifier que `UserController::index()` inclut bien le champ `permissions` |
| HTTP 401 `account_disabled` en permanence | `isActive = false` en base | Réactiver via `PATCH /status` ou directement en SQL |
| Permission accordée mais accès refusé | `PermissionVoter` ne connaît pas la clé | Vérifier que la clé est dans `SUPPORTED_ATTRIBUTES` |
