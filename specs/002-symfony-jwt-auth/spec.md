# Feature Specification: Symfony Backend – Authentification JWT & Gestion des Rôles/Permissions

**Feature Branch**: `002-symfony-jwt-auth`
**Created**: 2026-03-31
**Status**: Draft
**Input**: User description: "Créer un backend avec Symfony incluant un système d'authentification sécurisé avec JWT, gestion des rôles Admin et Utilisateur standard, permissions granulaires, sécurisation des routes et API REST pour frontend React"

---

## Clarifications

### Session 2026-03-31

- Q: Comment le jeton d'accès est-il transmis dans les requêtes HTTP entre le frontend React et le backend ? → A: Via le header HTTP `Authorization: Bearer <token>` (standard REST).
- Q: Quel comportement doit adopter le système après des tentatives de connexion échouées répétées ? → A: Aucune protection (le système accepte un nombre illimité de tentatives).
- Q: Quel comportement le système doit-il adopter après une révocation de permission en session active ? → A: Effet immédiat (vérification DB/Cache à chaque requête).
- Q: Le système doit-il supporter plusieurs administrateurs et quelles sont les restrictions de suppression ? → A: Multi-admin supporté ; interdiction pour un admin de supprimer son propre compte.
- Q: Quelles sont les durées de validité des jetons d'accès et de renouvellement ? → A: Standard (Access: 1h / Refresh: 7j).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Authentification sécurisée (Priority: P1)

En tant qu'utilisateur (Admin ou Standard), je veux pouvoir me connecter avec mes identifiants (email + mot de passe) et recevoir un jeton d'accès sécurisé à durée limitée, afin d'interagir de manière sécurisée avec les services de l'application.

**Why this priority**: Sans authentification fonctionnelle, aucune autre fonctionnalité ne peut être testée ni utilisée. C'est le socle de toute l'architecture.

**Independent Test**: Peut être testé de manière isolée en appelant l'endpoint de connexion avec des identifiants valides et en vérifiant qu'un jeton est retourné, puis qu'un appel protégé avec ce jeton réussit.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec des identifiants valides, **When** il soumet ses informations de connexion, **Then** il reçoit un jeton d'accès valide et un jeton de renouvellement.
2. **Given** un utilisateur avec des identifiants incorrects, **When** il soumet ses informations, **Then** il reçoit un message d'erreur clair et aucun jeton n'est délivré.
3. **Given** un jeton d'accès expiré, **When** l'utilisateur tente d'accéder à une ressource protégée, **Then** il reçoit une réponse d'accès refusé l'invitant à se reconnecter ou à renouveler son jeton.
4. **Given** un jeton de renouvellement valide, **When** l'utilisateur demande un nouveau jeton d'accès, **Then** un nouveau jeton d'accès lui est délivré sans qu'il ait à se reconnecter.

---

### User Story 2 – Redirection post-connexion selon le rôle (Priority: P1)

En tant qu'utilisateur connecté, je veux être redirigé automatiquement vers l'interface correspondant à mon rôle (tableau de bord Admin ou interface Utilisateur standard), afin d'accéder directement à mes fonctionnalités sans navigation manuelle.

**Why this priority**: Le comportement de redirection conditionnel est une exigence fonctionnelle centrale décrite dans le cahier des charges.

**Independent Test**: Peut être testé indépendamment en vérifiant que la réponse d'authentification expose le rôle de l'utilisateur et l'URL de redirection cible, permettant au frontend de router correctement.

**Acceptance Scenarios**:

1. **Given** un utilisateur admin qui vient de se connecter, **When** l'authentification réussit, **Then** la réponse indique qu'il doit être redirigé vers l'interface d'administration.
2. **Given** un utilisateur standard qui vient de se connecter, **When** l'authentification réussit, **Then** la réponse indique qu'il doit être redirigé vers son tableau de bord personnel.

---

### User Story 3 – Gestion des utilisateurs par l'Admin (Priority: P2)

En tant qu'administrateur, je veux pouvoir créer, modifier, désactiver et supprimer des comptes utilisateurs, et leur attribuer des permissions spécifiques, afin de contrôler entièrement qui peut faire quoi dans l'application.

**Why this priority**: La gestion des utilisateurs est la raison d'être du rôle Admin. C'est une fonctionnalité clé mais qui dépend de l'authentification (P1).

