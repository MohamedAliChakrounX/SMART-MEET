# Quickstart: Export de Procès-Verbal — 008-pv-export

**Feature**: 008-pv-export | **Date**: 2026-05-08

## Prerequisites

- PHP 8.2+ with `ext-dom`, `ext-xml`, `ext-zip`, `ext-gd` extensions
- Composer 2.x
- Existing SmartMeet backend running (`php -S 127.0.0.1:8000 -t public`)
- Node.js 18+ / npm for frontend

## 1. Backend — Install PHP Libraries

```bash
cd e:/sfm-PFE/Meeting-IA-sfm/Backend

# PDF generation
composer require dompdf/dompdf

# Word (.docx) generation
composer require phpoffice/phpword

# Excel (.xlsx) generation
composer require phpoffice/phpspreadsheet
```

> **Note**: `fputcsv()` for CSV is built into PHP — no additional package required.

## 2. Backend — New Files to Create

```text
Backend/src/
├── Controller/
│   └── ExportController.php          ← NEW: 4 export routes
├── Service/
│   └── ExportService.php             ← NEW: format generation logic
└── templates/export/
    └── pv.html.twig                  ← NEW: PDF/Twig template
```

## 3. Backend — Register Route

The route is auto-discovered via Symfony annotations — no manual `routes.yaml` change needed.

Verify route is registered after creating the controller:
```bash
php bin/console debug:router | grep export
```

Expected output:
```
meeting_export   GET   /api/v1/meetings/{meetingId}/export/{format}
```

## 4. Frontend — Update ArchiveLibrary.jsx

Replace the stub `handleDownloadFormat` function (currently `alert(...)`) with the real API call as defined in `contracts/api.md`.

Add `downloadingId` state:
```javascript
const [downloadingId, setDownloadingId] = useState(null);
```

Update the Download button to show spinner:
```jsx
<button
    onClick={(e) => toggleDownloadMenu(e, meeting.id)}
    disabled={downloadingId?.startsWith(meeting.id)}
>
    {downloadingId?.startsWith(meeting.id)
        ? <Loader2 size={16} className="animate-spin" />
        : <Download size={16} />
    }
</button>
```

## 5. Validation

### Test PDF export:
```bash
curl -H "Authorization: Bearer <JWT>" \
     http://127.0.0.1:8000/api/v1/meetings/<meetingId>/export/pdf \
     --output test.pdf
open test.pdf
```

### Test CSV export (actions only):
```bash
curl -H "Authorization: Bearer <JWT>" \
     http://127.0.0.1:8000/api/v1/meetings/<meetingId>/export/csv \
     --output actions.csv
cat actions.csv
```

### Test no-PV error:
```bash
# Use a meetingId with no Summary
curl -H "Authorization: Bearer <JWT>" \
     http://127.0.0.1:8000/api/v1/meetings/<meetingId-no-pv>/export/pdf
# Expected: 422 Unprocessable Entity
```

### Test unauthorized access:
```bash
# Use JWT of user who cannot view this meeting
curl -H "Authorization: Bearer <other-user-JWT>" \
     http://127.0.0.1:8000/api/v1/meetings/<meetingId>/export/pdf
# Expected: 403 Forbidden
```

## 6. Constitution Compliance Checklist

- [x] **§I Service Isolation**: Export runs in Symfony only; Flask not involved; Frontend calls Symfony API
- [x] **§II API-First**: Contracts defined in `contracts/api.md` before implementation
- [x] **§III Security**: JWT required on all 4 endpoints; access mirrors PV consultation rights
- [x] **§IV Data Ownership**: No new DB entities; reads existing Meeting/Summary; no Flask persistence
- [x] **§VII YAGNI**: No new abstractions beyond `ExportController` + `ExportService` + `MeetingExportDto`
