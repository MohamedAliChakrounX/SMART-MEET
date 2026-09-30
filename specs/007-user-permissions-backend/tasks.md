# Tasks: Gestion des Permissions Utilisateurs Standards

**Input**: Design documents from `/specs/007-user-permissions-backend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/user-permissions-api.md, quickstart.md

**Tests**: Non explicitement demandés dans la spec. Inclus dans la phase Polish comme optionnels.

**Organization**: Tâches groupées par user story pour permettre l'implémentation et le test indépendants de chaque story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut s'exécuter en parallèle (fichiers différents, pas de dépendances)
- **[Story]**: User story associée (US1, US2, US3)
- Chemins de fichiers exacts inclus dans chaque description

## Path Conventions

- **Backend**: `Backend/src/` (Symfony)
- **Frontend**: `Frontend-Web/src/` (React/Vite)

---

## Phase 1: Setup (Infrastructure Partagée)

**Purpose**: Peupler les données de référence et préparer le terrain.

- [x] T001 Créer la commande `SeedPermissionsCommand` pour insérer les 9 clés de permission en base dans `Backend/src/Command/SeedPermissionsCommand.php`
- [x] T002 Exécuter `php bin/console app:seed:permissions` et vérifier que les 9 entrées existent dans la table `permission`

---

## Phase 2: Foundational (Prérequis Bloquants)

**Purpose**: Sécurité de base — doit être complété avant toute user story.

**⚠️ CRITICAL**: Aucune tâche de user story ne peut commencer sans cette phase.

- [x] T003 Créer le listener `ActiveUserChecker` qui vérifie `isActive` à chaque requête JWT dans `Backend/src/EventListener/ActiveUserChecker.php`
- [x] T004 [P] Étendre `SUPPORTED_ATTRIBUTES` du `PermissionVoter` avec les 9 nouvelles clés dans `Backend/src/Security/PermissionVoter.php`
- [x] T005 [P] Ajouter les méthodes `updatePermissions()` et `setActiveStatus()` dans `Backend/src/Service/UserService.php`
- [x] T006 Créer le fichier de mapping des permissions frontend↔backend comme constante `PERMISSION_MAP` dans `Frontend-Web/src/pages/Admin/data/permissionMap.ts`

**Checkpoint**: Fondations prêtes — l'implémentation des user stories peut commencer.

---

## Phase 3: User Story 1 — L'administrateur configure les permissions d'un utilisateur standard (Priority: P1) 🎯 MVP

**Goal**: L'admin peut activer/désactiver les 9 permissions d'un utilisateur standard et les persister en base de données via le panneau à toggles.

**Independent Test**: (1) Ouvrir le panneau admin, (2) activer une permission pour un utilisateur, (3) cliquer "Sauvegarder", (4) recharger la page, (5) vérifier que la permission est toujours active.

### Implementation for User Story 1

- [x] T007 [US1] Ajouter l'endpoint `patchPermissions()` (`PATCH /api/v1/users/{id}/permissions`) dans `Backend/src/Controller/UserController.php`
- [x] T008 [US1] Enrichir la réponse de `GET /api/v1/users` avec les champs `permissions` (tableau de clés) et `isActive` dans `Backend/src/Controller/UserController.php`
- [x] T009 [US1] Ajouter la validation des clés de permission et le blocage de modification des comptes ROLE_ADMIN dans `Backend/src/Controller/UserController.php`
- [x] T010 [US1] Ajouter le logging structuré (audit) des modifications de permissions dans `Backend/src/Controller/UserController.php`
- [x] T011 [P] [US1] Créer le hook `useAdminApi.ts` avec `fetchUsers()` et `savePermissions()` dans `Frontend-Web/src/pages/Admin/hooks/useAdminApi.ts`
- [x] T012 [US1] Modifier `useAdminStore.ts` pour remplacer les données fictives `users` et `permissions` par des appels à `useAdminApi` dans `Frontend-Web/src/pages/Admin/hooks/useAdminStore.ts`
- [x] T013 [US1] Modifier `UsersSection.tsx` pour brancher `handleSavePerms` sur `savePermissions()` et afficher les états loading/saving/error dans `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`

**Checkpoint**: L'admin peut sauvegarder et charger les permissions réelles. User Story 1 est fonctionnelle et testable indépendamment.

---

## Phase 4: User Story 2 — L'administrateur active un compte utilisateur standard (Priority: P2)

**Goal**: L'admin peut activer/désactiver un compte utilisateur standard via le panneau de gestion, empêchant l'utilisateur de se connecter.

**Independent Test**: (1) Désactiver un utilisateur via le panneau admin, (2) se déconnecter, (3) tenter de se connecter avec cet utilisateur, (4) vérifier que la connexion est rejetée.

### Implementation for User Story 2

- [x] T014 [US2] Ajouter l'endpoint `patchStatus()` (`PATCH /api/v1/users/{id}/status`) dans `Backend/src/Controller/UserController.php`
- [x] T015 [US2] Ajouter la validation anti-auto-désactivation et le logging dans `Backend/src/Controller/UserController.php`
- [x] T016 [US2] Ajouter `toggleActiveStatus()` dans `useAdminApi.ts` dans `Frontend-Web/src/pages/Admin/hooks/useAdminApi.ts`
- [x] T017 [US2] Ajouter un toggle `isActive` dans la ligne utilisateur de `UsersSection.tsx` branché sur `toggleActiveStatus()` dans `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`
- [x] T018 [US2] Gérer le HTTP 401 `account_disabled` dans l'intercepteur Axios pour rediriger vers la page de connexion dans `Frontend-Web/src/services/api.js`

**Checkpoint**: L'admin peut activer/désactiver des comptes. User Stories 1 ET 2 sont fonctionnelles indépendamment.

---

## Phase 5: User Story 3 — L'état des permissions est chargé depuis le backend au démarrage (Priority: P3)

**Goal**: Lorsque l'admin ouvre le panneau utilisateurs, les toggles reflètent exactement les permissions stockées en base de données (pas de données fictives).

**Independent Test**: (1) Assigner des permissions via l'API directement, (2) ouvrir le panneau admin, (3) vérifier que les toggles correspondent aux permissions définies.

### Implementation for User Story 3

- [x] T019 [US3] S'assurer que `useAdminStore.ts` charge les utilisateurs au montage du composant (useEffect initial) dans `Frontend-Web/src/pages/Admin/hooks/useAdminStore.ts`
- [x] T020 [US3] Afficher un skeleton/spinner dans `UsersSection.tsx` pendant le chargement initial des données dans `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`
- [x] T021 [US3] Transformer la réponse API `permissions: string[]` en objet `UserPermissions` (9 booléens) via `PERMISSION_MAP` dans `Frontend-Web/src/pages/Admin/hooks/useAdminStore.ts`
- [x] T022 [US3] Afficher un état d'erreur avec bouton de retry si le chargement initial échoue dans `Frontend-Web/src/pages/Admin/components/sections/UsersSection.tsx`

**Checkpoint**: Toutes les user stories sont fonctionnelles. Les données affichées correspondent à 100% aux données en base.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Améliorations transversales et validation finale.

- [x] T023 [P] Vérifier la protection des routes frontend : bloquer l'accès upload pour les utilisateurs sans `meeting.upload` dans `Frontend-Web/src/components/PrivateRoute.jsx`
- [x] T024 [P] Ajouter un message d'accès refusé dans la page upload pour les utilisateurs non autorisés dans `Frontend-Web/src/pages/Upload/Upload.jsx`
- [x] T025 Exécuter le guide `quickstart.md` complet et valider tous les scénarios de test
- [x] T026 [P] Nettoyer les données fictives restantes dans `useAdminStore.ts` (supprimer les arrays mockés) dans `Frontend-Web/src/pages/Admin/hooks/useAdminStore.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Pas de dépendances — peut démarrer immédiatement
- **Foundational (Phase 2)**: Dépend de Setup (T001/T002 pour les clés en base)
- **User Stories (Phase 3-5)**: Toutes dépendent de la phase Foundational
  - US1 → peut démarrer dès la fin de Phase 2
  - US2 → peut démarrer en parallèle de US1 (fichiers différents côté backend, mais partage `UserController` — séquentiel recommandé)
  - US3 → dépend partiellement de US1 (le store doit déjà être connecté à l'API)
- **Polish (Phase 6)**: Dépend de la complétion de US1, US2, US3

### User Story Dependencies

- **User Story 1 (P1)**: Indépendante — peut démarrer dès la fin de Phase 2
- **User Story 2 (P2)**: Indépendante du côté backend, mais partage `UserController.php` avec US1 — séquentiel recommandé
- **User Story 3 (P3)**: Dépend du store API créé dans US1 (T011/T012), mais le chargement initial peut être ajouté en parallèle

### Within Each User Story

- Backend d'abord (endpoints), puis Frontend (API hook → store → UI)
- Les tâches marquées [P] dans une même story peuvent s'exécuter en parallèle

### Parallel Opportunities

- T004 et T005 et T006 peuvent s'exécuter en parallèle (Phase 2)
- T011 peut s'exécuter en parallèle de T007-T010 (frontend et backend indépendants)
- T023 et T024 et T026 peuvent s'exécuter en parallèle (Phase 6)

---

## Parallel Example: User Story 1

```bash
# Backend et Frontend en parallèle :
# Dev Backend → T007, T008, T009, T010 (séquentiel dans UserController)
# Dev Frontend → T011 (useAdminApi — indépendant du backend)

# Puis séquentiel :
# T012 (store branchement — dépend de T011)
# T013 (UI branchement — dépend de T012)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Compléter Phase 1: Setup (seeder les permissions)
2. Compléter Phase 2: Foundational (voter, listener, service)
3. Compléter Phase 3: User Story 1 (PATCH permissions + UI)
4. **STOP et VALIDER**: Tester la sauvegarde et le chargement des permissions
5. Démontrer le MVP

### Incremental Delivery

1. Setup + Foundational → Infrastructure prête
2. User Story 1 → Test indépendant → **MVP délivré** 🎯
3. User Story 2 → Test indépendant → Activation/désactivation comptes
4. User Story 3 → Test indépendant → Chargement initial fiable
5. Polish → Protection routes, nettoyage, validation complète

---

## Notes

- Les tâches T007-T010 et T014-T015 modifient le même fichier `UserController.php` — exécution séquentielle obligatoire
- Le mapping `PERMISSION_MAP` (T006) est un prérequis pour toute tâche frontend
- Commit après chaque tâche ou groupe logique
- S'arrêter à chaque checkpoint pour valider la story indépendamment
