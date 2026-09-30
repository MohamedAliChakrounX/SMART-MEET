# Tasks: Export de Procès-Verbal de Réunion — 008-pv-export

**Branch**: `008-pv-export` | **Date**: 2026-05-08  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

| Phase | Description | Tasks |
|-------|-------------|-------|
| Phase 1 | Setup — Composer dependencies | 2 |
| Phase 2 | Foundational — DTO + Service skeleton | 3 |
| Phase 3 | US1 — Export PDF | 4 |
| Phase 4 | US2 — Export Word (.docx) | 3 |
| Phase 5 | US3 — Export Excel (.xlsx) | 3 |
| Phase 6 | US3b — Export CSV (actions) | 2 |
| Phase 7 | Frontend — ArchiveLibrary integration | 4 |
| Phase 8 | Polish — Tests + error handling | 4 |
| **Total** | | **25** |

---

## Phase 1: Setup — Composer Dependencies

> Install the 3 new PHP libraries. No code changes yet.

- [x] T001 Install PDF library: run `composer require dompdf/dompdf` in `Backend/`
- [x] T002 [P] Install Word + Excel libraries: run `composer require phpoffice/phpword phpoffice/phpspreadsheet` in `Backend/`

---

## Phase 2: Foundational — DTO + Controller + Service Skeleton

> These are blocking prerequisites for all User Story phases. Must complete before any format-specific work.

- [x] T003 Create `Backend/src/Dto/MeetingExportDto.php` — PHP readonly class with fields: `meetingId`, `title`, `date`, `duration`, `status`, `description`, `project`, `organizer`, `participants` (array), `executiveSummary`, `decisions` (array), `actionItems` (array of `{description, responsable, echeance, statut}`), `pvGeneratedAt`, `detailLevel` — every nullable field defaults to `"Non renseigné"`
- [x] T004 Create `Backend/src/Service/ExportService.php` — injectable Symfony service with 4 stub methods returning `Response`: `generatePdf(MeetingExportDto)`, `generateWord(MeetingExportDto)`, `generateExcel(MeetingExportDto)`, `generateCsv(MeetingExportDto)` — each stub throws `\RuntimeException('Not implemented')` temporarily
- [x] T005 Create `Backend/src/Controller/ExportController.php` — single route `GET /api/v1/meetings/{meetingId}/export/{format}`, requires `IS_AUTHENTICATED_FULLY`, validates `format` ∈ `{pdf, word, excel, csv}` (400 otherwise), loads Meeting with Summary via `MeetingRepository`, guards: soft-delete → 404, no Summary → 422, user access check same as `MeetingController` pattern → 403, builds `MeetingExportDto` from entity data applying `"Non renseigné"` fallbacks (FR-012), delegates to `ExportService` and returns its `Response`

---

## Phase 3: User Story 1 — Export PDF

**Story goal**: User downloads a professional PDF of the PV.  
**Independent test**: `GET /api/v1/meetings/{id}/export/pdf` returns 200 with `Content-Type: application/pdf` and a non-empty binary body containing all PV sections.

- [x] T006 [US1] Create `Backend/templates/export/pv.html.twig` — full HTML+CSS template with: header row (SmartMeet logo text + "PROCÈS-VERBAL" title), info table (Titre / Date / Durée / Statut / Organisateur / Projet), Résumé Exécutif section, Participants table (Nom | Présence), Points Abordés / Décisions ordered list, Actions à Mener table (Responsable | Description | Échéance | Statut), footer with PV generation date — all fields use DTO values, empty arrays render a "Non renseigné" row, apply official-document CSS (font-family: Arial, bordered tables, blue-900 headers, A4 page margins)
- [x] T007 [US1] Implement `ExportService::generatePdf(MeetingExportDto $dto): Response` in `Backend/src/Service/ExportService.php` — inject Twig `Environment`, render `export/pv.html.twig` with DTO data, instantiate `Dompdf\Dompdf`, call `loadHtml()`, `render()`, `output()`, return Symfony `Response` with headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="PV_{slug}_{date}.pdf"` — slug via `preg_replace('/[^a-zA-Z0-9_-]/', '-', $dto->title)`
- [x] T008 [P] [US1] Add Twig dependency injection to `ExportService` — add `__construct(private Environment $twig, private LoggerInterface $logger)` and log `export.generated` with `{format:'pdf', meetingId, durationMs}` after generation
- [x] T009 [US1] Manually test PDF export: call `GET /api/v1/meetings/{realMeetingId}/export/pdf` with valid JWT, verify download, open PDF, confirm all sections render correctly with real DB data

---

## Phase 4: User Story 2 — Export Word (.docx)

**Story goal**: User downloads an editable Word document of the PV.  
**Independent test**: `GET /api/v1/meetings/{id}/export/word` returns 200 with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` and a valid DOCX binary.

