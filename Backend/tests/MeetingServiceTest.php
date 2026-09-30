<?php

namespace App\Tests;

use App\Entity\Meeting;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Service\MeetingService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class MeetingServiceTest extends TestCase
{
    private MeetingService $meetingService;
    private MeetingRepository|\PHPUnit\Framework\MockObject\MockObject $meetingRepository;
    private EntityManagerInterface|\PHPUnit\Framework\MockObject\MockObject $entityManager;

    protected function setUp(): void
    {
        $this->meetingRepository = $this->createMock(MeetingRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->meetingService = new MeetingService($this->meetingRepository, $this->entityManager);
    }

    public function testListPaginatedReturnsOnlyNonDeletedMeetings(): void
    {
        $userId = Uuid::v4();
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn($userId);

        $meeting1 = $this->createMock(Meeting::class);
        $meeting2 = $this->createMock(Meeting::class);

        $this->meetingRepository
            ->expects($this->once())
            ->method('findPaginatedByUser')
            ->with($userId, 1, 20)
            ->willReturn([$meeting1, $meeting2]);

        $this->meetingRepository
            ->expects($this->once())
            ->method('countByUser')
            ->with($userId)
            ->willReturn(2);

        $result = $this->meetingService->listPaginated($user, 1, 20);

        $this->assertCount(2, $result['data']);
        $this->assertEquals(2, $result['totalItems']);
        $this->assertEquals(1, $result['totalPages']);
        $this->assertEquals(1, $result['currentPage']);
    }

    public function testSoftDeleteSetsDeletedAtTimestamp(): void
    {
        $meetingId = Uuid::v4();
        $meeting = $this->createMock(Meeting::class);

        $this->meetingRepository
            ->expects($this->once())
            ->method('find')
            ->with($meetingId)
            ->willReturn($meeting);

        $meeting->expects($this->once())->method('setDeletedAt');
        $this->entityManager->expects($this->once())->method('flush');

        $this->meetingService->softDelete($meetingId);
    }

    public function testGetByIdThrowsNotFoundOnMissingMeeting(): void
    {
        $meetingId = Uuid::v4();

        $this->meetingRepository
            ->expects($this->once())
            ->method('findOneNonDeletedById')
            ->with($meetingId)
            ->willReturn(null);

        $result = $this->meetingService->getById($meetingId);
        $this->assertNull($result);
    }

    public function testGetByIdThrowsNotFoundOnSoftDeletedMeeting(): void
    {
        $meetingId = Uuid::v4();
        $meeting = $this->createMock(Meeting::class);
        $meeting->method('getDeletedAt')->willReturn(new \DateTimeImmutable());

        $this->meetingRepository
            ->expects($this->once())
            ->method('findOneNonDeletedById')
            ->with($meetingId)
            ->willReturn(null);

        $result = $this->meetingService->getById($meetingId);
        $this->assertNull($result);
    }
}
