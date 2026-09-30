# Implementation Plan: Gestion des Permissions Utilisateurs Standards

**Branch**: `007-user-permissions-backend` | **Date**: 2026-05-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-user-permissions-backend/spec.md`

## Summary

Connecter le panneau de gestion des permissions utilisateurs (déjà existant côté UI dans `UsersSection.tsx`) au backend Symfony/PostgreSQL. La feature comprend : (1) l'ajout de 9 clés de permission granulaires dans le `PermissionVoter`, (2) deux nouveaux endpoints backend (`PATCH /users/{id}/permissions` et `PATCH /users/{id}/status`), (3) une vérification `isActive` à chaque requête authentifiée, (4) le remplacement du store en mémoire du frontend par de vrais appels API.

## Technical Context

**Language/Version**: PHP 8.1+ (Symfony 7) · TypeScript/TSX (React 18, Vite 5)  
**Primary Dependencies**: LexikJWTAuthenticationBundle, Doctrine ORM, framer-motion (existant)  
**Storage**: PostgreSQL 15+ via Doctrine ORM (schéma inchangé)  
**Testing**: PHPUnit (backend) · Vitest + Testing Library (frontend)  
**Target Platform**: Serveur Linux (backend) · Navigateur moderne (frontend)  
**Project Type**: Web application fullstack (React + Symfony + Flask)  
**Performance Goals**: Sauvegarde des permissions < 3s (SC-004), chargement initial < 2s  
**Constraints**: Aucune migration de schéma DB requise · Pas de mécanisme push temps réel  
**Scale/Scope**: Équipe de ~10-100 utilisateurs standards par organisation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Notes |
|----------|--------|-------|
| I. Service Isolation | ✅ PASS | La gestion des permissions est 100% dans Symfony. Flask non impliqué. |
| II. API-First Design | ✅ PASS | Contrats documentés dans `contracts/user-permissions-api.md` avant implémentation. |
| III. Security by Default | ✅ PASS | Tous les endpoints protégés JWT + ROLE_ADMIN. Vérification `isActive` à chaque requête. |
| IV. Data Ownership | ✅ PASS | PostgreSQL est source de vérité. Aucune migration schéma (relation déjà existante). |
| V. Observability | ⚠️ REQUIRED | Symfony DOIT logger les permission denials et les changements de permissions (admin audit). |
| VI. Test Coverage | ✅ REQUIRED | PHPUnit pour `UserController` (nouveaux endpoints) · Vitest pour `UsersSection.tsx`. |
| VII. Simplicity (YAGNI) | ✅ PASS | Pas de nouvelles abstractions. Réutilise `PermissionVoter`, `UserController`, `UsersSection.tsx` existants. |

> ⚠️ **Observability**: Ajouter logging structuré des events de permission change dans `UserController` (principe V).

## Project Structure

### Documentation (this feature)

```text
specs/007-user-permissions-backend/
├── plan.md              ← Ce fichier
├── research.md          ← Phase 0 (complété)
├── data-model.md        ← Phase 1 (complété)
├── quickstart.md        ← Phase 1 (complété)
├── contracts/
│   └── user-permissions-api.md  ← Phase 1 (complété)
└── tasks.md             ← Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
Backend/
├── src/
│   ├── Command/
│   │   └── SeedPermissionsCommand.php          [NEW] Insère les 9 clés Permission en base
│   ├── Controller/
│   │   └── UserController.php                  [MODIFY] +patchPermissions(), +patchStatus()
│   ├── EventListener/
│   │   └── ActiveUserChecker.php               [NEW] Vérifie isActive à chaque requête JWT
│   ├── Security/
│   │   └── PermissionVoter.php                 [MODIFY] +9 nouvelles clés granulaires
│   └── Service/
│       └── UserService.php                     [MODIFY] +updatePermissions(), +setActiveStatus()
│
Frontend-Web/
├── src/
│   ├── pages/Admin/
│   │   ├── hooks/
│   │   │   ├── useAdminStore.ts                [MODIFY] Remplacer données fictives par API calls
│   │   │   └── useAdminApi.ts                  [NEW] Service HTTP admin (getUsers, updatePerms, toggleActive)
│   │   └── components/sections/
│   │       └── UsersSection.tsx                [MODIFY] Brancher sur useAdminApi + états loading/error
│   └── types/
│       └── index.ts (ou admin/types.ts)        [MODIFY] Ajouter type Permission keys mapping
```

**Structure Decision**: Web application (Option 2) — backend Symfony + frontend React séparés. Aucun nouveau service.

## Implementation Phases

### Phase A — Backend : Sécurité & Permissions (fondations)

**Objectif**: Rendre le backend opérationnel avant de toucher le frontend.

#### A1 — Étendre PermissionVoter
- Ajouter les 9 clés dans `SUPPORTED_ATTRIBUTES` de `PermissionVoter.php`
- Aucun autre changement (la logique de vérification est déjà générique)

#### A2 — Commande de seeding des permissions
- Créer `SeedPermissionsCommand` (`app:seed:permissions`) idempotente
- Insère les 9 entrées `Permission` en base si elles n'existent pas
- Doit s'exécuter en développement et production

#### A3 — ActiveUserChecker Event Listener
- Créer un `KernelEvents::REQUEST` listener (priorité haute)
- Après décodage JWT, récupérer l'utilisateur et vérifier `isActive`
- Si `false` → lancer `CustomUserMessageAuthenticationException` → HTTP 401 `{"error": "account_disabled"}`
- Logger l'événement (principe V constitution)

#### A4 — Nouveaux endpoints UserController
- `PATCH /api/v1/users/{id}/permissions` : remplace toutes les permissions de l'utilisateur
  - Valider que toutes les clés reçues existent en base
  - Bloquer si l'utilisateur cible est ROLE_ADMIN
  - Logger la modification (audit)
- `PATCH /api/v1/users/{id}/status` : modifie `isActive`
  - Bloquer si l'admin tente de se désactiver lui-même
  - Logger la modification (audit)
- Modifier `GET /api/v1/users` pour inclure `isActive` et `permissions` (tableau de clés)

#### A5 — UserService : nouvelles méthodes
- `updatePermissions(User $user, array $permissionKeys): void`
  - Vide la collection actuelle, recharge les entités `Permission` par clé, et les associe
- `setActiveStatus(User $user, bool $isActive): void`
  - Met à jour `isActive` + `updatedAt` et persiste

#### A6 — Tests PHPUnit
- `UserControllerTest` : tester `PATCH /permissions`, `PATCH /status`, et `GET /users` enrichi
- `ActiveUserCheckerTest` : vérifier que HTTP 401 est retourné pour un user inactif
- `PermissionVoterTest` : vérifier les 9 nouvelles clés

---

### Phase B — Frontend : Connexion API réelle

**Objectif**: Remplacer les données fictives par de vrais appels API.

#### B1 — Service adminApi.ts
- Créer `useAdminApi.ts` (hook ou service) avec :
  - `fetchUsers(): Promise<User[]>` → `GET /api/v1/users`
  - `savePermissions(userId, permissions: string[]): Promise<void>` → `PATCH /api/v1/users/{id}/permissions`
  - `toggleActiveStatus(userId, isActive: boolean): Promise<void>` → `PATCH /api/v1/users/{id}/status`
- Mapping frontend ↔ backend (9 clés) défini comme constante centralisée `PERMISSION_MAP`

#### B2 — Mise à jour useAdminStore
- Remplacer les données statiques fictives par des appels à `useAdminApi`
- Ajouter états : `loading`, `error`, `saving`
- Garder le cache local après chargement (pas de re-fetch systématique)

#### B3 — UsersSection.tsx : états UI
- Afficher un spinner pendant le chargement initial des permissions
- Afficher un feedback "Sauvegarde en cours..." puis "✓ Sauvegardé" / "✗ Erreur" après `handleSavePerms`
- Désactiver les toggles et le bouton pendant la sauvegarde

#### B4 — Protection des routes frontend
- Vérifier les permissions de l'utilisateur connecté avant d'afficher les pages protégées
- Si `isActive = false` détecté (401 reçu) → rediriger vers la page de connexion avec message explicatif

#### B5 — Tests Vitest
- `UsersSection.test.tsx` : mocker `useAdminApi`, tester états loading/error/success
- Tester que le bouton "Sauvegarder" est désactivé pendant la sauvegarde

---

### Phase C — Intégration & Validation

#### C1 — Seeder de données de test
- Créer 2-3 utilisateurs standards de test avec des permissions variées via la commande CLI

#### C2 — Test end-to-end manuel (selon quickstart.md)
- Activer une permission via le panneau admin → recharger → vérifier persistance
- Désactiver un compte → tenter connexion → vérifier rejet
- Tenter d'accéder à une page sans permission → vérifier message d'accès refusé

## Complexity Tracking

Aucune violation de la constitution. Pas de nouvelle abstraction non justifiée.
