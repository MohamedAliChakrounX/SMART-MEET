<?php

namespace App\Service;

use App\Dto\MeetingExportDto;
use Dompdf\Dompdf;
use PhpOffice\PhpWord\PhpWord;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Twig\Environment;

class ExportService
{
    public function __construct(
        private Environment $twig,
        private LoggerInterface $logger
    ) {
    }

    public function generatePdf(MeetingExportDto $dto): Response
    {
        $startTime = microtime(true);

        $html = $this->twig->render('export/pv.html.twig', [
            'dto' => $dto
        ]);

        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $output = $dompdf->output();

        $durationMs = (int)((microtime(true) - $startTime) * 1000);
        $this->logger->info('export.generated', [
            'format' => 'pdf',
            'meetingId' => $dto->meetingId,
            'durationMs' => $durationMs
        ]);

        $slug = preg_replace('/[^a-zA-Z0-9_-]/', '-', $dto->title);
        $filename = sprintf('PV_%s_%s.pdf', $slug, date('Y-m-d'));

        return new Response($output, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function generateWord(MeetingExportDto $dto): Response
    {
        $startTime = microtime(true);
        $phpWord = new PhpWord();

        // Section definition
        $section = $phpWord->addSection();

        // Style helper setup
        $tableStyle = [
            'borderSize' => 6,
            'borderColor' => 'd1d5db',
            'cellMargin' => 80
        ];
        $phpWord->addTableStyle('InfoTable', $tableStyle);

        $headerBgStyle = ['bgColor' => 'f2f2f2'];
        $labelBgStyle = ['bgColor' => 'd9d9d9'];
        $boldFont = ['bold' => true, 'size' => 10, 'name' => 'Arial'];
        $regularFont = ['size' => 10, 'name' => 'Arial'];

        // 1. Header Block
        $headerTable = $section->addTable('InfoTable');
        $headerTable->addRow();
        $headerTable->addCell(2000)->addText("SmartMeet", ['bold' => true, 'size' => 14, 'color' => '1e3a8a', 'name' => 'Arial'], ['alignment' => 'center']);
        $headerTable->addCell(5000)->addText("PV de Réunion", ['bold' => true, 'size' => 13, 'name' => 'Arial'], ['alignment' => 'center']);
        
        $metaCell = $headerTable->addCell(2500);
        $metaCell->addText("Version : 01", ['size' => 9, 'name' => 'Arial']);
        $metaCell->addText("Date : " . date('d/m/Y'), ['size' => 9, 'name' => 'Arial']);
        $metaCell->addText("Code : FOR-01-SFM-2026", ['size' => 9, 'name' => 'Arial']);
        
        $section->addTextBreak(1);

        // 2. Metadata Block
        $metaTable = $section->addTable('InfoTable');
        
        $metaTable->addRow();
        $metaTable->addCell(2000, $labelBgStyle)->addText("Type de la réunion", $boldFont);
        $metaTable->addCell(7500, ['gridSpan' => 3])->addText("Interne", $boldFont);
        
        $metaTable->addRow();
        $metaTable->addCell(2000, $labelBgStyle)->addText("Date de la réunion", $boldFont);
        $metaTable->addCell(2750)->addText($dto->date, $regularFont);
        $metaTable->addCell(2000, $labelBgStyle)->addText("Lieu de la réunion", $boldFont);
        $metaTable->addCell(2750)->addText("SFM-RDC", $regularFont);
        
        $metaTable->addRow();
        $metaTable->addCell(2000, $labelBgStyle)->addText("Objet De la Réunion", $boldFont);
        $metaTable->addCell(7500, ['gridSpan' => 3])->addText($dto->title, $regularFont);
        
        $section->addTextBreak(1);

        // 3. Participants Block
        $partTitleTable = $section->addTable('InfoTable');
        $partTitleTable->addRow();
        $partTitleTable->addCell(9500, $labelBgStyle)->addText("Liste des participants", $boldFont);
        
        $partTable = $section->addTable('InfoTable');
        $partTable->addRow();
        $partTable->addCell(3000, $headerBgStyle)->addText("Nom et Prénom", $boldFont);
        $partTable->addCell(3000, $headerBgStyle)->addText("Fonction", $boldFont);
        $partTable->addCell(1750, $headerBgStyle)->addText("Signature", $boldFont);
        $partTable->addCell(1750, $headerBgStyle)->addText("Commentaire", $boldFont);
        
        if (empty($dto->participants)) {
            $partTable->addRow();
            $partTable->addCell(3000)->addText("Non renseigné", ['italic' => true, 'color' => '9ca3af', 'name' => 'Arial']);
            $partTable->addCell(3000)->addText("Non renseigné", ['italic' => true, 'color' => '9ca3af', 'name' => 'Arial']);
            $partTable->addCell(1750)->addText("");
            $partTable->addCell(1750)->addText("");
        } else {
            foreach ($dto->participants as $participant) {
                $partTable->addRow();
                $partTable->addCell(3000)->addText($participant['name'], $regularFont);
                $partTable->addCell(3000)->addText($participant['role'], $regularFont);
                $partTable->addCell(1750)->addText("");
                $partTable->addCell(1750)->addText("");
            }
        }
        
        $section->addTextBreak(1);

        // 4. Résumé Exécutif Block
        $execTable = $section->addTable('InfoTable');
        $execTable->addRow();
        $execTable->addCell(2000, $labelBgStyle)->addText("Résumé Exécutif", $boldFont);
        
        $execCell = $execTable->addCell(7500);
        $lines = explode("\n", $dto->executiveSummary);
        foreach ($lines as $line) {
            $execCell->addText(trim($line), $regularFont);
        }

        $section->addTextBreak(1);

        // 4b. Points Abordés Block
        $pointsTable = $section->addTable('InfoTable');
        $pointsTable->addRow();
        $pointsTable->addCell(2000, $labelBgStyle)->addText("Points abordés", $boldFont);
        
        $pointsCell = $pointsTable->addCell(7500);
        if (empty($dto->decisions)) {
            $pointsCell->addText("Non renseigné", ['italic' => true, 'color' => '9ca3af', 'name' => 'Arial']);
        } else {
            foreach ($dto->decisions as $decision) {
                $pointsCell->addText("• " . $decision, $regularFont);
            }
        }
        
        $section->addTextBreak(1);

        // 5. Liste de Diffusion Block
        $diffTitleTable = $section->addTable('InfoTable');
        $diffTitleTable->addRow();
        $diffTitleTable->addCell(9500, $labelBgStyle)->addText("Liste de diffusion", $boldFont);
        
        $diffTable = $section->addTable('InfoTable');
        if (empty($dto->participants)) {
            $diffTable->addRow();
            $diffTable->addCell(9500)->addText("Non renseigné", ['italic' => true, 'color' => '9ca3af', 'name' => 'Arial']);
        } else {
            foreach ($dto->participants as $participant) {
                $diffTable->addRow();
                $diffTable->addCell(4750)->addText($participant['name'], $regularFont);
                $diffTable->addCell(4750)->addText("", $regularFont);
            }
        }
        
        $section->addTextBreak(1);

        // 6. Actions Proposés Block
        $actTitleTable = $section->addTable('InfoTable');
        $actTitleTable->addRow();
        $actTitleTable->addCell(9500, $labelBgStyle)->addText("Actions proposés", $boldFont);
        
        $actTable = $section->addTable('InfoTable');
        $actTable->addRow();
        $actTable->addCell(3000, $headerBgStyle)->addText("Action", $boldFont);
        $actTable->addCell(2000, $headerBgStyle)->addText("Responsable", $boldFont);
        $actTable->addCell(1000, $headerBgStyle)->addText("Priorité", $boldFont);
        $actTable->addCell(1500, $headerBgStyle)->addText("Date limite", $boldFont);
        $actTable->addCell(1000, $headerBgStyle)->addText("Efficacité", $boldFont);
        $actTable->addCell(1000, $headerBgStyle)->addText("Etat", $boldFont);
        
        if (empty($dto->actionItems)) {
            $actTable->addRow();
            $actTable->addCell(9500, ['gridSpan' => 6])->addText("Non renseigné", ['italic' => true, 'color' => '9ca3af', 'name' => 'Arial'], ['alignment' => 'center']);
        } else {
            foreach ($dto->actionItems as $action) {
                $actTable->addRow();
                $actTable->addCell(3000)->addText($action['description'] ?? 'Non renseigné', $regularFont);
                $actTable->addCell(2000)->addText($action['responsable'] ?? 'Non renseigné', $regularFont);
                $actTable->addCell(1000)->addText($action['priorite'] ?? 'Majeure', $regularFont);
                $actTable->addCell(1500)->addText($action['echeance'] ?? 'Non renseigné', $regularFont);
                $actTable->addCell(1000)->addText($action['efficacite'] ?? '', $regularFont);
                $actTable->addCell(1000)->addText($action['statut'] ?? 'Non renseigné', $regularFont);
            }
        }

        $slug = preg_replace('/[^a-zA-Z0-9_-]/', '-', $dto->title);
        $filename = sprintf('PV_%s_%s.docx', $slug, date('Y-m-d'));
        $tempFile = (string) tempnam(sys_get_temp_dir(), 'word');

        $objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempFile);

        $durationMs = (int)((microtime(true) - $startTime) * 1000);
        $this->logger->info('export.generated', [
            'format' => 'word',
            'meetingId' => $dto->meetingId,
            'durationMs' => $durationMs
        ]);

        return new BinaryFileResponse($tempFile, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ], true, null, true, true);
    }

