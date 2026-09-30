<?php

namespace App\Repository;

use App\Entity\BehavioralInterpretation;
use App\Entity\Meeting;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<BehavioralInterpretation>
 */
class BehavioralInterpretationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BehavioralInterpretation::class);
    }

    /**
     * Returns the interpretation for a given meeting UUID, or null if none exists.
     */
    public function findByMeetingId(Uuid $meetingId): ?BehavioralInterpretation
    {
        return $this->createQueryBuilder('bi')
            ->join('bi.meeting', 'm')
            ->where('m.id = :id')
            ->setParameter('id', $meetingId, 'uuid')
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Returns the interpretation for a Meeting entity directly.
     */
    public function findByMeeting(Meeting $meeting): ?BehavioralInterpretation
    {
        return $this->findOneBy(['meeting' => $meeting]);
    }
}
