<?php

namespace App\Controller;

use App\Entity\AnalyticData;
use App\Entity\BehavioralInterpretation;
use App\Entity\Meeting;
use App\Entity\Summary;
use App\Entity\TranscriptSegment;
use App\Repository\ProjectRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Receives complete AI meeting results (meeting + transcript + summary + analytics)
 * from the frontend after Flask processing is done, and persists them
 * into PostgreSQL so they appear in the archive.
 *
 * Interpretation is stored in behavioral_interpretation (dedicated table).
 * Raw OpenSMILE metrics are stored in analytic_data.
 */
#[Route('/api/v1/meetings')]
#[IsGranted('ROLE_USER')]
class AiPersistController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ProjectRepository $projectRepository,
    ) {
    }

    #[Route('/persist-ai-result', name: 'api_meetings_persist_ai', methods: ['POST'])]
    public function persistAiResult(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $user = $this->getUser();

        // ── 1. Create Meeting ─────────────────────────────────────────────────
        $meeting = new Meeting();
        $meeting->setOwner($user);
        $meeting->setTitle($data['title'] ?? 'Réunion IA');
        $meeting->setDescription($data['description'] ?? null);

        $startAt = isset($data['date'])
            ? new \DateTimeImmutable($data['date'])
            : new \DateTimeImmutable();
        $meeting->setStartAt($startAt);

        $meeting->setDurationMinutes($data['durationMinutes'] ?? 0);
        $meeting->setStatus('Completed');
        $meeting->setParticipants($data['participants'] ?? []);
        $meeting->setStarred(false);
        $meeting->setDecisions($data['decisions'] ?? []);
        $meeting->setActionItems($data['actionItems'] ?? []);
        if (!empty($data['projectId'])) {
            $project = $this->projectRepository->find($data['projectId']);
            if ($project) {
                $meeting->setProject($project);
            }
        }

        $this->entityManager->persist($meeting);

        // ── 2. Create Transcript Segments ─────────────────────────────────────
        if (isset($data['transcript']) && is_array($data['transcript'])) {
            foreach ($data['transcript'] as $index => $seg) {
                $segment = new TranscriptSegment();
                $segment->setMeeting($meeting);
                $segment->setSpeaker($seg['speaker'] ?? 'Unknown');
                $segment->setSpeakerColor($seg['speakerColor'] ?? '#6B7280');
                $segment->setTimeStart($this->parseTimestamp($seg['timeStart'] ?? 0));
                $segment->setTimeEnd($this->parseTimestamp($seg['timeEnd'] ?? 0));
                $segment->setContent($seg['text'] ?? $seg['content'] ?? '');
                $segment->setOrderIndex($seg['orderIndex'] ?? $index);
                $this->entityManager->persist($segment);
            }
        }

        // ── 3. Create Summary (PV) ────────────────────────────────────────────
        if (isset($data['summary']) && is_array($data['summary'])) {
            $s            = $data['summary'];
            $allowedLevels = ['Low', 'Medium', 'High', 'Full'];
            $detailLevel  = $s['detailLevel'] ?? 'Medium';
            if (!in_array($detailLevel, $allowedLevels, true)) {
                $detailLevel = 'Medium';
            }

            $summary = new Summary();
            $summary->setMeeting($meeting);
            $summary->setTitle($s['title'] ?? $data['title'] ?? 'PV');
            $summary->setType('PV');
            $summary->setContent(is_array($s['content'] ?? null) ? $s['content'] : $s);
            $summary->setFocusAreas($s['focusAreas'] ?? []);
            $summary->setDetailLevel($detailLevel);
            $this->entityManager->persist($summary);
        }

        // ── 4. Persist analytics ──────────────────────────────────────────────
        if (isset($data['analytics']) && is_array($data['analytics'])) {
            foreach ($data['analytics'] as $key => $value) {

                // ai_interpretation → dedicated behavioral_interpretation table
                if ($key === 'ai_interpretation') {
                    $interp = new BehavioralInterpretation();
                    $interp->setMeeting($meeting);
                    $interp->setMeetingDynamics($value['meeting_dynamics'] ?? '');
                    $interp->setSpeakers($value['speakers'] ?? []);
                    $interp->setModel($data['ai_model'] ?? 'qwen3:4b');
                    $interp->setLanguage($data['language'] ?? 'fr');
                    $this->entityManager->persist($interp);
                    continue;
                }

                // All other metrics → analytic_data (OpenSMILE speaker metrics, etc.)
                $analytic = new AnalyticData();
                $analytic->setMeeting($meeting);
                $analytic->setMetricKey($key);
                $analytic->setMetricValue(is_array($value) ? $value : [$key => $value]);
                $this->entityManager->persist($analytic);
            }
        }

        $this->entityManager->flush();

        return $this->json([
            'success'   => true,
            'meetingId' => (string) $meeting->getId(),
            'message'   => 'Meeting, transcript, summary and analytics persisted to database.',
        ], Response::HTTP_CREATED, [], ['groups' => ['meeting:read']]);
    }

    /**
     * Converts a timestamp string ("MM:SS" or "HH:MM:SS") or number to seconds.
     */
    private function parseTimestamp(mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_float($value)) {
            return (int) $value;
        }
        if (is_string($value) && str_contains($value, ':')) {
            $parts = array_map('intval', explode(':', $value));
            return match (count($parts)) {
                3 => $parts[0] * 3600 + $parts[1] * 60 + $parts[2],
                2 => $parts[0] * 60 + $parts[1],
                default => 0,
            };
        }
        return (int) ($value ?? 0);
    }
}
