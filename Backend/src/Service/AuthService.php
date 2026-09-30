<?php

namespace App\Service;

use App\Entity\TokenDenylist;
use App\Repository\TokenDenylistRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class AuthService
{
    public function __construct(
        private readonly TokenDenylistRepository $denylistRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly TokenStorageInterface $tokenStorage
    ) {
    }

    public function logout(string $token): void
    {
        $payload = $this->jwtManager->parse($token);
        $jti = $payload['jti'] ?? null;
        $exp = $payload['exp'] ?? null;

        if ($jti && $exp) {
            $denylisted = new TokenDenylist();
            $denylisted->setJti($jti);
            $denylisted->setExpiresAt((new \DateTimeImmutable())->setTimestamp($exp));

            $this->entityManager->persist($denylisted);
            $this->entityManager->flush();
        }
    }
}