**Independent Test**: Peut être testé en scénario isolé avec un compte admin : créer un utilisateur, lui attribuer des permissions, puis vérifier que cet utilisateur peut uniquement effectuer les actions autorisées.

**Acceptance Scenarios**:

1. **Given** un admin authentifié, **When** il crée un nouvel utilisateur avec un email et un rôle, **Then** le compte est créé et l'utilisateur peut se connecter.
2. **Given** un admin authentifié, **When** il attribue une permission spécifique (ex. : accès lecture aux réunions) à un utilisateur, **Then** cet utilisateur peut effectuer l'action correspondante et est bloqué pour toute action non accordée.
3. **Given** un admin authentifié, **When** il désactive un compte utilisateur, **Then** cet utilisateur ne peut plus se connecter.
4. **Given** un utilisateur standard non-admin, **When** il tente d'accéder aux endpoints de gestion des utilisateurs, **Then** il reçoit une réponse d'accès refusé.

---

### User Story 4 – Contrôle d'accès aux routes selon les permissions (Priority: P2)

En tant que système, je veux sécuriser toutes les routes de l'API de façon à ce que chaque ressource ne soit accessible qu'aux utilisateurs disposant des permissions requises, afin de garantir l'intégrité et la confidentialité des données.

**Why this priority**: La sécurisation des routes est un prérequis de confiance pour toute consommation de l'API par le frontend.

**Independent Test**: Peut être testé en tentant d'accéder à chaque route protégée avec : aucun jeton, un jeton valide sans permission, un jeton valide avec la permission requise.

**Acceptance Scenarios**:

1. **Given** une requête sans jeton d'authentification, **When** elle cible une route protégée, **Then** la réponse est un accès non autorisé (401).
2. **Given** un utilisateur authentifié sans la permission requise, **When** il accède à une route restreinte, **Then** la réponse est un accès interdit (403).
3. **Given** un utilisateur authentifié avec la permission adéquate, **When** il accède à la route correspondante, **Then** la ressource lui est retournée correctement.

---

### User Story 5 – Déconnexion sécurisée (Priority: P3)

En tant qu'utilisateur connecté, je veux pouvoir me déconnecter et invalider mon jeton, afin de protéger ma session en cas d'absence ou de fin d'utilisation.

**Why this priority**: La déconnexion est une bonne pratique de sécurité importante mais non bloquante pour les autres fonctionnalités.

**Independent Test**: Peut être testé en se déconnectant puis en réutilisant l'ancien jeton pour accéder à une ressource protégée (le jeton doit être refusé).

**Acceptance Scenarios**:

1. **Given** un utilisateur authentifié, **When** il appelle l'endpoint de déconnexion, **Then** son jeton est invalidé et tout usage ultérieur est rejeté.

---

### Edge Cases

- Que se passe-t-il si un utilisateur tente de créer un compte avec un email déjà existant ?
- Que se passe-t-il si l'admin tente de supprimer son propre compte ? → Action interdite par le système pour garantir la présence d'au moins un admin.
- Comment le système gère-t-il les tentatives de connexion répétées avec de mauvais identifiants ? → Le système accepte un nombre illimité de tentatives (aucune protection spécifique).
- Que se passe-t-il si un jeton est utilisé après que l'utilisateur a été désactivé par l'admin ?
- Que se passe-t-il si une permission est révoquée alors que l'utilisateur est déjà connecté ? → La modification est effective dès l'appel suivant (vérification systématique).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre à tout utilisateur de soumettre ses identifiants (email + mot de passe) pour obtenir un jeton d'accès et un jeton de renouvellement.
- **FR-002**: Le système DOIT valider les identifiants et refuser la connexion avec un message d'erreur explicite si les informations sont incorrectes.
- **FR-003**: Le système DOIT différencier deux types d'utilisateurs : **Admin** et **Utilisateur Standard**, et exposer ce rôle dans la réponse d'authentification.
- **FR-004**: Le système DOIT permettre le renouvellement du jeton d'accès à l'aide d'un jeton de renouvellement valide, sans nouvelle saisie d'identifiants.
- **FR-005**: L'Admin DOIT pouvoir créer, lire, modifier et désactiver des comptes utilisateurs.
- **FR-006**: L'Admin DOIT pouvoir attribuer, modifier et révoquer des permissions individuelles à chaque utilisateur (accès à des ressources, capacité à effectuer des actions).
- **FR-007**: Le système DOIT protéger chaque route de l'API en vérifiant la présence d'un jeton valide (transmis via le header HTTP `Authorization: Bearer <token>`) ET les permissions de l'utilisateur avant d'autoriser l'accès à la ressource.
- **FR-008**: Le système DOIT retourner une réponse 401 pour toute requête sans jeton ou avec un jeton invalide/expiré.
- **FR-009**: Le système DOIT retourner une réponse 403 pour toute requête d'un utilisateur authentifié ne disposant pas de la permission requise.
- **FR-010**: L'utilisateur standard DOIT uniquement pouvoir accéder aux ressources et effectuer les actions pour lesquelles une permission lui a été explicitement accordée.
- **FR-011**: Le système DOIT permettre à un utilisateur authentifié de se déconnecter et d'invalider son jeton actif.
- **FR-012**: Le système DOIT interdire à tout utilisateur non-admin l'accès aux endpoints de gestion des utilisateurs et des permissions.
- **FR-013**: Le système DOIT exposer une API REST consommable par un frontend (réponses JSON avec des codes HTTP standards, support CORS configurable). Les jetons sont transmis exclusivement via le header HTTP `Authorization: Bearer <token>`.

