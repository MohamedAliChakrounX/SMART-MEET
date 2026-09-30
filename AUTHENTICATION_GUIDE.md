# Guide d'Authentification et Login

## 🔐 Créer un utilisateur de test

Exécutez cette commande Symfony:

```bash
cd Backend
php bin/console app:create-test-user
```

**Résultat attendu:**
```
✓ Test user created successfully!
  Email: test@example.com
  Password: password123
```

---

## 🚀 Se connecter via l'API

### Option 1: cURL (ligne de commande)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Réponse attendue:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

### Option 2: Postman

1. **Ouvrir Postman**
2. **Créer une requête POST**
   - URL: `http://localhost:8000/api/v1/auth/login`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```
3. **Cliquer Send**

### Option 3: Frontend React

Le frontend automatiquement:
1. Affiche une page de login
2. Vous pouvez entrer:
   - **Email**: `test@example.com`
   - **Password**: `password123`
3. Le token est sauvegardé automatiquement
4. Vous êtes connecté!

---

## 📋 Utiliser le token pour les requêtes suivantes

Une fois connecté, incluez le token dans les headers:

```bash
curl -X GET http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Dans Postman:
1. Allez dans l'onglet **Authorization**
2. Type: **Bearer Token**
3. Token: Collez le token reçu du login

---

## ✅ Vérifier que vous êtes connecté

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Réponse attendue:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "roles": ["ROLE_USER"],
  "firstName": "Test",
  "lastName": "User",
  "permissions": []
}
```

---

## 🆘 Troubleshooting

### Erreur: "Invalid credentials"
- Vérifiez l'email et le mot de passe
- Assurez-vous que l'utilisateur a été créé: `php bin/console app:create-test-user`

### Erreur: "Email and password are required"
- Vérifiez que vous envoyez `email` et `password` dans le JSON

### Erreur: 404 sur l'endpoint
- Vérifiez que le serveur Symfony tourne: `php -S localhost:8000 -t public`
- Vérifiez l'URL: doit être `http://localhost:8000/api/v1/auth/login`

---

## 🔄 Workflow complet

```bash
# 1. Créer l'utilisateur de test
php bin/console app:create-test-user

# 2. Se connecter et récupérer le token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# 3. Utiliser le token pour requêtes API
curl -X GET http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer $TOKEN"

# 4. Vérifier les infos utilisateur
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Notes importantes

- Le token expire après **1 heure** (configurable)
- Stockez le token dans le localStorage du navigateur (frontend)
- Ne passez JAMAIS le token en URL (seulement en header)
- En production, utilisez HTTPS pour protéger les tokens
