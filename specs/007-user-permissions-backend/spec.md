# Feature Specification: Gestion des Permissions Utilisateurs Standards

**Feature Branch**: `007-user-permissions-backend`  
**Created**: 2026-05-01  
**Status**: Draft  
**Input**: User description: "Après avoir configuré l'administrateur, je souhaite activer les utilisateurs standards en leur attribuant des permissions personnalisées — connecter le panneau de permissions admin au backend PostgreSQL"

## Clarifications

### Session 2026-05-01

- Q: Comment structurer les clés de permission backend pour distinguer les niveaux Équipe/Département ? → A: Créer 9 clés granulaires distinctes : `meeting.upload`, `team.transcript.read`, `team.pv.read`, `team.analytics.self`, `team.analytics.others`, `dept.transcript.read`, `dept.pv.read`, `dept.analytics.self`, `dept.analytics.others`.
- Q: Quelles permissions par défaut pour un nouvel utilisateur standard ? → A: Aucune permission (tout désactivé). L'administrateur active manuellement les accès nécessaires (principe du moindre privilège).
- Q: Comment gérer la désactivation d'un utilisateur actuellement connecté ? → A: Invalidation à la prochaine requête API. Le backend vérifie `isActive` à chaque appel authentifié et rejette la requête si le compte est inactif.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'administrateur configure les permissions d'un utilisateur standard (Priority: P1)

Un administrateur, depuis le tableau de bord d'administration, sélectionne un utilisateur standard existant et active ou désactive ses permissions individuelles via un panneau à bascules (toggles). Il dispose de 9 permissions configurables réparties en trois catégories : Upload de Meeting, Niveau Équipe (Transcriptions, PV, Analytics personnelle, Analytics des autres), et Niveau Département (Transcriptions, PV, Analytics personnelle, Analytics des autres). L'administrateur clique sur "Sauvegarder les permissions" et les modifications sont persistées immédiatement dans la base de données.

**Why this priority**: C'est le cœur de la fonctionnalité. Sans persistance des permissions, l'ensemble du contrôle d'accès est non fonctionnel. Cela débloque immédiatement la valeur métier de la gestion des rôles.

**Independent Test**: Peut être testé de manière autonome en : (1) sélectionnant un utilisateur standard dans le panneau admin, (2) activant une permission, (3) sauvegardant, (4) rechargant la page et vérifiant que la permission est toujours active.

**Acceptance Scenarios**:

1. **Given** un administrateur connecté sur le panneau de gestion des utilisateurs, **When** il clique sur un utilisateur standard pour déployer le panneau de permissions et active le toggle "Upload de Meeting", puis clique "Sauvegarder les permissions", **Then** les permissions mises à jour sont persistées en base de données et les toggles reflètent le bon état au prochain chargement de la page.
2. **Given** un administrateur qui désactive une permission précédemment active pour un utilisateur, **When** il sauvegarde, **Then** l'utilisateur concerné ne peut plus effectuer l'action correspondante dans son interface.
3. **Given** un utilisateur standard sans permission "Upload de Meeting", **When** il tente d'accéder à la page d'upload, **Then** l'accès lui est refusé et un message d'information est affiché.

---

### User Story 2 - L'administrateur active un compte utilisateur standard (Priority: P2)

Un administrateur souhaite rendre un utilisateur standard actif (ou inactif) depuis le panneau de gestion. Le statut `isActive` de l'utilisateur détermine si ce dernier peut se connecter et utiliser l'application. L'administrateur peut basculer ce statut directement dans la liste des utilisateurs.

**Why this priority**: Nécessaire pour contrôler l'accès global sans supprimer le compte. Permet d'activer de nouveaux comptes créés mais pas encore autorisés, et de suspendre temporairement un accès.

**Independent Test**: Peut être testé en désactivant un utilisateur actif, en se déconnectant, puis en tentant de se connecter avec cet utilisateur — la connexion doit échouer.

**Acceptance Scenarios**:

1. **Given** un utilisateur standard avec `isActive = false`, **When** l'administrateur active son compte depuis le panneau admin et sauvegarde, **Then** l'utilisateur peut se connecter à l'application.
2. **Given** un utilisateur standard connecté, **When** l'administrateur désactive son compte, **Then** la prochaine requête API de cet utilisateur est rejetée avec un message d'erreur, et l'interface le redirige vers la page de connexion.

---

### User Story 3 - L'état des permissions est chargé depuis le backend au démarrage (Priority: P3)

Lorsque l'administrateur ouvre le panneau de gestion des utilisateurs, les permissions actuellement enregistrées en base de données pour chaque utilisateur sont affichées dans les toggles. L'interface ne présente jamais de données fictives ou vides, mais l'état réel persisté.

**Why this priority**: Sans ce chargement initial, l'administrateur ne sait pas quelles permissions sont actives, ce qui rend le panneau de configuration inutilisable comme source de vérité.

**Independent Test**: Peut être testé en attribuant des permissions via un appel API direct, puis en ouvrant le panneau admin et en vérifiant que les toggles correspondent aux permissions définies.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec des permissions préalablement enregistrées, **When** l'administrateur ouvre le panneau de gestion des utilisateurs, **Then** les toggles reflètent exactement les permissions stockées en base de données.
2. **Given** un utilisateur sans aucune permission assignée, **When** le panneau de permissions de cet utilisateur est ouvert, **Then** tous les toggles sont désactivés.

---

### Edge Cases

