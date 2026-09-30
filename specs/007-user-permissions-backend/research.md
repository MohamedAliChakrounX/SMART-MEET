# Research: Gestion des Permissions Utilisateurs Standards

**Feature**: 007-user-permissions-backend  
**Date**: 2026-05-01

## Decision 1: Clés de permission dans PermissionVoter

**Decision**: Étendre les `SUPPORTED_ATTRIBUTES` du `PermissionVoter` avec les 9 nouvelles clés granulaires : `meeting.upload`, `team.transcript.read`, `team.pv.read`, `team.analytics.self`, `team.analytics.others`, `dept.transcript.read`, `dept.pv.read`, `dept.analytics.self`, `dept.analytics.others`.

**Rationale**: Le `PermissionVoter` existant (`Backend/src/Security/PermissionVoter.php`) vérifie déjà les permissions via `$permission->getKey() === $attribute`. Il suffit d'ajouter les nouvelles clés à la liste `SUPPORTED_ATTRIBUTES` et de peupler l'entité `Permission` en base avec ces clés.

**Alternatives considered**:
- Créer un second Voter spécialisé — rejeté (YAGNI, le Voter actuel est générique).
- Utiliser les rôles Symfony (`ROLE_TEAM_TRANSCRIPT`) — rejeté (les rôles sont globaux, pas utilisateur-spécifique).

---

## Decision 2: Pas de migration Doctrine nécessaire

**Decision**: Aucune migration de schéma n'est requise. La relation ManyToMany `User ↔ Permission` et l'entité `Permission` (`key`, `description`) existent déjà dans la base de données.

**Rationale**: Le code existant (`User.php` lignes 51-53, `Permission.php`) confirme la relation. Il faut uniquement insérer les 9 entrées `Permission` via un DataFixture ou une migration de données (pas de schéma).

**Alternatives considered**:
- Ajouter un champ JSON `permissions` sur `User` — rejeté (rompt la relation normalisée existante).

---

## Decision 3: Nouvel endpoint PATCH pour les permissions

**Decision**: Ajouter `PATCH /api/v1/users/{id}/permissions` dans `UserController`. Cet endpoint reçoit un tableau de clés de permissions actives et remplace l'ensemble des permissions de l'utilisateur (stratégie "replace all").

**Rationale**: La stratégie "replace all" est plus simple à implémenter et à tester qu'un diff incrémental. Le client envoie le tableau complet des permissions activées ; le serveur synchronise.

**Alternatives considered**:
- PUT avec l'utilisateur complet — rejeté (surcharge inutile).
- POST/DELETE individuels par permission — rejeté (nécessite N appels pour N toggles).

---

## Decision 4: Vérification `isActive` dans l'EventSubscriber JWT

**Decision**: Créer un `JWTAuthenticatedEvent` listener (ou utiliser le `CheckPassportListener` de Symfony Security) pour vérifier `isActive` après décodage du JWT. Si `isActive = false`, renvoyer HTTP 401 avec message `account_disabled`.

**Rationale**: Le JWT est stateless. La vérification à chaque requête via un listener Security Event est le pattern standard Symfony pour invalider des sessions sans révoquer les tokens individuellement.

**Alternatives considered**:
- Blacklist des tokens JWT — rejeté (complexité de stockage, pas nécessaire pour ce cas d'usage).
- Vérification dans chaque controller — rejeté (duplication, risque d'oubli).

---

## Decision 5: Chargement des permissions dans le store frontend

**Decision**: Remplacer les données fictives de `useAdminStore` par des appels API réels. Créer un service `adminApi.ts` qui expose `getUsers()`, `updateUserPermissions(userId, permissions[])` et `toggleUserActive(userId, isActive)`.

**Rationale**: L'architecture existante (Vite proxy → Symfony) permet d'appeler `/api/v1/users` directement. Le store devient un cache local des données backend.

**Alternatives considered**:
- React Query / SWR — déféré (YAGNI, le store existant est suffisant pour cette feature).

---

## Decision 6: Seeder des 9 clés Permission

**Decision**: Créer une commande Symfony `app:seed:permissions` qui insère les 9 entrées `Permission` en base si elles n'existent pas encore (idempotente).

**Rationale**: Les permissions doivent exister en base avant de pouvoir être assignées aux utilisateurs. Une commande CLI idempotente est plus flexible qu'une migration Doctrine (qui ne peut s'exécuter qu'une fois).

**Alternatives considered**:
- DataFixtures Doctrine — acceptable mais réservé aux tests. Une commande CLI est plus adaptée à l'environnement de production.
