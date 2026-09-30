# Research: Export de Procès-Verbal — 008-pv-export

**Branch**: `008-pv-export` | **Date**: 2026-05-08 | **Phase**: 0

## Decision 1 — PDF Generation Library

**Decision**: `dompdf/dompdf` via Symfony Twig template  
**Rationale**: Pure PHP library, zero external binary dependency, fully composable with Symfony's Twig templating engine already in use. Renders HTML+CSS to PDF natively.  
**Alternatives considered**:
- `knplabs/knp-snappy` + `wkhtmltopdf` — requires system binary, complex installation on Windows dev environment, rejected
- `tcpdf` — older API, less HTML/CSS support, rejected
- `mpdf/mpdf` — viable alternative if dompdf CSS coverage is insufficient; can swap without contract change

## Decision 2 — Word (.docx) Generation Library

**Decision**: `phpoffice/phpword`  
**Rationale**: Mature PHP library for generating `.docx` files (OOXML format), active maintenance, compatible with PHP 8.2+, supports tables, headings, paragraphs, and styles matching PV template needs.  
**Alternatives considered**:
- `docx4j` (Java) — incompatible with Symfony/PHP stack, rejected
- Custom XML generation — error-prone and unmaintainable, rejected

## Decision 3 — Excel (.xlsx) Generation Library

**Decision**: `phpoffice/phpspreadsheet`  
**Rationale**: Industry-standard PHP library for Excel XLSX generation. Supports cell styling, merged cells, column widths, and sheet tabs — all needed for the Classeur1.xlsx template structure. Same vendor as PhpWord (consistent API).  
**Alternatives considered**:
- `apache/poi` (Java) — incompatible with PHP stack, rejected
- `box/spout` — lighter but limited styling control for template matching, rejected

## Decision 4 — CSV Generation

**Decision**: Native PHP `fputcsv()` via `StreamedResponse`  
**Rationale**: No library needed. PHP's built-in `fputcsv()` handles CSV encoding correctly. Symfony's `StreamedResponse` allows streaming large outputs without memory buffering.  
**Alternatives considered**: No meaningful alternatives — library overhead unjustified for CSV

## Decision 5 — PDF Template Engine

**Decision**: Symfony Twig template (`templates/export/pv.html.twig`)  
**Rationale**: Twig is already the Symfony templating standard in this project. HTML+CSS template rendered by Twig, then passed to dompdf. Supports logo embedding via base64, table layouts, and conditional sections (FR-012: "Non renseigné" for empty sections).  
**Alternatives considered**: Standalone HTML strings in PHP — not maintainable, rejected

## Decision 6 — Controller Architecture

**Decision**: New dedicated `ExportController` in `Backend/src/Controller/`  
**Rationale**: Follows YAGNI (Constitution §VII) — one controller per domain. Export is a distinct concern from meeting CRUD (`MeetingController`) and summary editing (`SummaryController`).  
**Alternatives considered**: Adding export methods to `MeetingController` — violates single responsibility, rejected

## Decision 7 — Service Architecture

**Decision**: New `ExportService` in `Backend/src/Service/`  
**Rationale**: Encapsulates all format-generation logic in one injectable service. `ExportController` stays thin (validate auth → call service → return response). Follows existing pattern (`MeetingService`, `UserService`).

## Decision 8 — Access Control

**Decision**: Reuse existing meeting ownership/permission check in `MeetingService`  
**Rationale**: Per Q1 clarification, export uses identical access rights as PV consultation. No new role or permission entity needed (Constitution §VII YAGNI).

## Decision 9 — File Naming

**Decision**: `PV_[slug-titre]_[YYYY-MM-DD].[ext]`  
**Rationale**: Special characters in titles sanitized via `preg_replace` to produce a URL-safe slug. Date formatted as ISO 8601 date for sortability.

## Decision 10 — No Database Migration Required

**Decision**: No new Doctrine entity or migration  
**Rationale**: Exports are generated on-demand from existing data (Meeting + Summary entities). No persistence of export artifacts. Constitution §IV (Data Ownership) satisfied — PostgreSQL remains single source of truth.
