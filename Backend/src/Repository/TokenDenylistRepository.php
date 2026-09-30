<?php

namespace App\Repository;

use App\Entity\TokenDenylist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TokenDenylist>
 */
class TokenDenylistRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TokenDenylist::class);
    }

    public function findByJti(string $jti): ?TokenDenylist
    {
        return $this->findOneBy(['jti' => $jti]);
    }

    public function purgeExpired(): int
    {
        $qb = $this->createQueryBuilder('t')
            ->delete()
            ->where('t.expiresAt < :now')
            ->setParameter('now', new \DateTimeImmutable());

        return $qb->getQuery()->execute();
    }
}
