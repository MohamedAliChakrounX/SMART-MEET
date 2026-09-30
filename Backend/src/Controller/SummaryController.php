<?php

namespace App\Controller;

use App\Entity\Summary;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Repository\SummaryRepository;
use App\Service\MeetingService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

#[Route('/api/v1/summaries')]
#[IsGranted('ROLE_USER')]
class SummaryController extends AbstractController
{
    public function __construct(
        private SummaryRepository $summaryRepository,
        private MeetingRepository $meetingRepository,
        private MeetingService $meetingService,
        private EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/{meetingId}', name: 'api_summary_show', methods: ['GET'])]
    public function show(Uuid $meetingId): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($meetingId);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        $user = $this->getUser();
        assert($user instanceof User);
        if (!$this->meetingService->canViewSummary($user, $meeting)) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $this->summaryRepository->findByMeetingId($meetingId);

        if (!$summary) {
            // Return placeholder if summary not yet generated
            if ($meeting->getStatus() === 'In_Progress') {
                return $this->json([
                    'message' => 'Traitement IA en cours...',
                    'status' => 'in_progress',
                ], Response::HTTP_OK);
            }

            throw $this->createNotFoundException('Summary not found');
        }

        return $this->json($summary);
    }

    #[Route('/{meetingId}', name: 'api_summary_update', methods: ['PUT'])]
    public function update(Uuid $meetingId, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($meetingId);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $this->summaryRepository->findByMeetingId($meetingId);

        if (!$summary) {
            throw $this->createNotFoundException('Summary not found');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        if (isset($data['title'])) {
            $summary->setTitle($data['title']);
        }
        if (isset($data['content'])) {
            $summary->setContent($data['content']);
        }
        if (isset($data['focusAreas'])) {
            $summary->setFocusAreas($data['focusAreas']);
        }
        if (isset($data['type'])) {
            $summary->setType($data['type']);
        }

        $summary->setUpdatedAt(new \DateTimeImmutable());
        $summary->setVersion($summary->getVersion() + 1);

        $this->entityManager->flush();

        return $this->json($summary);
    }

    #[Route('/{meetingId}/settings', name: 'api_summary_update_settings', methods: ['PUT'])]
    public function updateSettings(Uuid $meetingId, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($meetingId);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $this->summaryRepository->findByMeetingId($meetingId);

        if (!$summary) {
            throw $this->createNotFoundException('Summary not found');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        if (isset($data['detailLevel'])) {
            $summary->setDetailLevel($data['detailLevel']);
        }

        $summary->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $this->json($summary);
    }
}
