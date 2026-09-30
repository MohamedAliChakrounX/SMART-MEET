<?php

namespace App\Controller;

use App\Entity\AnalyticData;
use App\Entity\Summary;
use App\Entity\TranscriptSegment;
use App\Repository\MeetingRepository;
use App\Repository\SummaryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/v1/internal/meetings/{id}/ai-results')]
class InternalWebhookController extends AbstractController
{
    public function __construct(
        private MeetingRepository $meetingRepository,
        private SummaryRepository $summaryRepository,
        private EntityManagerInterface $entityManager,
        private string $internalWebhookSecret,
    ) {
    }

    #[Route('', name: 'api_internal_ai_results', methods: ['POST'])]
    public function receiveAiResults(Uuid $id, Request $request): JsonResponse
    {
        // Validate X-Internal-Secret header
        $secret = $request->headers->get('X-Internal-Secret');
        if (!hash_equals($this->internalWebhookSecret, $secret ?? '')) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $meeting = $this->meetingRepository->find($id);
        if (!$meeting) {
            return $this->json(['error' => 'Meeting not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Process transcript segments
        if (isset($data['transcript']) && is_array($data['transcript'])) {
            foreach ($data['transcript'] as $segmentData) {
                $segment = new TranscriptSegment();
                $segment->setMeeting($meeting);
                $segment->setSpeaker($segmentData['speaker'] ?? 'Unknown');
                $segment->setSpeakerColor($segmentData['speakerColor'] ?? '#000000');
                $segment->setTimeStart($segmentData['timeStart'] ?? 0);
                $segment->setTimeEnd($segmentData['timeEnd'] ?? 0);
                $segment->setContent($segmentData['content'] ?? '');
                $segment->setOrderIndex($segmentData['orderIndex'] ?? 0);
                $this->entityManager->persist($segment);
            }
        }

        // Process summary (idempotent: fetch existing or create new)
        if (isset($data['summary']) && is_array($data['summary'])) {
            $summary = $this->summaryRepository->findByMeetingId($id) ?? new Summary();
            $summary->setMeeting($meeting);
            $summary->setTitle($data['summary']['title'] ?? 'AI Generated Summary');
            $summary->setType($data['summary']['type'] ?? 'PV');
            $summary->setContent($data['summary']['content'] ?? []);
            $summary->setFocusAreas($data['summary']['focusAreas'] ?? []);
            $summary->setDetailLevel($data['summary']['detailLevel'] ?? 'Medium');
            
            // Only persist if new entity (no ID yet)
            if (!$summary->getId()) {
                $this->entityManager->persist($summary);
            }
        }

        // Process analytics
        if (isset($data['analytics']) && is_array($data['analytics'])) {
            foreach ($data['analytics'] as $key => $value) {
                $analytic = new AnalyticData();
                $analytic->setMeeting($meeting);
                $analytic->setMetricKey($key);
                $analytic->setMetricValue(is_array($value) ? $value : [$key => $value]);
                $this->entityManager->persist($analytic);
            }
        }

        // Update meeting status to Completed if provided
        if (isset($data['status'])) {
            $meeting->setStatus($data['status']);
        }

        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'message' => 'AI results persisted successfully',
        ]);
    }
}
