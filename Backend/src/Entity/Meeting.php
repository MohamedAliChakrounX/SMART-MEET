<?php

namespace App\Entity;

use App\Repository\MeetingRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: MeetingRepository::class)]
class Meeting
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?Uuid $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['meeting:read', 'meeting:write'])]
    #[Assert\NotBlank(message: 'Title cannot be blank')]
    #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters')]
    private ?string $title = null;

    #[ORM\Column]
    #[Groups(['meeting:read', 'meeting:write'])]
    #[Assert\NotNull(message: 'Start time is required')]
    private ?\DateTimeImmutable $startAt = null;

    #[ORM\Column]
    #[Groups(['meeting:read', 'meeting:write'])]
    #[Assert\NotNull(message: 'Duration is required')]
    #[Assert\Positive(message: 'Duration must be a positive number')]
    private ?int $durationMinutes = null;

    #[ORM\Column(length: 50)]
    #[Groups(['meeting:read', 'meeting:write'])]
    #[Assert\NotBlank(message: 'Status cannot be blank')]
    #[Assert\Choice(choices: ['In_Progress', 'Completed', 'Failed'], message: 'Invalid status')]
    private ?string $status = null;

    #[ORM\Column(type: 'json')]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?array $participants = [];

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?string $description = null;

    #[ORM\Column]
    #[Groups(['meeting:read', 'meeting:write'])]
    private bool $starred = false;

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?array $decisions = [];

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?array $actionItems = [];

    #[ORM\Column(nullable: true)]
    #[Groups(['meeting:read'])]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\Column]
    #[Groups(['meeting:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    #[Groups(['meeting:read'])]
    private \DateTimeImmutable $updatedAt;

    #[ORM\OneToMany(targetEntity: TranscriptSegment::class, mappedBy: 'meeting', orphanRemoval: true)]
    // Note: Do NOT add #[Groups] here to prevent circular reference
    private Collection $transcriptSegments;

    #[ORM\OneToOne(targetEntity: Summary::class, mappedBy: 'meeting', orphanRemoval: true)]
    // Note: Do NOT add #[Groups] here to prevent circular reference
    private ?Summary $summary = null;

    #[ORM\OneToMany(targetEntity: AnalyticData::class, mappedBy: 'meeting', orphanRemoval: true)]
    // Note: Do NOT add #[Groups] here to prevent circular reference
    private Collection $analyticData;

    #[ORM\OneToOne(targetEntity: BehavioralInterpretation::class, mappedBy: 'meeting', orphanRemoval: true)]
    // Note: Do NOT add #[Groups] here to prevent circular reference
    private ?BehavioralInterpretation $behavioralInterpretation = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['meeting:write'])]
    private ?User $owner = null;

    #[ORM\ManyToOne(targetEntity: Project::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['meeting:read', 'meeting:write'])]
    private ?Project $project = null;

    public function __construct()
    {
        $this->transcriptSegments = new ArrayCollection();
        $this->analyticData = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getStartAt(): ?\DateTimeImmutable
    {
        return $this->startAt;
    }

    public function setStartAt(\DateTimeImmutable $startAt): static
    {
        $this->startAt = $startAt;

        return $this;
    }

    public function getDurationMinutes(): ?int
    {
        return $this->durationMinutes;
    }

    public function setDurationMinutes(int $durationMinutes): static
    {
        $this->durationMinutes = $durationMinutes;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getParticipants(): ?array
    {
        return $this->participants;
    }

    public function setParticipants(?array $participants): static
    {
        $this->participants = $participants;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function isStarred(): bool
    {
        return $this->starred;
    }

    public function setStarred(bool $starred): static
    {
        $this->starred = $starred;

        return $this;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function setDeletedAt(?\DateTimeImmutable $deletedAt): static
    {
        $this->deletedAt = $deletedAt;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function getProject(): ?Project
    {
        return $this->project;
    }

    public function setProject(?Project $project): static
    {
        $this->project = $project;

        return $this;
    }

    /**
     * @return Collection<int, TranscriptSegment>
     */
    public function getTranscriptSegments(): Collection
    {
        return $this->transcriptSegments;
    }

    public function addTranscriptSegment(TranscriptSegment $transcriptSegment): static
    {
        if (!$this->transcriptSegments->contains($transcriptSegment)) {
            $this->transcriptSegments->add($transcriptSegment);
            $transcriptSegment->setMeeting($this);
        }

        return $this;
    }

    public function removeTranscriptSegment(TranscriptSegment $transcriptSegment): static
    {
        if ($this->transcriptSegments->removeElement($transcriptSegment)) {
            if ($transcriptSegment->getMeeting() === $this) {
                $transcriptSegment->setMeeting(null);
            }
        }

        return $this;
    }

    public function getSummary(): ?Summary
    {
        return $this->summary;
    }

    public function setSummary(?Summary $summary): static
    {
        if ($summary === null && $this->summary !== null) {
            $this->summary->setMeeting(null);
        }

        if ($summary !== null && $summary->getMeeting() !== $this) {
            $summary->setMeeting($this);
        }

        $this->summary = $summary;

        return $this;
    }

    /**
     * @return Collection<int, AnalyticData>
     */
    public function getAnalyticData(): Collection
    {
        return $this->analyticData;
    }

    public function addAnalyticDatum(AnalyticData $analyticDatum): static
    {
        if (!$this->analyticData->contains($analyticDatum)) {
            $this->analyticData->add($analyticDatum);
            $analyticDatum->setMeeting($this);
        }

        return $this;
    }

    public function removeAnalyticDatum(AnalyticData $analyticDatum): static
    {
        if ($this->analyticData->removeElement($analyticDatum)) {
            if ($analyticDatum->getMeeting() === $this) {
                $analyticDatum->setMeeting(null);
            }
        }

        return $this;
    }

    public function getDecisions(): ?array
    {
        return $this->decisions;
    }

    public function setDecisions(?array $decisions): static
    {
        $this->decisions = $decisions;

        return $this;
    }

    public function getActionItems(): ?array
    {
        return $this->actionItems;
    }

    public function setActionItems(?array $actionItems): static
    {
        $this->actionItems = $actionItems;

        return $this;
    }

    public function getBehavioralInterpretation(): ?BehavioralInterpretation
    {
        return $this->behavioralInterpretation;
    }

    public function setBehavioralInterpretation(?BehavioralInterpretation $interpretation): static
    {
        if ($interpretation === null && $this->behavioralInterpretation !== null) {
            $this->behavioralInterpretation->setMeeting(null);
        }

        if ($interpretation !== null && $interpretation->getMeeting() !== $this) {
            $interpretation->setMeeting($this);
        }

        $this->behavioralInterpretation = $interpretation;

        return $this;
    }
}