- [x] T010 [US2] Implement `ExportService::generateWord(MeetingExportDto $dto): Response` in `Backend/src/Service/ExportService.php` — use `PhpOffice\PhpWord\PhpWord`, add section, add title heading (H1), add info table (2-col: label/value for Titre, Date, Durée, Organisateur, Projet), add "Résumé Exécutif" heading + paragraph, add "Participants" heading + table (Nom | Présence columns), add "Points Abordés" heading + numbered list from `$dto->decisions`, add "Actions à Mener" heading + table (Responsable | Description | Échéance | Statut columns) from `$dto->actionItems`, write to temp file via `IOFactory::createWriter($phpWord, 'Word2007')->save($tmpFile)`, return `BinaryFileResponse` with correct Content-Type and Content-Disposition headers, delete temp file after response
- [x] T011 [US2] Add Word generation logging to `ExportService` — log `export.generated` with `{format:'word', meetingId, durationMs}` after DOCX creation
- [x] T012 [US2] Manually test Word export: call `GET /api/v1/meetings/{id}/export/word`, open `.docx` in Word/LibreOffice, confirm editable structure with all PV sections present

---

## Phase 5: User Story 3 — Export Excel (.xlsx)

**Story goal**: User downloads a structured Excel file matching the Classeur1.xlsx template layout.  
**Independent test**: `GET /api/v1/meetings/{id}/export/excel` returns 200 with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a valid XLSX binary with correct column structure.

- [x] T013 [US3] Implement `ExportService::generateExcel(MeetingExportDto $dto): Response` in `Backend/src/Service/ExportService.php` — use `PhpOffice\PhpSpreadsheet\Spreadsheet`, create sheet titled "Procès-Verbal", row 1: merged header "PROCÈS-VERBAL — {title}" with blue background + white bold text, rows 3-8: info block (Date, Durée, Organisateur, Projet, Statut, PV Généré le), row 10: "PARTICIPANTS" label + table headers (Nom | Présence), fill participant rows (fallback: one row "Non renseigné"), blank row, "POINTS ABORDÉS" label + numbered rows from `$dto->decisions`, blank row, "ACTIONS À MENER" header row (Responsable | Description | Échéance | Statut) with styled background, fill action rows from `$dto->actionItems` (fallback: one row "Non renseigné"), auto-size columns, write via `Xlsx` writer to temp file, return `BinaryFileResponse`, delete temp file after response
- [x] T014 [US3] Add Excel generation logging to `ExportService` — log `export.generated` with `{format:'excel', meetingId, durationMs}`
- [x] T015 [US3] Manually test Excel export: call `GET /api/v1/meetings/{id}/export/excel`, open `.xlsx`, verify column structure matches Classeur1.xlsx template (info block, participant table, actions table with correct headers)

---

## Phase 6: CSV Export (Actions Table)

**Story goal**: User downloads a CSV of actions-only for import into project management tools.  
**Independent test**: `GET /api/v1/meetings/{id}/export/csv` returns 200 with `Content-Type: text/csv`, UTF-8 BOM, header row `Responsable,Description,Echeance,Statut`, one data row per action item (empty table = headers only, no error).

- [x] T016 Implement `ExportService::generateCsv(MeetingExportDto $dto): StreamedResponse` in `Backend/src/Service/ExportService.php` — return Symfony `StreamedResponse`, callback opens `php://output`, writes UTF-8 BOM (`\xEF\xBB\xBF`) for Excel compatibility, writes header row via `fputcsv($handle, ['Responsable', 'Description', 'Echéance', 'Statut'])`, iterates `$dto->actionItems` writing one row each (empty array → headers only, no error per FR-013), set headers: `Content-Type: text/csv; charset=UTF-8`, `Content-Disposition: attachment; filename="PV_actions_{slug}_{date}.csv"`
- [x] T017 Manually test CSV export: call `GET /api/v1/meetings/{id}/export/csv`, open in Excel, verify columns Responsable/Description/Echéance/Statut, verify no encoding issues with accented characters

---

