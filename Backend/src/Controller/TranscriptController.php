<?php

namespace App\Controller;

use App\Entity\TranscriptSegment;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Repository\TranscriptSegmentRepository;
use App\Service\MeetingService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

#[Route('/api/v1/meetings/{id}/transcript')]
#[IsGranted('ROLE_USER')]
class TranscriptController extends AbstractController
{
    public function __construct(
        private TranscriptSegmentRepository $transcriptRepository,
        private MeetingRepository $meetingRepository,
        private MeetingService $meetingService,
        private EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', name: 'api_transcript_index', methods: ['GET'])]
    public function index(Uuid $id): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        $user = $this->getUser();
        assert($user instanceof User);
        if (!$this->meetingService->canViewTranscript($user, $meeting)) {
            throw $this->createAccessDeniedException('Access denied');
        }

        // Return all segments without pagination (FR-007)
        $segments = $this->transcriptRepository->findByMeetingOrderedByIndex($id);

        // If meeting status is In_Progress, show placeholder
        if ($meeting->getStatus() === 'In_Progress') {
            return $this->json([
                'message' => 'Traitement IA en cours...',
                'segments' => [],
                'status' => 'in_progress',
            ]);
        }

        return $this->json($segments);
    }

    #[Route('', name: 'api_transcript_update', methods: ['PUT'])]
    public function update(Uuid $id, Request $request): JsonResponse
    {
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        if ($meeting->getOwner() !== $this->getUser() && !$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        
        if (isset($data['segments']) && is_array($data['segments'])) {
            foreach ($data['segments'] as $segmentData) {
                $segment = $this->entityManager->getRepository(TranscriptSegment::class)->find($segmentData['id'] ?? null);
                // Verify segment belongs to this meeting (prevent unauthorized modifications)
                if ($segment && $segment->getMeeting() === $meeting) {
                    if (isset($segmentData['content'])) {
                        $segment->setContent($segmentData['content']);
                        $segment->setUpdatedAt(new \DateTimeImmutable());
                    }
                }
            }
        }

        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'segments' => $this->transcriptRepository->findByMeetingOrderedByIndex($id),
        ]);
    }
}