    public function generateExcel(MeetingExportDto $dto): Response
    {
        $startTime = microtime(true);
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Procès-Verbal');

        // Set default font to Aptos Narrow
        $spreadsheet->getDefaultStyle()->getFont()->setName('Aptos Narrow')->setSize(11);

        // Header Block
        $sheet->mergeCells('A1:B3');
        $sheet->setCellValue('A1', 'SmartMeet');
        $this->styleRange($sheet, 'A1:B3', true, 14, '1E3A8A', 'FFFFFF', 'center', 'center');
        $this->borderRange($sheet, 'A1:B3');

        $sheet->mergeCells('C1:H3');
        $sheet->setCellValue('C1', 'PV de Réunion');
        $this->styleRange($sheet, 'C1:H3', true, 12, '000000', 'FFFFFF', 'center', 'center');
        $this->borderRange($sheet, 'C1:H3');

        $sheet->mergeCells('I1:J1');
        $sheet->setCellValue('I1', 'Version :01');
        $this->styleRange($sheet, 'I1:J1', false, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'I1:J1');

        $sheet->mergeCells('I2:J2');
        $sheet->setCellValue('I2', 'Date:' . date('d/m/Y'));
        $this->styleRange($sheet, 'I2:J2', false, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'I2:J2');

        $sheet->mergeCells('I3:J3');
        $sheet->setCellValue('I3', 'FOR-01-SFM-2025');
        $this->styleRange($sheet, 'I3:J3', false, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'I3:J3');

        // Row 4: Type de la réunion
        $sheet->mergeCells('A4:B4');
        $sheet->setCellValue('A4', 'Type de la réunion');
        $this->styleRange($sheet, 'A4:B4', true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, 'A4:B4');

        $sheet->mergeCells('C4:J4');
        $sheet->setCellValue('C4', 'Interne');
        $this->styleRange($sheet, 'C4:J4', true, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'C4:J4');

        // Row 5: Date and Lieu
        $sheet->mergeCells('A5:B5');
        $sheet->setCellValue('A5', 'Date de la réunion ');
        $this->styleRange($sheet, 'A5:B5', true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, 'A5:B5');

        $sheet->mergeCells('C5:E5');
        $sheet->setCellValue('C5', $dto->date);
        $this->styleRange($sheet, 'C5:E5', false, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'C5:E5');

        $sheet->mergeCells('F5:G5');
        $sheet->setCellValue('F5', 'Lieu de la réunion');
        $this->styleRange($sheet, 'F5:G5', true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, 'F5:G5');

        $sheet->mergeCells('H5:J5');
        $sheet->setCellValue('H5', 'SFM-RDC');
        $this->styleRange($sheet, 'H5:J5', false, 11, '000000', 'FFFFFF', 'left', 'center');
        $this->borderRange($sheet, 'H5:J5');

        // Row 6-12: Objet De la Réunion
        $sheet->mergeCells('A6:B12');
        $sheet->setCellValue('A6', 'Objet De la Réunion ');
        $this->styleRange($sheet, 'A6:B12', true, 11, '000000', 'D9D9D9', 'center', 'center');
        $this->borderRange($sheet, 'A6:B12');

        $sheet->mergeCells('C6:J12');
        $sheet->setCellValue('C6', $dto->title);
        $this->styleRange($sheet, 'C6:J12', false, 11, '000000', 'FFFFFF', 'left', 'center', true);
        $this->borderRange($sheet, 'C6:J12');

        // Row 13: Liste des participants
        $sheet->mergeCells('A13:J13');
        $sheet->setCellValue('A13', 'Liste des participants');
        $this->styleRange($sheet, 'A13:J13', true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, 'A13:J13');

        // Row 14: Participant headers
        $sheet->mergeCells('A14:C14');
        $sheet->setCellValue('A14', 'Nom et Prénom');
        $this->styleRange($sheet, 'A14:C14', true, 11, '000000', 'F2F2F2', 'left', 'center');
        $this->borderRange($sheet, 'A14:C14');

        $sheet->mergeCells('D14:E14');
        $sheet->setCellValue('D14', 'Fonction');
        $this->styleRange($sheet, 'D14:E14', true, 11, '000000', 'F2F2F2', 'left', 'center');
        $this->borderRange($sheet, 'D14:E14');

        $sheet->mergeCells('F14:G14');
        $sheet->setCellValue('F14', 'Signature');
        $this->styleRange($sheet, 'F14:G14', true, 11, '000000', 'F2F2F2', 'left', 'center');
        $this->borderRange($sheet, 'F14:G14');

        $sheet->mergeCells('H14:J14');
        $sheet->setCellValue('H14', 'Commentaire');
        $this->styleRange($sheet, 'H14:J14', true, 11, '000000', 'F2F2F2', 'left', 'center');
        $this->borderRange($sheet, 'H14:J14');

        $row = 15;
        if (empty($dto->participants)) {
            $sheet->mergeCells("A$row:C$row");
            $sheet->setCellValue("A$row", 'Non renseigné');
            $this->styleRange($sheet, "A$row:C$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("A$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "A$row:C$row");

            $sheet->mergeCells("D$row:E$row");
            $sheet->setCellValue("D$row", 'Non renseigné');
            $this->styleRange($sheet, "D$row:E$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("D$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "D$row:E$row");

            $sheet->mergeCells("F$row:G$row");
            $this->borderRange($sheet, "F$row:G$row");

            $sheet->mergeCells("H$row:J$row");
            $this->borderRange($sheet, "H$row:J$row");

            $row++;
        } else {
            foreach ($dto->participants as $participant) {
                $sheet->mergeCells("A$row:C$row");
                $sheet->setCellValue("A$row", $participant['name']);
                $this->styleRange($sheet, "A$row:C$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "A$row:C$row");

                $sheet->mergeCells("D$row:E$row");
                $sheet->setCellValue("D$row", $participant['role']);
                $this->styleRange($sheet, "D$row:E$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "D$row:E$row");

                $sheet->mergeCells("F$row:G$row");
                $this->borderRange($sheet, "F$row:G$row");

                $sheet->mergeCells("H$row:J$row");
                $this->borderRange($sheet, "H$row:J$row");

                $row++;
            }
        }

        // Résumé Exécutif (7 rows)
        $startRow = $row;
        $endRow = $startRow + 6;

        $sheet->mergeCells("A$startRow:B$endRow");
        $sheet->setCellValue("A$startRow", 'Résumé Exécutif');
        $this->styleRange($sheet, "A$startRow:B$endRow", true, 11, '000000', 'D9D9D9', 'center', 'center');
        $this->borderRange($sheet, "A$startRow:B$endRow");

        $sheet->mergeCells("C$startRow:J$endRow");
        $sheet->setCellValue("C$startRow", $dto->executiveSummary);
        $this->styleRange($sheet, "C$startRow:J$endRow", false, 11, '000000', 'FFFFFF', 'left', 'top', true);
        $this->borderRange($sheet, "C$startRow:J$endRow");

        $row = $endRow + 1;

        // Points abordés (7 rows)
        $startRow = $row;
        $endRow = $startRow + 6;

        $sheet->mergeCells("A$startRow:B$endRow");
        $sheet->setCellValue("A$startRow", 'Points abordés');
        $this->styleRange($sheet, "A$startRow:B$endRow", true, 11, '000000', 'D9D9D9', 'center', 'center');
        $this->borderRange($sheet, "A$startRow:B$endRow");

        $sheet->mergeCells("C$startRow:J$endRow");
        $decisionsText = "";
        if (!empty($dto->decisions)) {
            foreach ($dto->decisions as $dec) {
                $decisionsText .= "• " . $dec . "\n";
            }
            $decisionsText = rtrim($decisionsText);
        } else {
            $decisionsText = "Non renseigné";
        }
        $sheet->setCellValue("C$startRow", $decisionsText);
        $this->styleRange($sheet, "C$startRow:J$endRow", false, 11, '000000', 'FFFFFF', 'left', 'top', true);
        $this->borderRange($sheet, "C$startRow:J$endRow");

        $row = $endRow + 1;

        // Liste de diffusion
        $sheet->mergeCells("A$row:J$row");
        $sheet->setCellValue("A$row", 'Liste de diffusion');
        $this->styleRange($sheet, "A$row:J$row", true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, "A$row:J$row");
        $row++;

        if (empty($dto->participants)) {
            $sheet->mergeCells("A$row:E$row");
            $sheet->setCellValue("A$row", 'Non renseigné');
            $this->styleRange($sheet, "A$row:E$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("A$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "A$row:E$row");

            $sheet->mergeCells("F$row:J$row");
            $this->borderRange($sheet, "F$row:J$row");
            $row++;
        } else {
            foreach ($dto->participants as $participant) {
                $sheet->mergeCells("A$row:E$row");
                $sheet->setCellValue("A$row", $participant['name']);
                $this->styleRange($sheet, "A$row:E$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "A$row:E$row");

                $sheet->mergeCells("F$row:J$row");
                $this->borderRange($sheet, "F$row:J$row");
                $row++;
            }
        }

        // Actions proposés
        $sheet->mergeCells("A$row:J$row");
        $sheet->setCellValue("A$row", 'Actions proposés');
        $this->styleRange($sheet, "A$row:J$row", true, 11, '000000', 'D9D9D9', 'left', 'center');
        $this->borderRange($sheet, "A$row:J$row");
        $row++;

        // Action Table Headers (Calibri, size 10)
        $sheet->mergeCells("A$row:C$row");
        $sheet->setCellValue("A$row", 'Action');
        $this->styleRange($sheet, "A$row:C$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("A$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "A$row:C$row");

        $sheet->setCellValue("D$row", 'Responsable');
        $this->styleRange($sheet, "D$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("D$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "D$row");

        $sheet->setCellValue("E$row", 'Priorité');
        $this->styleRange($sheet, "E$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("E$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "E$row");

        $sheet->mergeCells("F$row:G$row");
        $sheet->setCellValue("F$row", 'Date limite de réalisation');
        $this->styleRange($sheet, "F$row:G$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("F$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "F$row:G$row");

        $sheet->mergeCells("H$row:I$row");
        $sheet->setCellValue("H$row", 'Efficacité');
        $this->styleRange($sheet, "H$row:I$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("H$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "H$row:I$row");

        $sheet->setCellValue("J$row", 'Etat');
        $this->styleRange($sheet, "J$row", true, 10, '000000', 'F2F2F2', 'left', 'center');
        $sheet->getStyle("J$row")->getFont()->setName('Calibri');
        $this->borderRange($sheet, "J$row");

        $row++;

        // Action Rows
        if (empty($dto->actionItems)) {
            $sheet->mergeCells("A$row:C$row");
            $sheet->setCellValue("A$row", 'Non renseigné');
            $this->styleRange($sheet, "A$row:C$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("A$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "A$row:C$row");

            $sheet->setCellValue("D$row", 'Non renseigné');
            $this->styleRange($sheet, "D$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("D$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "D$row");

            $sheet->setCellValue("E$row", 'Non renseigné');
            $this->styleRange($sheet, "E$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("E$row")->getFont()->setItalic(true);
            $this->borderRange("E$row");

            $sheet->mergeCells("F$row:G$row");
            $sheet->setCellValue("F$row", 'Non renseigné');
            $this->styleRange($sheet, "F$row:G$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("F$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "F$row:G$row");

            $sheet->mergeCells("H$row:I$row");
            $this->borderRange($sheet, "H$row:I$row");

            $sheet->setCellValue("J$row", 'Non renseigné');
            $this->styleRange($sheet, "J$row", false, 11, '9CA3AF', 'FFFFFF', 'left', 'center');
            $sheet->getStyle("J$row")->getFont()->setItalic(true);
            $this->borderRange($sheet, "J$row");

            $row++;
        } else {
            foreach ($dto->actionItems as $action) {
                $sheet->mergeCells("A$row:C$row");
                $sheet->setCellValue("A$row", $action['description'] ?? 'Non renseigné');
                $this->styleRange($sheet, "A$row:C$row", false, 11, '000000', 'FFFFFF', 'left', 'center', true);
                $this->borderRange($sheet, "A$row:C$row");

                $sheet->setCellValue("D$row", $action['responsable'] ?? 'Non renseigné');
                $this->styleRange($sheet, "D$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "D$row");

                $sheet->setCellValue("E$row", $action['priorite'] ?? 'Majeure');
                $this->styleRange($sheet, "E$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "E$row");

                $sheet->mergeCells("F$row:G$row");
                $sheet->setCellValue("F$row", $action['echeance'] ?? 'Non renseigné');
                $this->styleRange($sheet, "F$row:G$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "F$row:G$row");

                $sheet->mergeCells("H$row:I$row");
                $this->borderRange($sheet, "H$row:I$row");

                $sheet->setCellValue("J$row", $action['statut'] ?? 'Non renseigné');
                $this->styleRange($sheet, "J$row", false, 11, '000000', 'FFFFFF', 'left', 'center');
                $this->borderRange($sheet, "J$row");

                $row++;
            }
        }

        // Apply dynamic auto column widths
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $slug = preg_replace('/[^a-zA-Z0-9_-]/', '-', $dto->title);
        $filename = sprintf('PV_%s_%s.xlsx', $slug, date('Y-m-d'));
        $tempFile = (string) tempnam(sys_get_temp_dir(), 'excel');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($tempFile);

        $durationMs = (int)((microtime(true) - $startTime) * 1000);
        $this->logger->info('export.generated', [
            'format' => 'excel',
            'meetingId' => $dto->meetingId,
            'durationMs' => $durationMs
        ]);

        return new BinaryFileResponse($tempFile, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ], true, null, true, true);
    }

    public function generateCsv(MeetingExportDto $dto): StreamedResponse
    {
        $startTime = microtime(true);
        $response = new StreamedResponse(function () use ($dto) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            // Headers aligned with the Excel Action table
            fputcsv($handle, ['Action', 'Responsable', 'Priorité', 'Date limite de réalisation', 'Efficacité', 'Etat']);

            // Data
            if (!empty($dto->actionItems)) {
                foreach ($dto->actionItems as $action) {
                    fputcsv($handle, [
                        $action['description'] ?? 'Non renseigné',
                        $action['responsable'] ?? 'Non renseigné',
                        $action['priorite'] ?? 'Majeure',
                        $action['echeance'] ?? 'Non renseigné',
                        $action['efficacite'] ?? '',
                        $action['statut'] ?? 'Non renseigné'
                    ]);
                }
            }

            fclose($handle);
        });

        $slug = preg_replace('/[^a-zA-Z0-9_-]/', '-', $dto->title);
        $filename = sprintf('PV_actions_%s_%s.csv', $slug, date('Y-m-d'));

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        $durationMs = (int)((microtime(true) - $startTime) * 1000);
        $this->logger->info('export.generated', [
            'format' => 'csv',
            'meetingId' => $dto->meetingId,
            'durationMs' => $durationMs
        ]);

        return $response;
    }

    private function styleRange(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $range, bool $bold, int $size, ?string $colorRGB = null, ?string $bgRGB = null, ?string $hAlign = null, ?string $vAlign = null, bool $wrapText = false): void
    {
        $style = $sheet->getStyle($range);
        $font = $style->getFont();
        $font->setBold($bold)->setSize($size);
        if ($colorRGB) {
            $font->getColor()->setRGB($colorRGB);
        }
        if ($bgRGB) {
            $style->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB($bgRGB);
        }
        $alignment = $style->getAlignment();
        if ($hAlign) {
            $alignment->setHorizontal($hAlign);
        }
        if ($vAlign) {
            $alignment->setVertical($vAlign);
        }
        if ($wrapText) {
            $alignment->setWrapText(true);
        }
    }

    private function borderRange(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => 'D1D5DB'],
                ],
            ],
        ]);
    }
}
