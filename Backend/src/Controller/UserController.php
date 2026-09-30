<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\UserService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/users')]
#[IsGranted('ROLE_ADMIN')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly \Symfony\Component\Stopwatch\Stopwatch $stopwatch,
        private readonly \Psr\Log\LoggerInterface $logger
    ) {
    }

    #[Route('', name: 'app_user_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $this->stopwatch->start('user.index');
        $users = $this->userService->getAllUsers();
        
        $data = array_map(fn(User $user) => [
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'isActive' => $user->isActive(),
            'teamId' => $user->getTeam() ? $user->getTeam()->getId()->toString() : null,
            'projectIds' => [], // Will be handled later if needed
            'permissions' => array_map(fn($p) => $p->getKey(), $user->getPermissions()->toArray()),
        ], $users);

        $response = new JsonResponse($data);
        $event = $this->stopwatch->stop('user.index');
        $response->headers->set('X-Response-Time', $event->getDuration() . 'ms');

        return $response;
    }

    #[Route('', name: 'app_user_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->userService->createUser($data);

        return new JsonResponse([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
        ], JsonResponse::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'app_user_update', methods: ['PUT'])]
    public function update(Request $request, User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $user = $this->userService->updateUser($user, $data);

        return new JsonResponse([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
        ]);
    }

    #[Route('/{id}/permissions', name: 'app_user_patch_permissions', methods: ['PATCH'])]
    public function patchPermissions(Request $request, User $user): JsonResponse
    {
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return new JsonResponse(['error' => 'Cannot modify permissions of an administrator account.'], JsonResponse::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        if (!isset($data['permissions']) || !is_array($data['permissions'])) {
            return new JsonResponse(['error' => 'Invalid data structure.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $this->userService->updatePermissions($user, $data['permissions']);
        
        $this->logger->info('User permissions updated by admin.', [
            'admin' => $this->getUser()->getUserIdentifier(),
            'target_user' => $user->getEmail(),
            'permissions' => $data['permissions']
        ]);

        return new JsonResponse([
            'userId' => $user->getId(),
            'permissions' => $data['permissions']
        ]);
    }

    #[Route('/{id}/status', name: 'app_user_patch_status', methods: ['PATCH'])]
    public function patchStatus(Request $request, User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!isset($data['isActive'])) {
            return new JsonResponse(['error' => 'Missing isActive field.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $this->userService->setActiveStatus($user, (bool) $data['isActive']);

        $this->logger->info('User status updated by admin.', [
            'admin' => $this->getUser()->getUserIdentifier(),
            'target_user' => $user->getEmail(),
            'isActive' => $data['isActive']
        ]);

        return new JsonResponse([
            'userId' => $user->getId(),
            'isActive' => $user->isActive()
        ]);
    }

    #[Route('/{id}', name: 'app_user_delete', methods: ['DELETE'])]
    public function delete(User $user): JsonResponse
    {
        $this->userService->deleteUser($user);

        return new JsonResponse(null, JsonResponse::HTTP_NO_CONTENT);
    }
}
