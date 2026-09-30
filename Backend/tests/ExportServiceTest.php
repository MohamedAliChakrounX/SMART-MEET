<?php

namespace App\Tests\Service;

use App\Dto\MeetingExportDto;
use App\Service\ExportService;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportServiceTest extends KernelTestCase
{
    private ExportService $exportService;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = self::getContainer();
        $this->exportService = $container->get(ExportService::class);
    }

    public function testExports(): void
    {
        $dto = new MeetingExportDto(
            meetingId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'UX Cosap nouvelle version multi-tenant',
            date: '09/04/2025 10:00',
            duration: '60 min',
            status: 'Completed',
            description: 'Scénarios de gestion des tâches et TODO liste. Scénarios de gestion des projets. Scénarios de paramétrages général.',
            project: 'Cosap',
            organizer: 'M. Sami Tabbane',
            participants: [
                ['name' => 'M. Sami Tabbane', 'role' => 'Directeur général'],
                ['name' => 'M. Hassen Sghir', 'role' => 'Directeur Technique'],
                ['name' => 'Mme. Amani Wattas', 'role' => 'Développeur & chargée MOA']
            ],
            executiveSummary: "Scénarios de gestion des tâches et TODO liste\nScénarios de gestion des projets\nScénarios de paramétrages général et spécifique de l'application, des relances et des rappels",
            decisions: [
                'Adopter le nouveau design UX pour multi-tenant',
                'Finaliser les spécifications avant la fin de semaine'
            ],
            actionItems: [
                [
                    'description' => 'Réalisation des scénarios détaillés de la partie gestion des projets',
                    'action' => 'Réalisation des scénarios détaillés de la partie gestion des projets',
                    'responsable' => 'Bilel Souli + Amani Wattas',
                    'responsible' => 'Bilel Souli + Amani Wattas',
                    'priorite' => 'Majeure',
                    'priority' => 'Majeure',
                    'echeance' => '15/04/2025',
                    'dueDate' => '15/04/2025',
                    'statut' => 'En cours',
                    'status' => 'En cours'
                ],
                [
                    'description' => 'Réalisation des scénarios détaillés de la partie gestion des tâches',
                    'action' => 'Réalisation des scénarios détaillés de la partie gestion des tâches',
                    'responsable' => 'Bilel Souli + Amani Wattas',
                    'responsible' => 'Bilel Souli + Amani Wattas',
                    'priorite' => 'Majeure',
                    'priority' => 'Majeure',
                    'echeance' => '15/04/2025',
                    'dueDate' => '15/04/2025',
                    'statut' => 'À faire',
                    'status' => 'À faire'
                ]
            ],
            pvGeneratedAt: '09/04/2025 11:30',
            detailLevel: 'High'
        );

        $outputDir = __DIR__ . '/../../Export/TestOutputs';
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0777, true);
        }

        // 1. PDF Export
        $pdfResponse = $this->exportService->generatePdf($dto);
        $this->assertEquals(200, $pdfResponse->getStatusCode());
        $this->assertEquals('application/pdf', $pdfResponse->headers->get('Content-Type'));
        file_put_contents($outputDir . '/test_export.pdf', $pdfResponse->getContent());

        // 2. Word Export
        $wordResponse = $this->exportService->generateWord($dto);
        $this->assertInstanceOf(BinaryFileResponse::class, $wordResponse);
        $this->assertEquals(200, $wordResponse->getStatusCode());
        copy($wordResponse->getFile()->getPathname(), $outputDir . '/test_export.docx');

        // 3. Excel Export
        $excelResponse = $this->exportService->generateExcel($dto);
        $this->assertInstanceOf(BinaryFileResponse::class, $excelResponse);
        $this->assertEquals(200, $excelResponse->getStatusCode());
        copy($excelResponse->getFile()->getPathname(), $outputDir . '/test_export.xlsx');

        // 4. CSV Export
        $csvResponse = $this->exportService->generateCsv($dto);
        $this->assertInstanceOf(StreamedResponse::class, $csvResponse);
        $this->assertEquals(200, $csvResponse->getStatusCode());
        ob_start();
        $csvResponse->sendContent();
        $csvContent = ob_get_clean();
        file_put_contents($outputDir . '/test_export.csv', $csvContent);

        $this->assertFileExists($outputDir . '/test_export.pdf');
        $this->assertFileExists($outputDir . '/test_export.docx');
        $this->assertFileExists($outputDir . '/test_export.xlsx');
        $this->assertFileExists($outputDir . '/test_export.csv');
    }
}
