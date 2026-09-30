# Feature Specification: Migration vers PostgreSQL

**Feature Branch**: `003-postgres-migration`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: Migration de mockData.js vers PostgreSQL via Doctrine ORM (Symfony/PostgreSQL 15)

## Clarifications

### Session 2026-04-01
- Q: Mécanisme d'intégration Flask → Symfony ? → A: Flask appelle un endpoint API Symfony dédié (WebHook/Push).
- Q: Stratégie de chargement des transcriptions ? → A: Chargement complet en 1 seule requête API, sans pagination.
- Q: Attributs de l'entité Meeting (Status) ? → A: In_Progress, Completed, Failed.
- Q: Gestion des données IA manquantes (compte-rendu nul) ? → A: Afficher un placeholder "Traitement IA en cours...".
- Q: Stratégie de chargement de la liste des réunions ? → A: Infinite scroll / "Voir plus" (API paginée, chargement par lots).
- Q: Stratégie de suppression des réunions ? → A: Soft Delete (marqué supprimé, conservé en base).


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultation des réunions archivées (Priority: P1)

En tant qu'utilisateur authentifié, je souhaite voir la liste de toutes mes réunions passées chargées depuis la base de données réelle, afin de garantir la persistance et la fiabilité de mes données.

**Why this priority**: C'est le cœur de métier de l'application. Sans persistance réelle, l'outil n'est qu'une démonstration éphémère.

**Independent Test**: Peut être testé en insérant une ligne dans la table `meeting` de PostgreSQL et en vérifiant qu'elle apparaît dans la bibliothèque d'archives du Frontend.

**Acceptance Scenarios**:

1. **Given** une base de données PostgreSQL contenant 5 réunions, **When** j'accède à la page "Bibliothèque d'archives", **Then** je vois exactement 5 cartes de réunion avec les titres et dates corrects.
2. **Given** un arrêt/relance du serveur, **When** je rafraîchis la page, **Then** les données restent identiques (preuve de persistance).

---

### User Story 2 - Accès aux détails et transcriptions (Priority: P1)

En tant qu'utilisateur, je souhaite cliquer sur une réunion pour voir son compte-rendu et sa transcription intégrale, chargés dynamiquement depuis PostgreSQL via l'API Symfony.

**Why this priority**: Essentiel pour la valeur ajoutée de l'IA qui génère ces données ; elles doivent être stockées de manière structurée.

**Independent Test**: Vérifier que l'appel API `/api/v1/meetings/{id}` renvoie les objets liés (Summary, TranscriptSegments) sans passer par les intercepteurs de mock.

**Acceptance Scenarios**:

1. **Given** une réunion avec une transcription de 10 segments en base, **When** j'ouvre le détail de la réunion, **Then** les 10 segments s'affichent avec les bons auteurs.

---

### User Story 3 - Suppression des simulations (Priority: P2)

En tant que développeur, je veux que l'application Frontend n'ait plus aucune trace de `mockData.js` dans ses appels réseaux, afin d'épurer le code et de garantir que toute donnée vue est "vraie".

**Why this priority**: Dette technique et clarté de l'architecture.

**Independent Test**: Désactiver totalement le fichier `mockData.js` et vérifier qu'aucune erreur 404/500 n'apparaît sur les parcours nominaux.

**Acceptance Scenarios**:

1. **Given** la suppression des intercepteurs Axios dans `api.js`, **When** je navigue dans l'app, **Then** toutes les requêtes aboutissent au backend Symfony.

---

### Edge Cases

- **Données IA manquantes** : Si le compte-rendu (Summary) ou les segments ne sont pas encore générés (champ null en base parce que le `Status` est `In_Progress`), le Frontend affiche un placeholder "Traitement IA en cours...".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT persister l'entité `Meeting` (titre, date, durée, participants) dans PostgreSQL.
- **FR-002**: Le système DOIT lier chaque `Meeting` à une ou plusieurs entités `TranscriptSegment`.
- **FR-003**: Le système DOIT stocker le `Summary` (Compte-rendu) généré par l'IA en format structuré (JSON ou Markdown) lié à la réunion.
- **FR-004**: L'API Symfony DOIT exposer des endpoints REST pour le CRUD complet de ces entités.
- **FR-005**: Le Frontend DOIT supprimer tous les `adapter` Axios simulant ces données.
- **FR-006**: Le système DOIT supporter le chargement asynchrone des analyses comportementales (Analytics) depuis la base réelle.
- **FR-007**: L'API Symfony DOIT renvoyer l'intégralité des segments de transcription d'une réunion au sein d'une seule et unique requête (sans pagination).
- **FR-008**: L'API Symfony DOIT permettre la pagination (via offset/limit ou similaire) de la liste des réunions pour supporter l'infinite scroll du Frontend.
- **FR-009**: Le système DOIT implémenter une stratégie de "Soft Delete" pour l'entité `Meeting`.

### Key Entities

- **Meeting**: Représente une session enregistrée. Attributs : UUID, Title, StartAt, Duration, Status (In_Progress, Completed, Failed), DeletedAt (nullable).
- **TranscriptSegment**: Un fragment de parole. Attributs : MeetingID, SpeakerName, Content, Timestamp.
- **Summary**: Le résultat de l'analyse IA. Attributs : MeetingID, content (JSONB), Version, Type (PV, Synthèse).
- **AnalyticData**: Métriques sur la réunion. Attributs : MeetingID, Key (ex: "tempo"), Value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% des appels API de données métier dans la console Network pointent vers `localhost:8000` (Symfony) et non des mocks internes.
- **SC-002**: Le temps de chargement initial de la bibliothèque (50 réunions) est inférieur à 500ms (hors latence réseau réelle).
- **SC-003**: Zéro régression visuelle par rapport à la version simulée.
- **SC-004**: Toutes les données saisies manuellement (ex: modifications de compte-rendu) sont persistées après rafraîchissement.

## Assumptions

- Les schémas de données Symfony correspondront exactement aux structures JSON attendues par le Frontend existant pour minimiser les changements UI.
- L'authentification JWT est déjà active et sera utilisée pour filtrer les réunions par utilisateur/organisation.
- Les données AI générées par Flask (transcriptions, résumés) seront poussées vers PostgreSQL en appelant des endpoints API REST dédiés sur le backend Symfony.
