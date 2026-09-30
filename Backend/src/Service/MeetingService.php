<?php

namespace App\Service;

use App\Entity\Meeting;
use App\Entity\User;
use App\Repository\MeetingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

class MeetingService
{
    private const RESOURCE_TRANSCRIPT = 'transcript';
    private const RESOURCE_PV = 'pv';
    private const RESOURCE_ANALYTICS = 'analytics';

    private const TEAM_SHARED_READ_PERMISSIONS = [
        'team.transcript.read',
        'team.pv.read',
        'team.analytics.others',
    ];

    private const DEPT_SHARED_READ_PERMISSIONS = [
        'dept.transcript.read',
        'dept.pv.read',
        'dept.analytics.others',
    ];

    public function __construct(
        private MeetingRepository $meetingRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Get paginated meetings for a user (Admins see all).
     *
     * @return array{data: Meeting[], totalItems: int, totalPages: int, currentPage: int}
     */
    public function listPaginated(User $user, int $page = 1, int $limit = 20): array
    {
        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());
        $teamId = $user->getTeam()?->getId();
        $departmentId = $user->getTeam()?->getDepartment()?->getId();
        $includeTeamProjects = $this->hasTeamSharedReadPermission($user);
        $includeDeptProjects = $this->hasDeptSharedReadPermission($user);

        $meetings = $this->meetingRepository->findPaginated(
            $page,
            $limit,
            $user->getId(),
            $isAdmin,
            $teamId,
            $includeTeamProjects,
            $departmentId,
            $includeDeptProjects
        );
        $totalItems = $this->meetingRepository->countNonDeleted(
            $user->getId(),
            $isAdmin,
            $teamId,
            $includeTeamProjects,
            $departmentId,
            $includeDeptProjects
        );
        $totalPages = (int) ceil($totalItems / $limit);

        return [
            'data' => $meetings,
            'totalItems' => $totalItems,
            'totalPages' => $totalPages,
            'currentPage' => $page,
        ];
    }

    /**
     * Get paginated meetings with organisation filters.
     *
     * @return array{data: Meeting[], totalItems: int, totalPages: int, currentPage: int}
     */
    public function listFilteredPaginated(
        User $user,
        int $page = 1,
        int $limit = 20,
        ?string $filterDepartmentId = null,
        ?string $filterTeamId = null,
        ?string $filterProjectId = null,
    ): array {
        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());
        $teamId = $user->getTeam()?->getId();
        $departmentId = $user->getTeam()?->getDepartment()?->getId();
        $includeTeamProjects = $this->hasTeamSharedReadPermission($user);
        $includeDeptProjects = $this->hasDeptSharedReadPermission($user);

        $meetings = $this->meetingRepository->findFilteredPaginated(
            $page,
            $limit,
            $user->getId(),
            $isAdmin,
            $teamId,
            $includeTeamProjects,
            $departmentId,
            $includeDeptProjects,
            $filterDepartmentId,
            $filterTeamId,
            $filterProjectId,
        );
        $totalItems = $this->meetingRepository->countFiltered(
            $user->getId(),
            $isAdmin,
            $teamId,
            $includeTeamProjects,
            $departmentId,
            $includeDeptProjects,
            $filterDepartmentId,
            $filterTeamId,
            $filterProjectId,
        );
        $totalPages = max(1, (int) ceil($totalItems / $limit));

