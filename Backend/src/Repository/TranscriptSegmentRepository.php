<?php

namespace App\Repository;

use App\Entity\TranscriptSegment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<TranscriptSegment>
 *
 * @method TranscriptSegment|null find($id, $lockMode = null, $lockVersion = null)
 * @method TranscriptSegment|null findOneBy(array $criteria, array $orderBy = null)
 * @method TranscriptSegment[]    findAll()
 * @method TranscriptSegment[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TranscriptSegmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TranscriptSegment::class);
    }

    /**
     * Find all transcript segments for a meeting, ordered by index.
     */
    public function findByMeetingOrderedByIndex(Uuid $meetingId): array
    {
        return $this->createQueryBuilder('ts')
            ->where('ts.meeting = :meetingId')
            ->orderBy('ts.orderIndex', 'ASC')
            ->setParameter('meetingId', $meetingId)
            ->getQuery()
            ->getResult();
    }
}
