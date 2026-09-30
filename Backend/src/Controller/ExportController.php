<?php

namespace App\Controller;

use App\Dto\MeetingExportDto;
use App\Entity\Meeting;
use App\Entity\User;
use App\Repository\MeetingRepository;
use App\Service\ExportService;
use App\Service\MeetingService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

#[Route('/api/v1/meetings')]
#[IsGranted('ROLE_USER')]
class ExportController extends AbstractController
{
    public function __construct(
        private ExportService $exportService,
        private MeetingService $meetingService,
        private MeetingRepository $meetingRepository
    ) {
    }

    #[Route('/{meetingId}/export/{format}', name: 'meeting_export', methods: ['GET'])]
    public function export(string $meetingId, string $format): Response
    {
        if (!Uuid::isValid($meetingId)) {
            return new JsonResponse(['error' => 'Invalid meeting ID'], Response::HTTP_BAD_REQUEST);
        }

        $id = Uuid::fromString($meetingId);
        $meeting = $this->meetingRepository->findOneNonDeletedById($id);

        if (!$meeting) {
            throw $this->createNotFoundException('Meeting not found');
        }

        /** @var User $user */
        $user = $this->getUser();
        if (!$this->meetingService->canViewMeeting($user, $meeting)) {
            throw $this->createAccessDeniedException('Access denied');
        }

        $summary = $meeting->getSummary();
        if (!$summary || $summary->getType() !== 'PV') {
            return new JsonResponse(['error' => 'No PV summary available for this meeting'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $dto = $this->buildDto($meeting);

        return match ($format) {
            'pdf' => $this->exportService->generatePdf($dto),
            'word' => $this->exportService->generateWord($dto),
            'excel' => $this->exportService->generateExcel($dto),
            'csv' => $this->exportService->generateCsv($dto),
            default => new JsonResponse(['error' => 'Invalid format. Allowed: pdf, word, excel, csv'], Response::HTTP_BAD_REQUEST),
        };
    }

    private function cleanActionText(string $text): string
    {
        $patterns = [
            '/\s*-\s*Responsable\s*$/ui',
            '/\s*-\s*Date\s+d\'échéance\s*$/ui',
            '/\s*-\s*\[Owner\s+or\s+TBD\]\s*$/ui',
            '/\s*-\s*\[Due\s+Date\s+or\s+None\]:\s*$/ui',
            '/\s*-\s*Date limite de réalisation\s*$/ui',
            '/\[Due\s+Date\s+or\s+None\]:\s*/ui',
            '/\[Owner\s+or\s+TBD\]:\s*/ui',
            '/:\s*$/',
        ];
        $cleaned = preg_replace($patterns, '', $text);
        // Clean leading/trailing parentheses and spaces
        $cleaned = trim($cleaned, '() ');
        return $cleaned;
    }

    private function buildDto(Meeting $meeting): MeetingExportDto
    {
        $summary = $meeting->getSummary();
        $owner = $meeting->getOwner();
        $project = $meeting->getProject();
        $content = $summary?->getContent() ?? [];
        $pvData = $content['pvData'] ?? null;

        // Extract title with user-edited title fallback
        $title = $meeting->getTitle() ?? "Non renseigné";
        if ($pvData && !empty($pvData['title'])) {
            $title = $pvData['title'];
        }

        // Try to find executive summary in content (user-edited pvData first)
        $executiveSummary = null;
        if ($pvData && isset($pvData['summary'])) {
            $executiveSummary = $pvData['summary'];
        }
        if (empty($executiveSummary)) {
            $executiveSummary = $content['executiveOverview'] ?? $content['summary'] ?? $content['executiveSummary'] ?? "Non renseigné";
        }
        if (is_array($executiveSummary)) {
            $executiveSummary = implode("\n", $executiveSummary);
        }

        // Try to find keyDecisions or decisions (user-edited pvData first)
        $decisions = [];
        if ($pvData && isset($pvData['points'])) {
            $decisions = $pvData['points'];
        }
        if (empty($decisions)) {
            $decisions = $meeting->getDecisions() ?? [];
        }
        if (empty($decisions)) {
            $decisions = $content['keyDecisions'] ?? $content['decisions'] ?? [];
        }

        // Normalize participants to array of arrays to preserve functions/roles
        $rawParticipants = [];
        if ($pvData && isset($pvData['participants'])) {
            $rawParticipants = $pvData['participants'];
        } else {
            $rawParticipants = $meeting->getParticipants() ?? [];
        }

        $normalizedParticipants = [];
        foreach ($rawParticipants as $p) {
            if (is_array($p)) {
                $name = $p['name'] ?? $p['displayName'] ?? "Participant";
                $role = $p['role'] ?? $p['function'] ?? $p['fonction'] ?? "Collaborateur";
            } else {
                $pStr = (string)$p;
                if (preg_match('/^(.*?)\s*\((.*?)\)$/', $pStr, $matches)) {
                    $name = trim($matches[1]);
                    $role = trim($matches[2]);
                } else {
                    $name = $pStr;
                    $role = "Collaborateur";
                }
            }
            $normalizedParticipants[] = [
                'name' => $name,
                'nom' => $name,
                'role' => $role,
                'function' => $role,
                'fonction' => $role,
            ];
        }

        // Normalize actions to support both French and English keys and handle shifted fields
        $rawActions = [];
        if ($pvData && isset($pvData['actions'])) {
            $rawActions = $pvData['actions'];
        } else {
            $rawActions = $meeting->getActionItems() ?? [];
        }

        $normalizedActions = [];
        foreach ($rawActions as $action) {
            $desc = $action['action'] ?? $action['description'] ?? "Non renseigné";
            $resp = $action['responsible'] ?? $action['responsable'] ?? "Non renseigné";
            $prio = $action['priority'] ?? $action['priorite'] ?? "";
            $due = $action['dueDate'] ?? $action['echeance'] ?? "Non renseigné";
            $eff = $action['efficiency'] ?? $action['efficacite'] ?? "";
            $stat = $action['status'] ?? $action['statut'] ?? "Non renseigné";

            // Reconstruct if the action description was split mid-parentheses (e.g. Action(Owner, Due Date))
            if (str_contains($desc, '(') && !str_contains($desc, ')')) {
                $full = $desc . ": " . $resp . ", " . $due;
                $full = preg_replace('/\bDue\s*Date\s*:\s*/ui', '', $full);
                if (preg_match('/^(.*?)\s*\((?:Owner|Responsable|by|par|due|due date|associate|assigned)\s*:\s*(.*?)\s*,\s*(.*?)\s*\)?$/i', $full, $matches)) {
                    $desc = trim($matches[1]);
                    $resp = trim($matches[2]);
                    $due = trim($matches[3]);
                }
            }

            // Clean suffixes first
            $desc = $this->cleanActionText($desc);
            $resp = $this->cleanActionText($resp);
            $due = $this->cleanActionText($due);

            // Shift correction if description is placeholder "[Action Description]"
            if (str_contains(strtolower($desc), 'action description') || strtolower($desc) === '[action description]' || empty($desc)) {
                // The actual action description is in $resp
                $desc = $resp;
                // Parse responsible and due date from $due
                $cleanDueStr = $this->cleanActionText($due);
                if (preg_match('/^(.*?)\s*-\s*(.*)$/', $cleanDueStr, $matches)) {
                    $resp = trim($matches[1]);
                    $due = trim($matches[2]);
                } else {
                    $resp = "Non renseigné";
                    $due = $cleanDueStr;
                }
            }

            // Parse "par Speaker X" or "by Speaker X" from description if responsible is placeholder or generic
            if (empty($resp) || $resp === 'Non renseigné' || str_contains(strtolower($resp), 'tbd') || str_contains(strtolower($resp), 'owner')) {
                if (preg_match('/(?:par|by)\s+(Speaker\s+[A-Z]|[a-zA-Z\s]+)/ui', $desc, $matches)) {
                    $potentialResp = trim($matches[1]);
                    if (!empty($potentialResp) && strlen($potentialResp) < 40) {
                        $resp = $potentialResp;
                    }
                }
            }

            // Clean up description if it ends with "par Speaker X" or similar
            $desc = preg_replace('/\s*(?:par|by)\s+Speaker\s+[A-Z]\b.*$/ui', '', $desc);

            // Sometimes the responsible field contains the due date (e.g. "le vendredi prochain" or "aujourd'hui")
            // and the due date field is empty.
            // If the due date is empty or "Non renseigné", and the responsible field has date-like words, let's swap or move it!
            $dateKeywords = ['vendredi', 'lundi', 'mardi', 'mercredi', 'jeudi', 'samedi', 'dimanche', 'prochain', 'aujourd\'hui', 'demain', 'tbd', 'date', 'semaine', 'today', 'tomorrow', 'next'];
            $respIsDate = false;
            foreach ($dateKeywords as $kw) {
                if (str_contains(strtolower($resp), $kw)) {
                    $respIsDate = true;
                    break;
                }
            }

            if ($respIsDate && (empty($due) || $due === 'Non renseigné' || empty(trim($due, '() ')))) {
                $due = $resp;
                // Re-extract responsible from description or set TBD
                if (preg_match('/(?:par|by)\s+(Speaker\s+[A-Z]|[a-zA-Z\s]+)/ui', $desc, $matches)) {
                    $resp = trim($matches[1]);
                } else {
                    $resp = "Non renseigné";
                }
            }

            // Clean trailing parentheses again
            $desc = $this->cleanActionText($desc);
            $resp = $this->cleanActionText($resp);

            // Clean and format the Due Date ($due)
            $dueClean = trim($due);
            $dueClean = trim($dueClean, '()[] ');
            // Remove "Due Date", "échéance", or other prefix residues
            $dueClean = preg_replace('/^(?:due\s*date|échéance|echeance|date limite)(?:\s*,\s*|:\s*|\s*-\s*|\s+)/ui', '', $dueClean);
            $dueClean = trim($dueClean, '()[] ');

            $lowerDue = strtolower($dueClean);
            if (empty($dueClean) || $lowerDue === 'tbd' || $lowerDue === 'none' || $lowerDue === 'non renseigné' || $lowerDue === 'non renseigne' || $lowerDue === 'due date') {
                $due = "À définir";
            } else {
                $due = $dueClean;
            }

            // Dynamically assign priority based on content analysis if empty
            if (empty($prio) || $prio === 'Non renseigné') {
                $descLower = strtolower($desc);
                if (preg_match('/\b(urgent|immédiat|impératif|bug|fix|error|problème|important|must|blocker|bloquant|critical|critique|prioritaire|priorité haute)\b/u', $descLower)) {
                    $prio = "Majeure";
                } elseif (preg_match('/\b(improve|améliorer|optionnel|recherche|étude|secondaire|mineur|faible|basse|low|nice to have|discuter|refactor)\b/u', $descLower)) {
                    $prio = "Mineure";
                } else {
                    $prio = "Moyenne";
                }
            }

            // Normalize priority (priorité) to standard French
            $prio = match (strtolower(trim($prio))) {
                'haute', 'high', 'majeure', 'urgent' => 'Majeure',
                'moyenne', 'medium' => 'Moyenne',
                'basse', 'low', 'mineure' => 'Mineure',
                default => 'Majeure',
            };

            // If status is empty, fallback to "En cours"
            if (empty($stat) || $stat === 'Non renseigné') {
                $stat = 'En cours';
            }

            // Normalize status (état) to standard French
            $stat = match (strtolower(trim($stat))) {
                'en cours', 'in progress', 'in_progress', 'cours' => 'En cours',
                'fait', 'completed', 'terminé', 'termine', 'done' => 'Fait',
                'à faire', 'todo', 'to do', 'a faire' => 'À faire',
                'en attente', 'pending', 'attente' => 'En attente',
                default => 'En cours',
            };

            $normalizedActions[] = [
                'action' => $desc,
                'description' => $desc,
                'responsible' => $resp,
                'responsable' => $resp,
                'priority' => $prio,
                'priorite' => $prio,
                'dueDate' => $due,
                'echeance' => $due,
                'efficiency' => $eff,
                'efficacite' => $eff,
                'status' => $stat,
                'statut' => $stat,
            ];
        }

        return new MeetingExportDto(
            meetingId: $meeting->getId()->toRfc4122(),
            title: $title,
            date: $meeting->getStartAt()?->format('d/m/Y H:i') ?? "Non renseigné",
            duration: $meeting->getDurationMinutes() ? $meeting->getDurationMinutes() . " min" : "Non renseigné",
            status: $meeting->getStatus() ?? "Non renseigné",
            description: $meeting->getDescription() ?? "Non renseigné",
            project: $project?->getName() ?? "Non renseigné",
            organizer: $owner ? ($owner->getFirstName() . ' ' . $owner->getLastName()) : "Non renseigné",
            participants: $normalizedParticipants,
            executiveSummary: (string) $executiveSummary,
            decisions: $decisions,
            actionItems: $normalizedActions,
            pvGeneratedAt: $summary?->getCreatedAt()?->format('d/m/Y H:i') ?? "Non renseigné",
            detailLevel: $summary?->getDetailLevel() ?? "Non renseigné"
        );
    }
}
