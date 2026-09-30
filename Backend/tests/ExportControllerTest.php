<?php

namespace App\Tests\Controller;

use App\Controller\ExportController;
use App\Entity\Meeting;
use App\Entity\Summary;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Service\ExportService;
use App\Service\MeetingService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class ExportControllerTest extends TestCase
{
    private ExportController $controller;
    private ExportService|\PHPUnit\Framework\MockObject\MockObject $exportService;
    private MeetingService|\PHPUnit\Framework\MockObject\MockObject $meetingService;
    private MeetingRepository|\PHPUnit\Framework\MockObject\MockObject $meetingRepository;

    protected function setUp(): void
    {
        $this->exportService = $this->createMock(ExportService::class);
        $this->meetingService = $this->createMock(MeetingService::class);
        $this->meetingRepository = $this->createMock(MeetingRepository::class);
        $this->controller = new ExportController(
            $this->exportService,
            $this->meetingService,
            $this->meetingRepository
        );
    }

    public function testBuildDtoUsesPvData(): void
    {
        // 1. Arrange
        $meeting = new Meeting();
        $refMeeting = new \ReflectionClass(Meeting::class);
        $propId = $refMeeting->getProperty('id');
        $propId->setAccessible(true);
        $propId->setValue($meeting, Uuid::v4());

        $meeting->setTitle("Original Title");
        $meeting->setStartAt(new \DateTimeImmutable('2026-06-01 10:00:00'));
        $meeting->setDurationMinutes(45);
        $meeting->setStatus("Completed");

        $summary = new Summary();
        $summary->setType("PV");
        
        $pvData = [
            'title' => 'User Edited Title',
            'summary' => 'This is the user edited executive summary.',
            'points' => [
                'First user decision',
                'Second user decision'
            ],
            'participants' => [
                ['name' => 'User Alice', 'role' => 'Tech Lead'],
                ['name' => 'User Bob', 'role' => 'Product Owner']
            ],
            'actions' => [
                [
                    'action' => 'Action item 1',
                    'responsible' => 'User Alice',
                    'priority' => 'Majeure',
                    'dueDate' => 'Due Date, TBD',
                    'status' => 'En cours'
                ],
                [
                    'action' => 'Action item 2',
                    'responsible' => 'User Bob',
                    'priority' => 'Mineure',
                    'dueDate' => '2026-06-15',
                    'status' => 'Fait'
                ]
            ]
        ];

        $summary->setContent(['pvData' => $pvData]);
        $meeting->setSummary($summary);

        // 2. Act using Reflection to access private buildDto method
        $reflection = new \ReflectionClass(ExportController::class);
        $method = $reflection->getMethod('buildDto');
        $method->setAccessible(true);
        
        /** @var \App\Dto\MeetingExportDto $dto */
        $dto = $method->invoke($this->controller, $meeting);

        // 3. Assert
        $this->assertEquals('User Edited Title', $dto->title);
        $this->assertEquals('This is the user edited executive summary.', $dto->executiveSummary);
        $this->assertCount(2, $dto->decisions);
        $this->assertEquals('First user decision', $dto->decisions[0]);
        $this->assertCount(2, $dto->participants);
        $this->assertEquals('User Alice', $dto->participants[0]['name']);
        $this->assertEquals('Tech Lead', $dto->participants[0]['role']);

        $this->assertCount(2, $dto->actionItems);
        
        // Check Action item 1 (cleaned due date, mapped status)
        $this->assertEquals('Action item 1', $dto->actionItems[0]['action']);
        $this->assertEquals('User Alice', $dto->actionItems[0]['responsible']);
        $this->assertEquals('Majeure', $dto->actionItems[0]['priority']);
        $this->assertEquals('À définir', $dto->actionItems[0]['dueDate']); // Cleaned from 'Due Date, TBD'
        $this->assertEquals('En cours', $dto->actionItems[0]['status']);

        // Check Action item 2 (untouched due date, mapped status)
        $this->assertEquals('Action item 2', $dto->actionItems[1]['action']);
        $this->assertEquals('User Bob', $dto->actionItems[1]['responsible']);
        $this->assertEquals('Mineure', $dto->actionItems[1]['priority']);
        $this->assertEquals('2026-06-15', $dto->actionItems[1]['dueDate']);
        $this->assertEquals('Fait', $dto->actionItems[1]['status']);
    }
}
