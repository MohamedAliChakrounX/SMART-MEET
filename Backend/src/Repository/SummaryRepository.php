<?php

namespace App\Repository;

use App\Entity\Summary;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Summary>
 *
 * @method Summary|null find($id, $lockMode = null, $lockVersion = null)
 * @method Summary|null findOneBy(array $criteria, array $orderBy = null)
 * @method Summary[]    findAll()
 * @method Summary[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class SummaryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Summary::class);
    }

    /**
     * Find summary for a meeting by meeting ID.
     */
    public function findByMeetingId(Uuid $meetingId): ?Summary
    {
        return $this->createQueryBuilder('s')
            ->where('s.meeting = :meetingId')
            ->setParameter('meetingId', $meetingId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
