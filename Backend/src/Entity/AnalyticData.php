<?php

namespace App\Entity;

use App\Repository\AnalyticDataRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AnalyticDataRepository::class)]
class AnalyticData
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Meeting::class, inversedBy: 'analyticData')]
    #[ORM\JoinColumn(nullable: false)]
    #[Ignore]
    private ?Meeting $meeting = null;

    #[ORM\Column(length: 100)]
    private ?string $metricKey = null;

    #[ORM\Column(type: 'json')]
    private array $metricValue = [];

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

    public function getMetricKey(): ?string
    {
        return $this->metricKey;
    }

    public function setMetricKey(string $metricKey): static
    {
        $this->metricKey = $metricKey;

        return $this;
    }

    public function getMetricValue(): array
    {
        return $this->metricValue;
    }

    public function setMetricValue(array $metricValue): static
    {
        $this->metricValue = $metricValue;

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
