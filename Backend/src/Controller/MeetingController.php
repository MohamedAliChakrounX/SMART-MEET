<?php

namespace App\Controller;

use App\Entity\Meeting;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Service\MeetingService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

#[Route('/api/v1/meetings')]
#[IsGranted('ROLE_USER')]
class MeetingController extends AbstractController
{
    public function __construct(
        private MeetingService $meetingService,
        private MeetingRepository $meetingRepository,
        private EntityManagerInterface $entityManager,
        private SerializerInterface $serializer,
    ) {
    }

    #[Route('', name: 'api_meetings_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 20);

        $filterDeptId = $request->query->get('departmentId');
        $filterTeamId = $request->query->get('teamId');
        $filterProjectId = $request->query->get('projectId');

        $hasFilters = $filterDeptId || $filterTeamId || $filterProjectId;

        if ($hasFilters) {
            $result = $this->meetingService->listFilteredPaginated(
                $this->getUser(),
                $page,
                $limit,
                $filterDeptId,
                $filterTeamId,
                $filterProjectId,
            );
        } else {
            $result = $this->meetingService->listPaginated($this->getUser(), $page, $limit);
        }

        return $this->json([
            'data' => $result['data'],
            'meta' => [
                'currentPage' => $result['currentPage'],
                'totalPages' => $result['totalPages'],
                'totalItems' => $result['totalItems'],
                'itemsPerPage' => $limit,
            ],
        ], 200, [], ['groups' => ['meeting:read']]);
    }

    #[Route('/{id}', name: 'api_meetings_show', methods: ['GET'])]
    public function show(Uuid $id): JsonResponse
    {
        $meeting = $this->meetingService->getById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        $user = $this->getUser();
        assert($user instanceof User);
        if (!$this->meetingService->canViewMeeting($user, $meeting)) {
            throw $this->createAccessDeniedException('Access denied');
        }

        return $this->json($meeting, 200, [], ['groups' => ['meeting:read']]);
    }

    #[Route('/{id}', name: 'api_meetings_delete', methods: ['DELETE'])]
    public function delete(Uuid $id): Response
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $this->meetingService->softDelete($meeting);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/{id}/decisions', name: 'api_meetings_update_decisions', methods: ['PUT'])]
    public function updateDecisions(Uuid $id, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->find($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        if (isset($data['decisions']) && is_array($data['decisions'])) {
            $meeting->setDecisions($data['decisions']);
            $meeting->setUpdatedAt(new \DateTimeImmutable());
            $this->entityManager->flush();
        }

        return $this->json($meeting);
    }

    #[Route('/{id}/action-items', name: 'api_meetings_add_action_item', methods: ['POST'])]
    public function addActionItem(Uuid $id, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->find($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        if (isset($data['actionItem'])) {
            $items = $meeting->getActionItems() ?? [];
            $items[] = $data['actionItem'];
            $meeting->setActionItems($items);
            $meeting->setUpdatedAt(new \DateTimeImmutable());
            $this->entityManager->flush();
        }

        return $this->json($meeting, Response::HTTP_CREATED);
    }

    #[Route('/{id}/summary-status', name: 'api_meeting_summary_status', methods: ['GET'])]
    public function getSummaryStatus(Uuid $id): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $meeting->getSummary();
        
        return $this->json([
            'id' => $meeting->getId(),
            'status' => $summary ? 'complete' : 'pending',
            'summary' => $summary,
        ], 200, [], ['groups' => ['meeting:read']]);
    }

    #[Route('/{id}/generate-summary', name: 'api_meeting_generate_summary', methods: ['POST'])]
    public function generateSummary(Uuid $id, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR) ?? [];
        $detailLevel = $data['detailLevel'] ?? 'Medium';

        // In production, this would call the Flask AI service
        // For now, return pending status
        
        return $this->json([
            'id' => $meeting->getId(),
            'status' => 'processing',
            'message' => 'Summary generation has been queued. Check back later.',
            'detailLevel' => $detailLevel,
        ]);
    }

    #[Route('/{id}/summary/translate', name: 'api_meeting_translate_summary', methods: ['POST'])]
    public function translateSummary(Uuid $id, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $meeting->getSummary();
        if (!$summary) {
            throw $this->createNotFoundException('Summary not found for this meeting');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR) ?? [];
        $language = $data['language'] ?? 'en';

        // In production, this would call a translation service
        // For now, return the summary as-is with language metadata
        
        return $this->json([
            'id' => $summary->getId(),
            'language' => $language,
            'title' => $summary->getTitle(),
            'content' => $summary->getContent(),
            'message' => 'Translation would be performed by translation service',
        ]);
    }
}
