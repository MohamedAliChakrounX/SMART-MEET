# Feature Specification: Real Database Data Integration

**Feature Branch**: `005-real-db-data`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Les données utilisées doivent provenir de la base de données réelle (PostgreSQL) et non d'une base de données simulée (mock database). Toutes les vues du frontend doivent consommer les données via l'API Symfony réelle."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Overview Shows Real Meeting Data (Priority: P1)

Quand un admin ou un utilisateur clique sur une réunion depuis l'archive, la page Overview affiche les vraies informations de cette réunion : titre réel, date réelle, participants réels, et un aperçu de la transcription réelle (non les données fictives codées en dur).

**Why this priority**: C'est la première page que voit l'utilisateur après avoir sélectionné une réunion. Des données fictives ici brisent la confiance et rendent la fonctionnalité inutilisable en production.

**Independent Test**: Peut être testé en créant une réunion en base de données, la sélectionnant depuis l'archive, et vérifiant que la page Overview affiche exactement le titre, la date, les participants et un extrait de transcription correspondant à cette réunion.

**Acceptance Scenarios**:

1. **Given** une réunion avec le titre "Réunion budget Q4" existe en base, **When** l'utilisateur clique dessus dans l'archive, **Then** la page Overview affiche "Réunion budget Q4" comme titre et les participants réels.
2. **Given** aucune réunion n'est sélectionnée, **When** l'utilisateur accède à la page Overview directement, **Then** un message "Aucune réunion sélectionnée" est affiché avec un lien vers l'archive.
3. **Given** la transcription d'une réunion existe, **When** la page Overview est chargée, **Then** les 2-3 premiers segments de transcription réels sont affichés en aperçu.

---

### User Story 2 - Archive Library Lists Only Real Meetings (Priority: P2)

La bibliothèque d'archives affiche uniquement les réunions réelles provenant de la base de données PostgreSQL. Aucune donnée de démonstration ou fictive ne doit apparaître.

**Why this priority**: Les données fictives dans la liste des réunions peuvent amener les utilisateurs à croire que des réunions inexistantes sont archivées.

**Independent Test**: Peut être testé en vidant la base de données, vérifiant que la liste est vide, puis en créant une réunion et vérifiant qu'elle apparaît seule dans la liste.

**Acceptance Scenarios**:

1. **Given** aucune réunion n'existe en base, **When** l'utilisateur accède à l'archive, **Then** un message "Aucune réunion archivée" est affiché (pas de données fictives).
2. **Given** 5 réunions existent en base, **When** l'utilisateur accède à l'archive, **Then** exactement 5 réunions sont affichées avec leurs vraies métadonnées.

---

### User Story 3 - mockData.js File Not Used in Production Views (Priority: P3)

Le fichier `src/data/mockData.js` ne doit plus être importé ni référencé par aucune page de production (Overview, ArchiveLibrary, Transcription, RefineSummary, BehavioralAnalytics).

**Why this priority**: La suppression de toute dépendance aux données fictives garantit qu'aucune vue ne peut accidentellement afficher des données de démonstration.

**Independent Test**: Peut être validé par une recherche textuelle dans le code source — aucun fichier de page ne doit importer depuis `mockData.js`.

**Acceptance Scenarios**:

1. **Given** le code source des pages, **When** on cherche les imports de `mockData`, **Then** aucun résultat n'est trouvé dans les pages de production.

---

### Edge Cases

- Que se passe-t-il si l'API est indisponible ? → Afficher un état d'erreur avec possibilité de réessayer.
- Que se passe-t-il si la transcription d'une réunion est vide ? → Afficher "Transcription non disponible" dans l'aperçu.
- Que se passe-t-il si les analytics n'ont pas encore été générées ? → Afficher un état "En attente" avec un bouton pour déclencher la génération.
- Que se passe-t-il si le meeting ID dans le contexte ne correspond à aucune réunion en base ? → Rediriger vers l'archive avec un message d'erreur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La page Overview DOIT afficher le titre, la date, la durée, le lieu et les participants de la réunion active depuis l'API.
- **FR-002**: La page Overview DOIT afficher un aperçu des premiers segments de transcription depuis l'API.
- **FR-003**: La page Overview DOIT afficher les métriques comportementales (engagement, balance, etc.) depuis l'API quand disponibles.
- **FR-004**: Le fichier `mockData.js` NE DOIT PAS être importé dans les composants de page de production.
- **FR-005**: Toutes les pages DOIVENT afficher un loader pendant le chargement des données réelles.
- **FR-006**: Toutes les pages DOIVENT afficher un état d'erreur exploitable si l'API échoue.
- **FR-007**: Le contexte `MeetingContext` DOIT être la source unique de vérité pour les données de réunion courante.
- **FR-008**: Les données dans `localStorage` servent uniquement de cache temporaire (PV en cours d'édition), et non de source principale.

### Key Entities

- **Meeting**: Réunion avec id, titre, date, durée, lieu, participants, catégorie
- **Transcript**: Segments de transcription associés à une réunion (speaker, timeStart, timeEnd, text)
- **Summary / PV**: Résumé généré par l'IA associé à une réunion
- **Analytics**: Données comportementales générées par l'IA pour une réunion

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Aucune donnée fictive n'est visible pour les utilisateurs en production — 0 occurrence de noms fictifs ("Sarah M.", "Alex K.", "Q4 Product Strategy Review" hardcodés) dans les vues rendues.
- **SC-002**: Le temps d'affichage des données réelles depuis le chargement de la page ne dépasse pas 3 secondes dans des conditions normales.
- **SC-003**: 100% des pages de production ne contiennent aucun import de `mockData.js`.
- **SC-004**: Lorsqu'une réunion est sélectionnée dans l'archive, l'Overview affiche les données correctes dans 100% des cas.

## Assumptions

- Le backend Symfony expose déjà les endpoints `/api/v1/meetings/{id}`, `/api/v1/meetings/{id}/transcript`, et `/api/v1/meetings/{id}/analytics`.
- La migration PostgreSQL (spec 003) est déjà implémentée et les données sont persistées en base.
- `mockData.js` peut être conservé pour les tests unitaires mais ne doit plus être utilisé dans les composants de page.
- Le `MeetingContext` reste la solution de gestion d'état centralisée — aucun nouveau système d'état global n'est introduit.