### Key Entities *(include if feature involves data)*

- **Utilisateur (User)**: Représente un compte dans le système. Attributs clés : identifiant unique, email, mot de passe (stocké hashé), rôle (Admin / Standard), statut (actif / désactivé), date de création.
- **Rôle (Role)**: Catégorie d'utilisateur déterminant le niveau d'accès global. Deux valeurs : Admin et Standard.
- **Permission**: Droit granulaire accordé à un utilisateur spécifique sur une ressource ou une action donnée. Attributs : identifiant unique, nom (ex. : `meeting.read`, `meeting.create`), description.
- **Jeton d'accès (Access Token)**: Jeton à durée de validité courte, transmis dans les en-têtes de chaque requête protégée.
- **Jeton de renouvellement (Refresh Token)**: Jeton à durée de validité plus longue, utilisé pour obtenir un nouveau jeton d'accès sans re-authentification.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur peut se connecter et recevoir ses jetons en moins de 2 secondes dans des conditions réseaux normales.
- **SC-002**: 100% des routes protégées rejettent les requêtes non authentifiées (pas de fuite de données non intentionnelle).
- **SC-003**: Un utilisateur standard sans permissions supplémentaires ne peut accéder à aucune ressource restreinte – taux de blocage non autorisé de 100%.
- **SC-004**: L'admin peut créer un utilisateur et lui attribuer des permissions en moins de 5 étapes d'interaction avec l'API.
- **SC-005**: 95% des actions d'authentification ou de vérification d'accès sont complétées en moins de 500ms côté serveur.
- **SC-006**: Le frontend React peut consommer l'API sans erreurs de politique d'origine croisée (CORS) dans un environnement de développement local standard.
- **SC-007**: Après désactivation d'un compte par l'admin, l'utilisateur concerné ne peut plus obtenir de nouveau jeton dans les 60 secondes suivant la désactivation.

---

## Assumptions

- Les utilisateurs accèdent au système via un navigateur web utilisant le frontend React de l'application Meeting-IA.
- Les durées de validité des jetons sont confirmées : courte pour le jeton d'accès (1 heure), longue pour le jeton de renouvellement (7 jours).
- Le système de permissions est granulaire par utilisateur : les permissions sont attribuées directement à l'utilisateur, pas uniquement via son rôle (le rôle Admin confère tous les droits par défaut, l'utilisateur Standard n'a que les permissions explicitement accordées).
- L'invalidation du jeton lors de la déconnexion est gérée par une liste de blocage côté serveur ou une stratégie équivalente (les jetons expirés naturellement ne nécessitent pas d'invalidation explicite).
- La gestion des mots de passe oubliés (réinitialisation par email) est hors périmètre de cette spécification.
- L'inscription publique (auto-enregistrement) est hors périmètre : seul l'admin peut créer des comptes utilisateurs.
- Le backend est destiné à être découplé du frontend et consommé exclusivement via son API REST.
- Les données de l'application existante (réunions, transcriptions) se trouvent déjà dans une base de données partagée avec laquelle ce module doit coexister sans conflit.
