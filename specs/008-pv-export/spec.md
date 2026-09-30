# Feature Specification: Export de Procès-Verbal de Réunion

**Feature Branch**: `008-pv-export`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Export de Procès-Verbal de Réunion SmartMeet vers PDF, Word et Excel"

## Clarifications

### Session 2026-05-08

- Q: Quel niveau de contrôle d'accès pour l'export ? → A: L'export suit exactement les mêmes droits que la consultation du PV (permissions existantes, aucun rôle supplémentaire requis)
- Q: Que faire de l'option CSV déjà présente dans le frontend ? → A: Garder CSV en plus de Excel — 4 formats disponibles : PDF, DOC, CSV, Excel
- Q: Comportement UX pendant la génération du fichier ? → A: Le bouton Download affiche un spinner pendant la génération, le téléchargement se déclenche automatiquement à la fin
- Q: Que faire si le PV est partiellement généré (certaines sections vides) ? → A: Exporter avec les sections disponibles ; les sections sans données affichent "Non renseigné"
- Q: Quel contenu pour le CSV par rapport à l'Excel ? → A: Le CSV exporte uniquement le tableau des actions à mener (responsable, description, échéance, statut)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Télécharger le PV en PDF (Priority: P1)

Un utilisateur consulte la liste de ses réunions archivées dans SmartMeet. Il clique sur le bouton de téléchargement d'une réunion, sélectionne le format PDF, et reçoit immédiatement un fichier PDF structuré contenant l'intégralité du Procès-Verbal de la réunion.

**Why this priority**: Le PDF est le format officiel le plus utilisé pour la diffusion de documents légaux et administratifs. C'est la première attente des utilisateurs qui souhaitent partager ou archiver un PV.

**Independent Test**: Peut être testé entièrement en cliquant sur "Télécharger → PDF" depuis la page ArchiveLibrary et en vérifiant que le fichier téléchargé contient toutes les sections du PV avec le bon contenu.

**Acceptance Scenarios**:

1. **Given** une réunion avec un PV généré, **When** l'utilisateur clique sur Télécharger → PDF, **Then** un fichier PDF nommé `PV_[titre]_[date].pdf` est téléchargé en moins de 10 secondes
2. **Given** le PDF téléchargé, **When** l'utilisateur l'ouvre, **Then** il contient toutes les sections : informations générales, résumé exécutif, participants, points abordés, actions à mener
3. **Given** une réunion sans PV généré, **When** l'utilisateur tente de télécharger, **Then** un message explicite indique que le PV n'est pas encore disponible

---

### User Story 2 - Télécharger le PV en Word (.docx) (Priority: P2)

Un utilisateur souhaite modifier le PV après téléchargement pour y apporter des corrections manuelles. Il sélectionne le format Word et obtient un fichier `.docx` éditable avec la même structure et le même contenu que le PDF.

**Why this priority**: Le format Word permet l'édition post-export, ce qui est une nécessité courante pour les secrétaires de réunion qui doivent valider ou ajuster le contenu avant diffusion officielle.

**Independent Test**: Peut être testé en téléchargeant le `.docx` et en l'ouvrant dans Microsoft Word ou LibreOffice Writer pour vérifier la structure et la possibilité d'édition.

**Acceptance Scenarios**:

1. **Given** une réunion avec un PV, **When** l'utilisateur choisit Télécharger → DOC, **Then** un fichier `.docx` valide est téléchargé
2. **Given** le fichier Word téléchargé, **When** l'utilisateur l'ouvre, **Then** toutes les sections sont présentes, le document est éditable et la mise en forme correspond au template officiel
3. **Given** le fichier Word, **When** l'utilisateur modifie du contenu, **Then** la structure globale du document reste intacte

---

### User Story 3 - Télécharger le PV en Excel (.xlsx) (Priority: P3)

Un chef de projet souhaite analyser les actions à mener et les points abordés dans un tableur. Il sélectionne le format Excel et obtient un fichier `.xlsx` organisé selon le template de référence (Classeur1.xlsx) avec des sections claires pour chaque partie du PV.

**Why this priority**: L'export Excel permet une analyse quantitative des actions, un suivi de leur avancement, et une intégration dans d'autres outils de gestion de projet.

**Independent Test**: Peut être testé en téléchargeant le `.xlsx` et en vérifiant que les données sont correctement tabulées et correspondent au template de référence.

**Acceptance Scenarios**:

1. **Given** une réunion avec un PV, **When** l'utilisateur choisit Télécharger → Excel, **Then** un fichier `.xlsx` valide est téléchargé
2. **Given** le fichier Excel ouvert, **When** l'utilisateur navigue dans le document, **Then** les informations sont organisées selon le template fourni (Classeur1.xlsx) : en-tête, tableau participants, points abordés, actions
3. **Given** le fichier Excel, **When** l'utilisateur filtre les actions par responsable, **Then** les colonnes permettent ce tri sans modification préalable

---

### Edge Cases

