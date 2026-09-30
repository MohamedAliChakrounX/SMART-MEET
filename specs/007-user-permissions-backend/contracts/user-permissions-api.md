# API Contract: User Permissions Management

**Feature**: 007-user-permissions-backend  
**Base URL**: `/api/v1`  
**Auth**: Bearer JWT (ROLE_ADMIN requis pour tous les endpoints)

---

## GET /users

Récupère la liste de tous les utilisateurs avec leurs permissions actuelles.

**Request**
```http
GET /api/v1/users
Authorization: Bearer <jwt>
```

**Response 200**
```json
[
  {
    "id": "uuid",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Dupont",
    "roles": ["ROLE_USER"],
    "isActive": true,
    "teamId": "uuid-or-null",
    "permissions": [
      "meeting.upload",
      "team.transcript.read",
      "team.pv.read"
    ]
  }
]
```

> ✅ Endpoint existant — ajouter `isActive` et `permissions` (clés backend) dans la réponse.

---

## PATCH /users/{id}/permissions

Remplace l'ensemble des permissions d'un utilisateur standard.

**Request**
```http
PATCH /api/v1/users/{id}/permissions
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "permissions": [
    "meeting.upload",
    "team.transcript.read",
    "team.pv.read"
  ]
}
```

**Response 200**
```json
{
  "userId": "uuid",
  "permissions": [
    "meeting.upload",
    "team.transcript.read",
    "team.pv.read"
  ]
}
```

**Response 400** — Clé de permission inconnue
```json
{ "error": "Unknown permission key: 'invalid.key'" }
```

**Response 403** — Tentative de modification des permissions d'un admin
```json
{ "error": "Cannot modify permissions of an administrator account." }
```

**Response 404** — Utilisateur introuvable
```json
{ "error": "User not found." }
```

---

## PATCH /users/{id}/status

Active ou désactive un compte utilisateur.

**Request**
```http
PATCH /api/v1/users/{id}/status
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "isActive": false
}
```

**Response 200**
```json
{
  "userId": "uuid",
  "isActive": false
}
```

**Response 403** — Tentative de désactivation de son propre compte
```json
{ "error": "Cannot deactivate your own account." }
```

**Response 404** — Utilisateur introuvable
```json
{ "error": "User not found." }
```

---

## POST /users (existing)

**Changement**: Les nouveaux utilisateurs sont créés avec `permissions: []` et `isActive: true` par défaut (le champ `isActive` était déjà present mais non exposé dans la réponse).

**Response 201** — inchangé, pas de permissions dans la réponse de création.

---

## Comportement de sécurité

| Situation | Code HTTP | Message |
|-----------|-----------|---------|
| JWT valide, `isActive = false` | 401 | `{"error": "account_disabled"}` |
| JWT invalide / expiré | 401 | standard LexikJWT |
| Accès sans permission requise | 403 | `{"error": "Access denied."}` |
| Admin accédant à une ressource protégée | 200 | bypass PermissionVoter |
