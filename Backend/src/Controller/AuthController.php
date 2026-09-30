<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Service\AuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/auth')]
class AuthController extends AbstractController
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly ProjectRepository $projectRepository,
    ) {
    }

    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        // Handled by Lexik JWT Authentication firewall (json_login)
        // This endpoint is protected by the 'login' firewall which:
        // 1. Validates credentials via json_login
        // 2. Calls lexik_jwt_authentication.handler.authentication_success
        // 3. Returns JWT token automatically
        
        // If credentials are invalid, the failure_handler returns 401
        return new JsonResponse(['error' => 'Authentication failed'], Response::HTTP_UNAUTHORIZED);
    }

    #[Route('/me', name: 'app_auth_me', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        assert($user instanceof User);

        $projects = [];
        if ($user->getTeam()) {
            $projects = $this->projectRepository
                ->createQueryBuilder('p')
                ->join('p.teams', 't')
                ->where('t = :team')
                ->setParameter('team', $user->getTeam())
                ->getQuery()
                ->getResult();
        }
        
        $projectIds = array_values(array_filter(
            array_map(fn($project) => $project->getId()?->toString(), $projects),
            fn($id) => is_string($id) && $id !== ''
        ));

        return new JsonResponse([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'permissions' => array_map(fn($p) => $p->getKey(), $user->getPermissions()->toArray()),
            'projectIds' => $projectIds,
            'projects' => array_map(fn($project) => [
                'id' => $project->getId()?->toString(),
                'name' => $project->getName(),
            ], $projects),
        ]);
    }

    #[Route('/logout', name: 'app_auth_logout', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function logout(Request $request): JsonResponse
    {
        $token = $request->headers->get('Authorization');
        if ($token && str_starts_with($token, 'Bearer ')) {
            $this->authService->logout(substr($token, 7));
        }

        return new JsonResponse(['message' => 'Logged out successfully.']);
    }

}