## Phase 7: Frontend — ArchiveLibrary Integration

**Story goal**: Clicking a format in the Download menu triggers a real download with a spinner instead of an alert.

- [x] T018 Add `downloadingId` state in `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx` — `const [downloadingId, setDownloadingId] = useState(null);` — placed alongside other state declarations at top of component
- [x] T019 Replace `handleDownloadFormat` function in `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx` — remove `alert()` stub, implement: `setDownloadingId(`${meeting.id}-${format}`)`, call `api.get(`/meetings/${meeting.id}/export/${formatMap[format]}`, { responseType: 'blob' })` where `formatMap = { PDF: 'pdf', DOC: 'word', CSV: 'csv', Excel: 'excel' }`, on success create object URL, create hidden `<a>` element, trigger click, revoke URL, on error log and show user-friendly message (e.g. `alert(t('archive.exportError'))`), in `finally` call `setDownloadingId(null)` and `setActiveDownloadId(null)`
- [x] T020 Update Download button in `Frontend-Web/src/pages/ArchiveLibrary/ArchiveLibrary.jsx` — import `Loader2` from `lucide-react`, change button icon to: `{downloadingId?.startsWith(meeting.id) ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}`, add `disabled={downloadingId?.startsWith(meeting.id)}` to prevent double-clicks
- [x] T021 [P] Add `archive.exportError` translation key in all locale files under `Frontend-Web/src/i18n/` — value: `"Erreur lors de l'export. Veuillez réessayer."` (FR) / `"Export failed. Please try again."` (EN) — check existing i18n files to confirm structure and add to both

---

## Phase 8: Polish — Error Handling & Tests

- [ ] T022 [P] Add 400 response for invalid format in `Backend/src/Controller/ExportController.php` — if `$format` not in `['pdf', 'word', 'excel', 'csv']` return `JsonResponse(['error' => 'Invalid format. Allowed: pdf, word, excel, csv'], 400)`
- [ ] T023 [P] Write PHPUnit unit test `Backend/tests/Service/ExportServiceTest.php` — test `generatePdf()` with a fixture `MeetingExportDto` (all fields populated): assert Response status 200, Content-Type header = `application/pdf`, body is non-empty; test `generateCsv()` with empty actionItems: assert CSV body contains only header row
- [ ] T024 [P] Write PHPUnit integration test `Backend/tests/Controller/ExportControllerTest.php` — test 401 (no JWT), test 400 (invalid format `format=zip`), test 404 (non-existent meetingId), test 422 (meeting with no Summary) — use Symfony WebTestCase
- [ ] T025 End-to-end manual verification per quickstart.md — execute all 7 verification scenarios from `specs/008-pv-export/quickstart.md`: PDF sections, Word editable, Excel template match, CSV columns, no-PV 422, wrong-user 403, frontend spinner behavior

---

## Dependency Graph

```
T001, T002 (parallel)
    ↓
T003 → T004 → T005
              ↓
    ┌────────────────────────┐
    ↓         ↓         ↓    ↓
T006→T007   T010      T013  T016
   →T008    →T011    →T014
   →T009    →T012    →T015
    ↓         ↓         ↓    ↓
         T018→T019→T020→T021
              ↓
    T022, T023, T024 (parallel)
              ↓
            T025
```

**Key dependency**: T005 (Controller) depends on T003 (DTO) and T004 (Service skeleton) — all format generators depend on T004.  
**Frontend** (T018–T021) can be started in parallel with any backend format phase once T005 is done.

---

## Parallel Execution Opportunities

Once T005 is done, the following can run simultaneously:

| Stream | Tasks | Developer |
|--------|-------|-----------|
| PDF | T006 → T007 → T008 → T009 | Dev A |
| Word | T010 → T011 → T012 | Dev A or B |
| Excel | T013 → T014 → T015 | Dev B |
| CSV | T016 → T017 | Dev B |
| Frontend | T018 → T019 → T020 → T021 | Dev Frontend |

---

## Implementation Strategy

**MVP Scope** (User Story 1 only — deliver fastest value):
1. T001–T005 (Setup + Foundation)
2. T006–T009 (PDF export end-to-end)
3. T018–T020 (Frontend button → real download)

**Incremental delivery**:
- Sprint 1 MVP: PDF + frontend spinner (T001–T009, T018–T020)
- Sprint 2: Word + Excel (T010–T015)
- Sprint 3: CSV + i18n + polish + tests (T016–T025)