- Que se passe-t-il si la sauvegarde des permissions échoue (erreur réseau ou serveur) ? → L'interface doit afficher un message d'erreur et ne pas considérer la sauvegarde comme réussie.
- Que se passe-t-il si un administrateur tente de modifier ses propres permissions ? → La modification doit être bloquée ou ignorée (les admins ont accès total par défaut).
- Que se passe-t-il si un utilisateur standard est connecté et que l'administrateur modifie ses permissions en temps réel ? → Les nouvelles restrictions s'appliquent à la prochaine requête API de l'utilisateur (vérification côté backend à chaque appel authentifié). Aucun mécanisme push temps réel n'est requis.
- Que se passe-t-il si l'équipe ou le département d'un utilisateur est `null` (non assigné) ? → Les sections "Niveau Équipe" et "Niveau Département" doivent s'afficher mais indiquer clairement qu'aucune équipe/département n'est configuré.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT charger les permissions réelles de chaque utilisateur standard depuis la base de données persistante lorsque l'administrateur ouvre le panneau de gestion des utilisateurs.
- **FR-002**: Le système DOIT permettre à l'administrateur de basculer individuellement chacune des 9 permissions suivantes pour un utilisateur donné : `canUploadMeeting`, `canViewTeamTranscription`, `canViewTeamPV`, `canViewTeamBehaviorAnalytics`, `canViewTeamOthersBehavior`, `canViewDeptTranscription`, `canViewDeptPV`, `canViewDeptBehaviorAnalytics`, `canViewDeptOthersBehavior`.
- **FR-003**: Le système DOIT persister les modifications de permissions dans la base de données lors du clic sur "Sauvegarder les permissions".
- **FR-004**: Le système DOIT mapper les 9 permissions frontend vers les 9 clés backend granulaires suivantes : `canUploadMeeting` → `meeting.upload`, `canViewTeamTranscription` → `team.transcript.read`, `canViewTeamPV` → `team.pv.read`, `canViewTeamBehaviorAnalytics` → `team.analytics.self`, `canViewTeamOthersBehavior` → `team.analytics.others`, `canViewDeptTranscription` → `dept.transcript.read`, `canViewDeptPV` → `dept.pv.read`, `canViewDeptBehaviorAnalytics` → `dept.analytics.self`, `canViewDeptOthersBehavior` → `dept.analytics.others`.
- **FR-005**: Le système DOIT refuser l'accès à une fonctionnalité protégée si l'utilisateur ne possède pas la permission correspondante, en lui affichant un message explicatif.
- **FR-006**: Le système DOIT permettre à l'administrateur de modifier le statut actif/inactif d'un utilisateur standard.
- **FR-007**: Le système DOIT retourner une réponse d'erreur lisible si la sauvegarde des permissions échoue, afin que l'interface puisse informer l'administrateur.
- **FR-008**: Le système DOIT empêcher un utilisateur inactif (`isActive = false`) de se connecter à l'application.
- **FR-009**: Le système DOIT exposer un point d'accès (endpoint) dédié à la mise à jour des permissions d'un utilisateur, accessible uniquement aux administrateurs.
- **FR-010**: L'interface DOIT afficher l'état de chargement et de sauvegarde des permissions afin d'informer l'administrateur de la progression.
- **FR-011**: Le système DOIT créer les nouveaux utilisateurs standards sans aucune permission activée par défaut. L'administrateur DOIT activer manuellement les accès nécessaires après la création du compte.
- **FR-012**: Le système DOIT vérifier le statut `isActive` de l'utilisateur à chaque requête API authentifiée et rejeter la requête avec un code d'erreur approprié si le compte est inactif.

### Key Entities

- **User** : Utilisateur du système. Attributs clés : `id`, `email`, `firstName`, `lastName`, `isActive`, `roles` (ROLE_USER ou ROLE_ADMIN). Possède une collection de `Permission`.
- **Permission** : Droit granulaire. Attributs clés : `id`, `key` (identifiant technique unique comme `meeting.create`), `description`. Associé à un ou plusieurs utilisateurs.
- **UserPermissions** (vue frontend) : Représentation des 9 permissions utilisateur sous forme de booléens nommés pour l'interface d'administration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'administrateur peut configurer les 9 permissions d'un utilisateur standard et les voir persister après un rechargement complet de la page, en moins de 5 secondes au total.
- **SC-002**: Un utilisateur standard dont la permission `canUploadMeeting` est désactivée ne peut pas accéder à la page d'upload — 100% des tentatives d'accès non autorisées sont bloquées.
- **SC-003**: Les toggles de permissions affichés dans le panneau admin correspondent à 100% aux permissions réellement enregistrées en base de données pour chaque utilisateur.
- **SC-004**: L'administrateur reçoit un retour visuel (succès ou erreur) dans un délai de 3 secondes après avoir cliqué sur "Sauvegarder les permissions".
- **SC-005**: Après désactivation d'un compte utilisateur par l'administrateur, cet utilisateur ne peut plus se connecter et toute tentative de connexion est rejetée immédiatement.

## Assumptions

- L'entité `Permission` et l'entité `User` sont déjà définies et liées dans la base de données (relation ManyToMany existante).
- Le `PermissionVoter` côté backend gère déjà la vérification des permissions granulaires ; il suffit de connecter les données.
- Le mapping entre les noms de permissions frontend (`canUploadMeeting`) et les clés backend (`meeting.create`) sera défini de manière centralisée côté frontend.
- Les 9 clés de permission backend sont définitivement : `meeting.upload`, `team.transcript.read`, `team.pv.read`, `team.analytics.self`, `team.analytics.others`, `dept.transcript.read`, `dept.pv.read`, `dept.analytics.self`, `dept.analytics.others`.
- L'interface frontend (UsersSection.tsx) existe déjà avec le bon design ; seule la couche de données (store) doit être connectée au vrai backend via des appels API.
- Le panneau de permissions n'est accessible qu'aux utilisateurs ayant le rôle `ROLE_ADMIN`.
- La gestion des équipes et départements associés à un utilisateur est hors périmètre de cette feature (déjà couverte par la spec 006).