- Que se passe-t-il si le PV d'une réunion n'a pas encore été généré par l'IA ? → L'export est bloqué et un message explicite est retourné (FR-009)
- Si le PV est partiellement généré, les sections vides affichent "Non renseigné" dans le document exporté (FR-012)
- Comment le système gère-t-il un titre de réunion contenant des caractères spéciaux dans le nom de fichier ?
- Que se passe-t-il si la réunion n'a aucun participant enregistré ?
- Comment le système gère-t-il une réunion sans aucune action à mener ?
- Que se passe-t-il si le serveur d'export est indisponible lors du téléchargement ?
- Comment gérer un résumé très long qui dépasse les limites de mise en page du document ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT exposer quatre endpoints distincts pour l'export accessibles via l'identifiant de la réunion : un pour PDF, un pour Word (.docx), un pour Excel (.xlsx), et un pour CSV (.csv)
- **FR-002**: Le système DOIT récupérer depuis la base de données toutes les données complètes de la réunion : informations générales (titre, date, lieu, durée), résumé exécutif, liste des participants, points abordés, liste de diffusion, et actions à mener
- **FR-003**: Le système DOIT générer un document PDF avec un template professionnel incluant : logo SmartMeet, tableau d'informations générales, sections clairement délimitées, style de document officiel
- **FR-004**: Le système DOIT générer un fichier Word (.docx) éditable avec la même structure et le même contenu que le PDF
- **FR-005**: Le système DOIT générer un fichier Excel (.xlsx) en respectant le template de référence (Classeur1.xlsx) : en-tête, informations de la réunion, tableau des participants, points abordés, tableau des actions à mener
- **FR-006**: Les trois formats DOIVENT reproduire la même structure de contenu et le même design
- **FR-007**: Le frontend DOIT déclencher le téléchargement du fichier correspondant au format sélectionné lorsque l'utilisateur clique sur PDF, DOC, CSV ou Excel dans le menu de téléchargement de la page ArchiveLibrary (les 4 options actuelles sont conservées)
- **FR-008**: Les fichiers exportés DOIVENT être nommés de manière cohérente : `PV_[titre-reunion]_[date].[extension]`
- **FR-009**: Le système DOIT retourner un message d'erreur explicite si le PV n'est pas encore disponible pour la réunion demandée
- **FR-010**: Les exports DOIVENT être accessibles uniquement aux utilisateurs authentifiés disposant des droits de consultation du PV de la réunion concernée — les droits d'export sont identiques aux droits de consultation existants, sans rôle supplémentaire requis
- **FR-011**: Le frontend DOIT afficher un indicateur de chargement (spinner) sur le bouton de téléchargement pendant toute la durée de génération du fichier ; le téléchargement DOIT se déclencher automatiquement dès que le fichier est prêt
- **FR-012**: Pour un PV partiellement généré, le système DOIT exporter les sections disponibles ; toute section sans données DOIT afficher la mention "Non renseigné" plutôt que de bloquer l'export
- **FR-013**: Le CSV DOIT exporter uniquement le tableau des actions à mener avec les colonnes : responsable, description, échéance, statut — ce format est destiné à l'import dans des outils de suivi de projet

### Key Entities

- **Réunion (Meeting)**: Document central contenant les données sources — titre, date, lieu, durée, description
- **Procès-Verbal (PV/Summary)**: Données générées par l'IA — résumé exécutif, points abordés, actions à mener, liste de diffusion
- **Participant**: Personne ayant assisté à la réunion — nom, prénom, rôle, présence
- **Action**: Tâche identifiée lors de la réunion — description, responsable, date d'échéance, statut
- **Document exporté**: Fichier généré à la demande — format (PDF/DOCX/XLSX), contenu structuré, métadonnées de génération

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utilisateur reçoit le fichier exporté dans les 10 secondes suivant le clic sur le format souhaité
- **SC-002**: 100% des sections du PV présentes en base de données sont reproduites dans le document exporté
- **SC-003**: Les quatre formats (PDF, Word, Excel, CSV) sont disponibles et fonctionnels pour toute réunion disposant d'un PV généré
- **SC-004**: Le fichier Excel exporté respecte structurellement le template de référence Classeur1.xlsx
- **SC-005**: Le taux d'erreur lors de la génération d'export est inférieur à 1% pour des réunions avec des données complètes
- **SC-006**: Un utilisateur qui ne peut pas consulter le PV d'une réunion ne peut pas non plus télécharger son export — le même contrôle d'accès s'applique aux deux actions

## Assumptions

- Les données des réunions et de leurs PV sont déjà stockées dans la base de données du backend
- Le template Excel de référence (Classeur1.xlsx) définit la structure exacte à respecter pour l'export Excel
- L'authentification utilisateur est gérée par le système JWT existant — les exports sont protégés par ce mécanisme
- Le frontend actuel (ArchiveLibrary.jsx) dispose déjà d'un menu de téléchargement avec les options PDF, DOC, CSV, Excel — seule la logique d'appel API est à connecter (actuellement un `alert`)
- Le logo SmartMeet est disponible en tant que ressource statique côté backend pour inclusion dans les documents
- Les exports sont générés à la demande (pas de pré-génération ou cache) pour garantir des données à jour
- L'option CSV coexiste avec Excel dans le frontend — le CSV cible spécifiquement les actions à mener (format tabulaire plat pour import dans des outils de suivi), tandis que l'Excel contient le PV complet structuré selon le template de référence
- Le support mobile n'est pas dans le périmètre de cette fonctionnalité (optimisé desktop)
