<?php

namespace App\Service;

use App\Entity\Permission;
use App\Entity\User;
use App\Repository\PermissionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Bundle\SecurityBundle\Security;

class UserService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly PermissionRepository $permissionRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly Security $security,
        private readonly \App\Repository\TeamRepository $teamRepository
    ) {
    }

    public function getAllUsers(): array
    {
        return $this->userRepository->findAll();
    }

    public function createUser(array $data): User
    {
        $user = new User();
        $user->setEmail($data['email']);
        $user->setFirstName($data['firstName']);
        $user->setLastName($data['lastName']);
        $user->setRoles($data['roles'] ?? ['ROLE_USER']);
        
        $hashedPassword = $this->passwordHasher->hashPassword($user, $data['password']);
        $user->setPassword($hashedPassword);

        if (isset($data['permissions'])) {
            $this->updatePermissions($user, $data['permissions']);
        }

        if (isset($data['teamId'])) {
            $team = $this->teamRepository->find($data['teamId']);
            if ($team) $user->setTeam($team);
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    public function updateUser(User $user, array $data): User
    {
        if (isset($data['email'])) $user->setEmail($data['email']);
        if (isset($data['firstName'])) $user->setFirstName($data['firstName']);
        if (isset($data['lastName'])) $user->setLastName($data['lastName']);
        if (isset($data['roles'])) $user->setRoles($data['roles']);
        
        if (isset($data['teamId'])) {
            $team = $this->teamRepository->find($data['teamId']);
            if ($team) $user->setTeam($team);
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $hashedPassword = $this->passwordHasher->hashPassword($user, $data['password']);
            $user->setPassword($hashedPassword);
        }

        $user->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $user;
    }

    public function deleteUser(User $user): void
    {
        // R-07: Admin self-deletion prevention
        if ($this->security->getUser() === $user) {
            throw new AccessDeniedHttpException('An admin cannot delete their own account.');
        }

        $user->setDeletedAt(new \DateTimeImmutable());
        $user->setIsActive(false);
        
        $this->entityManager->flush();
    }

    public function updatePermissions(User $user, array $permissionKeys): void
    {
        foreach ($user->getPermissions() as $permission) {
            $user->removePermission($permission);
        }

        foreach ($permissionKeys as $key) {
            $permission = $this->permissionRepository->findOneBy(['key' => $key]);
            if ($permission) {
                $user->addPermission($permission);
            }
        }
        $this->entityManager->flush();
    }

    public function setActiveStatus(User $user, bool $isActive): void
    {
        // R-07: Admin self-deactivation prevention
        if ($this->security->getUser() === $user && !$isActive) {
            throw new AccessDeniedHttpException('An admin cannot deactivate their own account.');
        }

        $user->setIsActive($isActive);
        $user->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();
    }
}
