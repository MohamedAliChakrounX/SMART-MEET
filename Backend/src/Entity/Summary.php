<?php

namespace App\Entity;

use App\Repository\SummaryRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SummaryRepository::class)]
class Summary
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\OneToOne(targetEntity: Meeting::class, inversedBy: 'summary')]
    #[ORM\JoinColumn(nullable: false, unique: true)]
    #[Ignore]
    private ?Meeting $meeting = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters')]
    private ?string $title = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank(message: 'Type is required')]
    #[Assert\Choice(choices: ['PV', 'Note', 'Action'], message: 'Invalid type')]
    private ?string $type = null;

    #[ORM\Column(type: 'json')]
    #[Assert\Type(type: 'array', message: 'Content must be an array')]
    private array $content = [];

    #[ORM\Column(type: 'json')]
    #[Assert\Type(type: 'array', message: 'Focus areas must be an array')]
    private array $focusAreas = [];

    #[ORM\Column(length: 50, nullable: true)]
    #[Assert\Choice(choices: ['Low', 'Medium', 'High', 'Full'], message: 'Invalid detail level')]
    private ?string $detailLevel = null;

    #[ORM\Column]
    private ?int $version = 1;

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

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getContent(): ?array
    {
        return $this->content;
    }

    public function setContent(?array $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getFocusAreas(): ?array
    {
        return $this->focusAreas;
    }

    public function setFocusAreas(?array $focusAreas): static
    {
        $this->focusAreas = $focusAreas;

        return $this;
    }

    public function getDetailLevel(): ?string
    {
        return $this->detailLevel;
    }

    public function setDetailLevel(?string $detailLevel): static
    {
        $this->detailLevel = $detailLevel;

        return $this;
    }

    public function getVersion(): ?int
    {
        return $this->version;
    }

    public function setVersion(int $version): static
    {
        $this->version = $version;

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
