<?php

namespace App\Controller;

use App\Entity\Department;
use App\Entity\Project;
use App\Entity\Team;
use App\Repository\DepartmentRepository;
use App\Repository\ProjectRepository;
use App\Repository\TeamRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;

#[Route('/api/v1/admin/organisation')]
class AdminOrganisationController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private SerializerInterface $serializer
    ) {}

    // --- Departments ---

    #[Route('/departments', name: 'admin_organisation_depts_list', methods: ['GET'])]
    public function listDepartments(DepartmentRepository $repo): JsonResponse
    {
        $depts = $repo->findAll();
        return new JsonResponse(
            $this->serializer->serialize($depts, 'json', ['groups' => 'dept:read']),
            Response::HTTP_OK,
            [],
            true
        );
    }

    #[Route('/departments', name: 'admin_organisation_depts_create', methods: ['POST'])]
    public function createDepartment(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $dept = new Department();
        $dept->setName($data['name']);
        $dept->setDescription($data['description'] ?? null);

        $this->entityManager->persist($dept);
        $this->entityManager->flush();

        return new JsonResponse(['id' => $dept->getId()->toString()], Response::HTTP_CREATED);
    }

    #[Route('/departments/{id}', name: 'admin_organisation_depts_update', methods: ['PUT'])]
    public function updateDepartment(Department $dept, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $dept->setName($data['name']);
        if (isset($data['description'])) $dept->setDescription($data['description']);

        $this->entityManager->flush();
        return new JsonResponse(['status' => 'updated']);
    }

    #[Route('/departments/{id}', name: 'admin_organisation_depts_delete', methods: ['DELETE'])]
    public function deleteDepartment(Department $dept): JsonResponse
    {
        $this->entityManager->remove($dept);
        $this->entityManager->flush();
        return new JsonResponse(['status' => 'deleted']);
    }

    // --- Teams ---

    #[Route('/teams', name: 'admin_organisation_teams_list', methods: ['GET'])]
    public function listTeams(TeamRepository $repo): JsonResponse
    {
        $teams = $repo->findAll();
        return new JsonResponse(
            $this->serializer->serialize($teams, 'json', ['groups' => 'team:read']),
            Response::HTTP_OK,
            [],
            true
        );
    }

    #[Route('/teams', name: 'admin_organisation_teams_create', methods: ['POST'])]
    public function createTeam(Request $request, DepartmentRepository $deptRepo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $team = new Team();
        $team->setName($data['name']);
        $team->setDescription($data['description'] ?? null);
        
        $dept = $deptRepo->find($data['departmentId']);
        if (!$dept) return new JsonResponse(['error' => 'Dept not found'], 404);
        $team->setDepartment($dept);

        $this->entityManager->persist($team);
        $this->entityManager->flush();

        return new JsonResponse(['id' => $team->getId()->toString()], Response::HTTP_CREATED);
    }

    #[Route('/teams/{id}', name: 'admin_organisation_teams_update', methods: ['PUT'])]
    public function updateTeam(Team $team, Request $request, DepartmentRepository $deptRepo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $team->setName($data['name']);
        if (isset($data['description'])) $team->setDescription($data['description']);
        if (isset($data['departmentId'])) {
            $dept = $deptRepo->find($data['departmentId']);
            if ($dept) $team->setDepartment($dept);
        }

        $this->entityManager->flush();
        return new JsonResponse(['status' => 'updated']);
    }

    #[Route('/teams/{id}', name: 'admin_organisation_teams_delete', methods: ['DELETE'])]
    public function deleteTeam(Team $team): JsonResponse
    {
        $this->entityManager->remove($team);
        $this->entityManager->flush();
        return new JsonResponse(['status' => 'deleted']);
    }

    // --- Projects ---

    #[Route('/projects', name: 'admin_organisation_projects_list', methods: ['GET'])]
    public function listProjects(ProjectRepository $repo): JsonResponse
    {
        $projects = $repo->findAll();
        return new JsonResponse(
            $this->serializer->serialize($projects, 'json', ['groups' => 'project:read']),
            Response::HTTP_OK,
            [],
            true
        );
    }

    #[Route('/projects', name: 'admin_organisation_projects_create', methods: ['POST'])]
    public function createProject(Request $request, TeamRepository $teamRepo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $project = new Project();
        $project->setName($data['name']);
        $project->setDescription($data['description'] ?? null);

        if (isset($data['teamIds'])) {
            foreach ($data['teamIds'] as $teamId) {
                $team = $teamRepo->find($teamId);
                if ($team) $project->addTeam($team);
            }
        }

        $this->entityManager->persist($project);
        $this->entityManager->flush();

        return new JsonResponse(['id' => $project->getId()->toString()], Response::HTTP_CREATED);
    }

    #[Route('/projects/{id}', name: 'admin_organisation_projects_update', methods: ['PUT'])]
    public function updateProject(Project $project, Request $request, TeamRepository $teamRepo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $project->setName($data['name']);
        if (isset($data['description'])) $project->setDescription($data['description']);
        
        if (isset($data['teamIds'])) {
            // Simplification: clear and add
            foreach ($project->getTeams() as $team) {
                $project->removeTeam($team);
            }
            foreach ($data['teamIds'] as $teamId) {
                $team = $teamRepo->find($teamId);
                if ($team) $project->addTeam($team);
            }
        }

        $this->entityManager->flush();
        return new JsonResponse(['status' => 'updated']);
    }

    #[Route('/projects/{id}', name: 'admin_organisation_projects_delete', methods: ['DELETE'])]
    public function deleteProject(Project $project): JsonResponse
    {
        $this->entityManager->remove($project);
        $this->entityManager->flush();
        return new JsonResponse(['status' => 'deleted']);
    }
}
