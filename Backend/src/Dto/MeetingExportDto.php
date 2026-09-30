<?php

namespace App\Dto;

readonly class MeetingExportDto
{
    /**
     * @param array<string> $participants
     * @param array<string> $decisions
     * @param array<array{description: string, responsable: string, echeance: string, statut: string}> $actionItems
     */
    public function __construct(
        public string $meetingId,
        public string $title = "Non renseigné",
        public string $date = "Non renseigné",
        public string $duration = "Non renseigné",
        public string $status = "Non renseigné",
        public string $description = "Non renseigné",
        public string $project = "Non renseigné",
        public string $organizer = "Non renseigné",
        public array $participants = [],
        public string $executiveSummary = "Non renseigné",
        public array $decisions = [],
        public array $actionItems = [],
        public string $pvGeneratedAt = "Non renseigné",
        public string $detailLevel = "Non renseigné"
    ) {
    }
}
