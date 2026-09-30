<?php

namespace App\Entity;

use App\Repository\TranscriptSegmentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TranscriptSegmentRepository::class)]
class TranscriptSegment
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Meeting::class, inversedBy: 'transcriptSegments')]
    #[ORM\JoinColumn(nullable: false)]
    #[Ignore]
    private ?Meeting $meeting = null;

    #[ORM\Column(length: 100)]
    private ?string $speaker = null;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $speakerColor = null;

    #[ORM\Column]
    private ?int $timeStart = null;

    #[ORM\Column]
    private ?int $timeEnd = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['transcript:read', 'transcript:write'])]
    #[SerializedName('text')]
    #[Assert\NotBlank(message: 'Content cannot be blank')]
    private ?string $content = null;

    #[ORM\Column]
    private ?int $orderIndex = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getMeeting(): ?Meeting
    {
        return $this->meeting;
    }

    public function setMeeting(?Meeting $meeting): static
    {
        $this->meeting = $meeting;

        return $this;
    }

    public function getSpeaker(): ?string
    {
        return $this->speaker;
    }

    public function setSpeaker(string $speaker): static
    {
        $this->speaker = $speaker;

        return $this;
    }

    public function getSpeakerColor(): ?string
    {
        return $this->speakerColor;
    }

    public function setSpeakerColor(?string $speakerColor): static
    {
        $this->speakerColor = $speakerColor;

        return $this;
    }

    public function getTimeStart(): ?int
    {
        return $this->timeStart;
    }

    public function setTimeStart(int $timeStart): static
    {
        $this->timeStart = $timeStart;

        return $this;
    }

    public function getTimeEnd(): ?int
    {
        return $this->timeEnd;
    }

    public function setTimeEnd(int $timeEnd): static
    {
        $this->timeEnd = $timeEnd;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getOrderIndex(): ?int
    {
        return $this->orderIndex;
    }

    public function setOrderIndex(int $orderIndex): static
    {
        $this->orderIndex = $orderIndex;

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
}
