<?php

namespace App\Entity;

use App\Repository\TokenDenylistRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TokenDenylistRepository::class)]
class TokenDenylist
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100, unique: true)]
    private ?string $jti = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $expiresAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getJti(): ?string
    {
        return $this->jti;
    }

    public function setJti(string $jti): static
    {
        $this->jti = $jti;

        return $this;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(\DateTimeImmutable $expiresAt): static
    {
        $this->expiresAt = $expiresAt;

        return $this;
    }
}
