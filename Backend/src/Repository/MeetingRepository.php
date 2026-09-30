<?php

namespace App\Repository;

use App\Entity\Meeting;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Meeting>
 *
 * @method Meeting|null find($id, $lockMode = null, $lockVersion = null)
 * @method Meeting|null findOneBy(array $criteria, array $orderBy = null)
 * @method Meeting[]    findAll()
 * @method Meeting[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class MeetingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Meeting::class);
    }

    /**
     * Find paginated meetings, optionally filtered by user.
     */
    public function findPaginated(
        int $page = 1,
        int $limit = 20,
        ?Uuid $userId = null,
        bool $isAdmin = false,
        ?Uuid $teamId = null,
        bool $includeTeamProjects = false,
        ?Uuid $departmentId = null,
        bool $includeDeptProjects = false
    ): array {
        $offset = ($page - 1) * $limit;

        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.deletedAt IS NULL')
            ->orderBy('m.startAt', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        if (!$isAdmin && $userId) {
            if (($includeTeamProjects && $teamId) || ($includeDeptProjects && $departmentId)) {
                $qb->leftJoin('m.project', 'p')
                    ->leftJoin('p.teams', 'pt');

                $orConditions = ['m.owner = :userId'];
                $qb->setParameter('userId', $userId);

                if ($includeTeamProjects && $teamId) {
                    $orConditions[] = 'pt.id = :teamId';
                    $qb->setParameter('teamId', $teamId);
                }

                if ($includeDeptProjects && $departmentId) {
                    $qb->leftJoin('pt.department', 'pd');
                    $orConditions[] = 'pd.id = :departmentId';
                    $qb->setParameter('departmentId', $departmentId);
                }

                $qb->andWhere('(' . implode(' OR ', $orConditions) . ')');
            } else {
                $qb->andWhere('m.owner = :userId')
                    ->setParameter('userId', $userId);
            }
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Count non-deleted meetings, optionally filtered by user.
     */
    public function countNonDeleted(
        ?Uuid $userId = null,
        bool $isAdmin = false,
        ?Uuid $teamId = null,
        bool $includeTeamProjects = false,
        ?Uuid $departmentId = null,
        bool $includeDeptProjects = false
    ): int {
        $qb = $this->createQueryBuilder('m')
            ->select('COUNT(DISTINCT m.id)')
            ->andWhere('m.deletedAt IS NULL');

        if (!$isAdmin && $userId) {
            if (($includeTeamProjects && $teamId) || ($includeDeptProjects && $departmentId)) {
                $qb->leftJoin('m.project', 'p')
                    ->leftJoin('p.teams', 'pt');

                $orConditions = ['m.owner = :userId'];
                $qb->setParameter('userId', $userId);

                if ($includeTeamProjects && $teamId) {
                    $orConditions[] = 'pt.id = :teamId';
                    $qb->setParameter('teamId', $teamId);
                }

                if ($includeDeptProjects && $departmentId) {
                    $qb->leftJoin('pt.department', 'pd');
                    $orConditions[] = 'pd.id = :departmentId';
                    $qb->setParameter('departmentId', $departmentId);
                }

                $qb->andWhere('(' . implode(' OR ', $orConditions) . ')');
            } else {
                $qb->andWhere('m.owner = :userId')
                    ->setParameter('userId', $userId);
            }
        }

        return $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Find paginated meetings filtered by organisation criteria.
     * Matches via TWO paths:
     *   - meeting.project → project.teams → team.department
     *   - meeting.owner  → owner.team   → team.department
     */
    public function findFilteredPaginated(
        int $page,
        int $limit,
        ?Uuid $userId,
        bool $isAdmin,
        ?Uuid $teamId,
        bool $includeTeamProjects,
        ?Uuid $departmentId,
        bool $includeDeptProjects,
        ?string $filterDepartmentId = null,
        ?string $filterTeamId = null,
        ?string $filterProjectId = null,
    ): array {
        $offset = ($page - 1) * $limit;

        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.deletedAt IS NULL')
            ->orderBy('m.startAt', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        // Access-control (same logic as findPaginated)
        if (!$isAdmin && $userId) {
            if (($includeTeamProjects && $teamId) || ($includeDeptProjects && $departmentId)) {
                $qb->leftJoin('m.project', 'p_acl')
                    ->leftJoin('p_acl.teams', 'pt_acl');

                $orConditions = ['m.owner = :userId'];
                $qb->setParameter('userId', $userId);

                if ($includeTeamProjects && $teamId) {
                    $orConditions[] = 'pt_acl.id = :aclTeamId';
                    $qb->setParameter('aclTeamId', $teamId);
                }
                if ($includeDeptProjects && $departmentId) {
                    $qb->leftJoin('pt_acl.department', 'pd_acl');
                    $orConditions[] = 'pd_acl.id = :aclDeptId';
                    $qb->setParameter('aclDeptId', $departmentId);
                }

                $qb->andWhere('(' . implode(' OR ', $orConditions) . ')');
            } else {
                $qb->andWhere('m.owner = :userId')
                    ->setParameter('userId', $userId);
            }
        }

        // Organisation filters
        if ($filterProjectId) {
            $qb->leftJoin('m.project', 'fp')
                ->andWhere('fp.id = :filterProjectId')
                ->setParameter('filterProjectId', $filterProjectId);
        } elseif ($filterTeamId) {
            // Match via project→teams OR via owner→team
            $qb->leftJoin('m.project', 'fp2')
                ->leftJoin('fp2.teams', 'fpt2')
                ->leftJoin('m.owner', 'fo2')
                ->andWhere('(fpt2.id = :filterTeamId OR fo2.team = :filterTeamIdRef)')
                ->setParameter('filterTeamId', $filterTeamId)
                ->setParameter('filterTeamIdRef', $filterTeamId);
        } elseif ($filterDepartmentId) {
            // Match via project→teams→department OR via owner→team→department
            $qb->leftJoin('m.project', 'fp3')
                ->leftJoin('fp3.teams', 'fpt3')
                ->leftJoin('fpt3.department', 'fpd3')
                ->leftJoin('m.owner', 'fo3')
                ->leftJoin('fo3.team', 'fot3')
                ->leftJoin('fot3.department', 'fotd3')
                ->andWhere('(fpd3.id = :filterDeptId OR fotd3.id = :filterDeptId2)')
                ->setParameter('filterDeptId', $filterDepartmentId)
                ->setParameter('filterDeptId2', $filterDepartmentId);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Count filtered meetings (mirrors findFilteredPaginated logic).
     */
    public function countFiltered(
        ?Uuid $userId,
        bool $isAdmin,
        ?Uuid $teamId,
        bool $includeTeamProjects,
        ?Uuid $departmentId,
        bool $includeDeptProjects,
        ?string $filterDepartmentId = null,
        ?string $filterTeamId = null,
        ?string $filterProjectId = null,
    ): int {
        $qb = $this->createQueryBuilder('m')
            ->select('COUNT(DISTINCT m.id)')
            ->andWhere('m.deletedAt IS NULL');

        if (!$isAdmin && $userId) {
            if (($includeTeamProjects && $teamId) || ($includeDeptProjects && $departmentId)) {
                $qb->leftJoin('m.project', 'p_acl')
                    ->leftJoin('p_acl.teams', 'pt_acl');

                $orConditions = ['m.owner = :userId'];
                $qb->setParameter('userId', $userId);

                if ($includeTeamProjects && $teamId) {
                    $orConditions[] = 'pt_acl.id = :aclTeamId';
                    $qb->setParameter('aclTeamId', $teamId);
                }
                if ($includeDeptProjects && $departmentId) {
                    $qb->leftJoin('pt_acl.department', 'pd_acl');
                    $orConditions[] = 'pd_acl.id = :aclDeptId';
                    $qb->setParameter('aclDeptId', $departmentId);
                }

                $qb->andWhere('(' . implode(' OR ', $orConditions) . ')');
            } else {
                $qb->andWhere('m.owner = :userId')
                    ->setParameter('userId', $userId);
            }
        }

        if ($filterProjectId) {
            $qb->leftJoin('m.project', 'fp')
                ->andWhere('fp.id = :filterProjectId')
                ->setParameter('filterProjectId', $filterProjectId);
        } elseif ($filterTeamId) {
            $qb->leftJoin('m.project', 'fp2')
                ->leftJoin('fp2.teams', 'fpt2')
                ->leftJoin('m.owner', 'fo2')
                ->andWhere('(fpt2.id = :filterTeamId OR fo2.team = :filterTeamIdRef)')
                ->setParameter('filterTeamId', $filterTeamId)
                ->setParameter('filterTeamIdRef', $filterTeamId);
        } elseif ($filterDepartmentId) {
            $qb->leftJoin('m.project', 'fp3')
                ->leftJoin('fp3.teams', 'fpt3')
                ->leftJoin('fpt3.department', 'fpd3')
                ->leftJoin('m.owner', 'fo3')
                ->leftJoin('fo3.team', 'fot3')
                ->leftJoin('fot3.department', 'fotd3')
                ->andWhere('(fpd3.id = :filterDeptId OR fotd3.id = :filterDeptId2)')
                ->setParameter('filterDeptId', $filterDepartmentId)
                ->setParameter('filterDeptId2', $filterDepartmentId);
        }

        return $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Find a single meeting by ID, excluding soft-deleted ones.
     */
    public function findOneNonDeletedById(Uuid $id): ?Meeting
    {
        return $this->createQueryBuilder('m')
            ->where('m.id = :id')
            ->andWhere('m.deletedAt IS NULL')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