        return [
            'data' => $meetings,
            'totalItems' => $totalItems,
            'totalPages' => $totalPages,
            'currentPage' => $page,
        ];
    }

    /**
     * Get a single meeting by ID.
     */
    public function getById(Uuid $id): ?Meeting
    {
        return $this->meetingRepository->findOneNonDeletedById($id);
    }

    public function canViewMeeting(User $user, Meeting $meeting): bool
    {
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        if ($meeting->getOwner() === $user) {
            return true;
        }

        $hasTeamPermission = $this->hasTeamSharedReadPermission($user);
        $hasDeptPermission = $this->hasDeptSharedReadPermission($user);
        if (!$hasTeamPermission && !$hasDeptPermission) {
            return false;
        }

        $userTeam = $user->getTeam();
        $userDepartment = $userTeam?->getDepartment();
        $project = $meeting->getProject();
        if ((!$userTeam && !$userDepartment) || !$project) {
            return false;
        }

        foreach ($project->getTeams() as $team) {
            if ($hasTeamPermission && $userTeam && $team === $userTeam) {
                return true;
            }

            if (
                $hasDeptPermission &&
                $userDepartment &&
                $team->getDepartment() &&
                $team->getDepartment() === $userDepartment
            ) {
                return true;
            }
        }

        return false;
    }

    public function canViewTranscript(User $user, Meeting $meeting): bool
    {
        return $this->canViewMeetingForResource($user, $meeting, self::RESOURCE_TRANSCRIPT);
    }

    public function canViewSummary(User $user, Meeting $meeting): bool
    {
        return $this->canViewMeetingForResource($user, $meeting, self::RESOURCE_PV);
    }

    public function canViewAnalytics(User $user, Meeting $meeting): bool
    {
        return $this->canViewMeetingForResource($user, $meeting, self::RESOURCE_ANALYTICS);
    }

    private function canViewMeetingForResource(User $user, Meeting $meeting, string $resource): bool
    {
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        if ($meeting->getOwner() === $user) {
            return true;
        }

        $userTeam = $user->getTeam();
        $userDepartment = $userTeam?->getDepartment();
        $project = $meeting->getProject();
        if ((!$userTeam && !$userDepartment) || !$project) {
            return false;
        }

        $teamPermission = match ($resource) {
            self::RESOURCE_TRANSCRIPT => 'team.transcript.read',
            self::RESOURCE_PV => 'team.pv.read',
            self::RESOURCE_ANALYTICS => 'team.analytics.others',
            default => null,
        };

        $deptPermission = match ($resource) {
            self::RESOURCE_TRANSCRIPT => 'dept.transcript.read',
            self::RESOURCE_PV => 'dept.pv.read',
            self::RESOURCE_ANALYTICS => 'dept.analytics.others',
            default => null,
        };

        $hasTeamPermission = $teamPermission ? $this->hasPermission($user, $teamPermission) : false;
        $hasDeptPermission = $deptPermission ? $this->hasPermission($user, $deptPermission) : false;

        if (!$hasTeamPermission && !$hasDeptPermission) {
            return false;
        }

        foreach ($project->getTeams() as $team) {
            if ($hasTeamPermission && $userTeam && $team === $userTeam) {
                return true;
            }

            if (
                $hasDeptPermission &&
                $userDepartment &&
                $team->getDepartment() &&
                $team->getDepartment() === $userDepartment
            ) {
                return true;
            }
        }

        return false;
    }

    private function hasTeamSharedReadPermission(User $user): bool
    {
        foreach ($user->getPermissions() as $permission) {
            if (in_array($permission->getKey(), self::TEAM_SHARED_READ_PERMISSIONS, true)) {
                return true;
            }
        }

        return false;
    }

    private function hasDeptSharedReadPermission(User $user): bool
    {
        foreach ($user->getPermissions() as $permission) {
            if (in_array($permission->getKey(), self::DEPT_SHARED_READ_PERMISSIONS, true)) {
                return true;
            }
        }

        return false;
    }

    private function hasPermission(User $user, string $key): bool
    {
        foreach ($user->getPermissions() as $permission) {
            if ($permission->getKey() === $key) {
                return true;
            }
        }

        return false;
    }

    /**
     * Soft-delete a meeting (accepts meeting object to avoid double fetch).
     */
    public function softDelete(Meeting $meeting): void
    {
        $meeting->setDeletedAt(new \DateTimeImmutable());
        $this->entityManager->flush();
    }

    /**
     * Soft-delete a meeting by ID (convenience method).
     */
    public function softDeleteById(Uuid $id): void
    {
        $meeting = $this->meetingRepository->find($id);
        if (!$meeting) {
            throw new \InvalidArgumentException(sprintf('Meeting %s not found', $id));
        }

        $this->softDelete($meeting);
    }

    /**
     * Create a new meeting.
     */
    public function create(User $owner, array $data): Meeting
    {
        $meeting = new Meeting();
        $meeting->setOwner($owner);
        $meeting->setTitle($data['title'] ?? '');
        
        // Convert startAt to DateTimeImmutable if it's a string
        if (isset($data['startAt'])) {
            $startAt = $data['startAt'];
            if (is_string($startAt)) {
                $startAt = new \DateTimeImmutable($startAt);
            }
            $meeting->setStartAt($startAt ?? new \DateTimeImmutable());
        } else {
            $meeting->setStartAt(new \DateTimeImmutable());
        }
        
        $meeting->setDurationMinutes($data['durationMinutes'] ?? 0);
        $meeting->setStatus($data['status'] ?? 'In_Progress');
        $meeting->setParticipants($data['participants'] ?? []);
        $meeting->setDescription($data['description'] ?? null);
        $meeting->setStarred($data['starred'] ?? false);

        $this->entityManager->persist($meeting);
        $this->entityManager->flush();

        return $meeting;
    }

    /**
     * Update an existing meeting.
     */
    public function update(Uuid $id, array $data): ?Meeting
    {
        $meeting = $this->meetingRepository->find($id);
        if (!$meeting) {
            return null;
        }

        if (isset($data['title'])) {
            $meeting->setTitle($data['title']);
        }
        if (isset($data['startAt'])) {
            $meeting->setStartAt($data['startAt']);
        }
        if (isset($data['durationMinutes'])) {
            $meeting->setDurationMinutes($data['durationMinutes']);
        }
        if (isset($data['status'])) {
            $meeting->setStatus($data['status']);
        }
        if (isset($data['participants'])) {
            $meeting->setParticipants($data['participants']);
        }
        if (isset($data['description'])) {
            $meeting->setDescription($data['description']);
        }
        if (isset($data['starred'])) {
            $meeting->setStarred($data['starred']);
        }

        $meeting->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $meeting;
    }
}
