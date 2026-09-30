# API Contracts: Export de Procès-Verbal — 008-pv-export

**Branch**: `008-pv-export` | **Date**: 2026-05-08 | **Phase**: 1

## Base URL

```
GET /api/v1/meetings/{meetingId}/export/{format}
```

## Endpoints

### GET /api/v1/meetings/{meetingId}/export/pdf

**Description**: Generate and download the PV as a PDF file.

**Authentication**: JWT Bearer token required (same access as PV consultation)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `meetingId` | UUID string | Yes | The meeting's unique identifier |

**Response (200 OK)**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="PV_[slug]_[YYYY-MM-DD].pdf"
Body: Binary PDF file content
```

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT token |
| 403 | Authenticated user does not have access to this meeting's PV |
| 404 | Meeting not found or soft-deleted |
| 422 | Meeting has no Summary of type 'PV' |
| 500 | PDF generation failure (internal error) |

---

### GET /api/v1/meetings/{meetingId}/export/word

**Description**: Generate and download the PV as a Word (.docx) file.

**Authentication**: JWT Bearer token required

**Path Parameters**: Same as PDF endpoint.

**Response (200 OK)**:
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="PV_[slug]_[YYYY-MM-DD].docx"
Body: Binary DOCX file content
```

**Error Responses**: Same as PDF endpoint.

---

### GET /api/v1/meetings/{meetingId}/export/excel

**Description**: Generate and download the full PV as an Excel (.xlsx) file following Classeur1.xlsx template.

**Authentication**: JWT Bearer token required

**Path Parameters**: Same as PDF endpoint.

**Response (200 OK)**:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="PV_[slug]_[YYYY-MM-DD].xlsx"
Body: Binary XLSX file content
```

**Error Responses**: Same as PDF endpoint.

---

### GET /api/v1/meetings/{meetingId}/export/csv

**Description**: Export the action items table only as a CSV file.

**Authentication**: JWT Bearer token required

**Path Parameters**: Same as PDF endpoint.

**Response (200 OK)**:
```
Content-Type: text/csv; charset=UTF-8
Content-Disposition: attachment; filename="PV_actions_[slug]_[YYYY-MM-DD].csv"
Body: UTF-8 CSV with BOM for Excel compatibility

Columns: Responsable,Description,Echéance,Statut
```

**Error Responses**: Same as PDF endpoint. If no action items exist, returns an empty CSV with headers only (not an error).

---

## Frontend Contract

The `ArchiveLibrary.jsx` `handleDownloadFormat` function must be updated to call the backend and trigger a browser download:

```javascript
// Current (stub):
const handleDownloadFormat = (e, format, meeting) => {
    e.stopPropagation();
    alert(t('archive.downloadingFormat', { title: meeting.title, format }));
    setActiveDownloadId(null);
};

// Target (real implementation):
const handleDownloadFormat = async (e, format, meeting) => {
    e.stopPropagation();
    setDownloadingId(`${meeting.id}-${format}`);
    try {
        const formatMap = { PDF: 'pdf', DOC: 'word', CSV: 'csv', Excel: 'excel' };
        const response = await api.get(
            `/meetings/${meeting.id}/export/${formatMap[format]}`,
            { responseType: 'blob' }
        );
        // Trigger browser download from blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `PV_${meeting.title}_${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        // Show user-friendly error
    } finally {
        setDownloadingId(null);
        setActiveDownloadId(null);
    }
};
```

## Routing Convention (Symfony)

```php
// ExportController.php
#[Route('/api/v1/meetings/{meetingId}/export/{format}', name: 'meeting_export', methods: ['GET'])]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
public function export(string $meetingId, string $format): Response
```

Valid `format` values: `pdf`, `word`, `excel`, `csv` — return 400 for any other value.
