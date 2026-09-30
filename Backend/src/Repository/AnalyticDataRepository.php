<?php

namespace App\Repository;

use App\Entity\AnalyticData;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<AnalyticData>
 *
 * @method AnalyticData|null find($id, $lockMode = null, $lockVersion = null)
 * @method AnalyticData|null findOneBy(array $criteria, array $orderBy = null)
 * @method AnalyticData[]    findAll()
 * @method AnalyticData[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class AnalyticDataRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AnalyticData::class);
    }

    /**
     * Find all analytic data for a meeting.
     */
    public function findByMeetingId(Uuid $meetingId): array
    {
        return $this->createQueryBuilder('ad')
            ->where('ad.meeting = :meetingId')
            ->orderBy('ad.metricKey', 'ASC')
            ->setParameter('meetingId', $meetingId)
            ->getQuery()
            ->getResult();
    }
}
