<?php

namespace App\Tests;

use App\Entity\User;
use App\Entity\Permission;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class PermissionVoterTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = $this->client->getContainer()->get('doctrine.orm.entity_manager');

        // Reset
        $userRepo = $this->entityManager->getRepository(User::class);
        foreach ($userRepo->findAll() as $u) {
            $this->entityManager->remove($u);
        }
        $permRepo = $this->entityManager->getRepository(Permission::class);
        foreach ($permRepo->findAll() as $p) {
            $this->entityManager->remove($p);
        }
        $this->entityManager->flush();

        $hasher = $this->client->getContainer()->get(UserPasswordHasherInterface::class);
        
        $user = new User();
        $user->setEmail('allowed@meeting-ia.com');
        $user->setFirstName('Allowed');
        $user->setLastName('User');
        $user->setPassword($hasher->hashPassword($user, 'secret'));
        
        $perm = new Permission();
        $perm->setKey('meeting.read');
        $perm->setDescription('Allow read');
        $this->entityManager->persist($perm);
        
        $user->addPermission($perm);
        $this->entityManager->persist($user);
        $this->entityManager->flush();
    }

    public function testPermissionInMeResponse(): void
    {
        $this->client->request(
            'POST',
            '/api/v1/auth/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'allowed@meeting-ia.com', 'password' => 'secret'])
        );
        
        $loginResponse = $this->client->getResponse();
        if ($loginResponse->getStatusCode() !== 200) {
            file_put_contents('test_perm_err.log', "Login failed: " . $loginResponse->getContent());
        }
        $this->assertEquals(200, $loginResponse->getStatusCode(), "Login should succeed");
        
        $token = json_decode($loginResponse->getContent(), true)['token'];

        $this->client->request('GET', '/api/v1/auth/me', [], [], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);
        
        $meResponse = $this->client->getResponse();
        if ($meResponse->getStatusCode() !== 200) {
            file_put_contents('test_perm_err.log', "Me failed: " . $meResponse->getContent());
        }
        
        $this->assertEquals(200, $meResponse->getStatusCode(), "Me should succeed");
        $data = json_decode($meResponse->getContent(), true);
        $this->assertContains('meeting.read', $data['permissions']);
    }
}
