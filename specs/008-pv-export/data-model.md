# Data Model: Export de Procès-Verbal — 008-pv-export

**Branch**: `008-pv-export` | **Date**: 2026-05-08 | **Phase**: 1

> No new database entities are created. This feature reads from existing entities only.

## Existing Entities Used (Read-Only)

### Meeting

| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID | Endpoint routing, access check |
| `title` | string(255) | Document title, file name slug |
| `startAt` | DateTimeImmutable | "Date de réunion" in header |
| `durationMinutes` | int | "Durée" in general info table |
| `status` | string(50) | General info section |
| `participants` | JSON array | Participants table in PDF/Word/Excel |
| `description` | text | "Objet" / description field |
| `actionItems` | JSON array | Actions table — **CSV primary source** |
| `decisions` | JSON array | "Points abordés / Décisions" section |
| `project` | →Project | "Projet" in general info |
| `owner` | →User | "Organisateur" in general info |
| `summary` | →Summary | PV content source |
| `deletedAt` | DateTimeImmutable\|null | Soft-delete guard (must be null) |

### Summary (OneToOne → Meeting)

| Field | Type | Used For |
|-------|------|----------|
| `id` | UUID | Identity |
| `type` | string(50) | Filter: only export if type = 'PV' |
| `content` | JSON array | Résumé exécutif, sections PV |
| `focusAreas` | JSON array | "Points abordés" enriched data |
| `detailLevel` | string(50) | Displayed in document header |
| `createdAt` | DateTimeImmutable | "Date de génération du PV" |
| `updatedAt` | DateTimeImmutable | "Dernière mise à jour" |

### User (ManyToOne → Meeting.owner)

| Field | Type | Used For |
|-------|------|----------|
| `firstName` | string | Organisateur name |
| `lastName` | string | Organisateur name |
| `email` | string | Organisateur contact |

### Project (ManyToOne → Meeting.project)

| Field | Type | Used For |
|-------|------|----------|
| `name` | string | Projet name in general info |

---

## Export Data Transfer Object (DTO)

A `MeetingExportDto` value object is assembled by `ExportService` before passing to generators. This decouples document generation from Doctrine entities.

```php
// Conceptual structure — not a Doctrine entity
MeetingExportDto {
    meetingId: string
    title: string              // fallback: "Non renseigné"
    date: string               // formatted startAt
    duration: string           // e.g. "90 min"
    status: string
    description: string        // fallback: "Non renseigné"
    project: string            // fallback: "Non renseigné"
    organizer: string          // "Prénom Nom" fallback: "Non renseigné"
    participants: array<{name: string}> // fallback: []
    executiveSummary: string   // from Summary.content fallback: "Non renseigné"
    decisions: array<string>   // from Meeting.decisions
    actionItems: array<{
        description: string,
        responsable: string,
        echeance: string,
        statut: string
    }>                         // fallback: []
    pvGeneratedAt: string      // from Summary.createdAt
    detailLevel: string
}
```

---

## Validation Rules

| Rule | Implementation |
|------|---------------|
| Meeting must not be soft-deleted | Check `deletedAt === null` in `ExportService` |
| Meeting must have a Summary | Check `meeting->getSummary() !== null`, else return 404 |
| Summary type must be 'PV' | Check `summary->getType() === 'PV'`, else return 422 |
| Empty fields | Replace `null`/empty with `"Non renseigné"` (FR-012) |
| File name | Slug: `preg_replace('/[^a-zA-Z0-9\-_]/', '-', $title)` + date |

---

## No Schema Changes

No Doctrine migration required. All export data is read from existing tables:
- `meeting`
- `summary`
- `user`
- `project`
