<?php

namespace App\Tests;

use App\Entity\User;
use App\Entity\Permission;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserManagementTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);

        // Reset DB for tests
        foreach ($this->entityManager->getRepository(User::class)->findAll() as $u) {
            $this->entityManager->remove($u);
        }
        foreach ($this->entityManager->getRepository(Permission::class)->findAll() as $p) {
            $this->entityManager->remove($p);
        }
        $this->entityManager->flush();

        // Create Admin
        $hasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        $admin = new User();
        $admin->setEmail('admin-test@meeting-ia.com');
        $admin->setFirstName('Admin');
        $admin->setLastName('Test');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($hasher->hashPassword($admin, 'admin123'));
        $this->entityManager->persist($admin);

        // Create Standard User (without admin role)
        $user = new User();
        $user->setEmail('user-test@meeting-ia.com');
        $user->setFirstName('User');
        $user->setLastName('Test');
        $user->setRoles(['ROLE_USER']);
        $user->setPassword($hasher->hashPassword($user, 'user123'));
        $this->entityManager->persist($user);

        // Seed one permission
        $perm = new Permission();
        $perm->setKey('meeting.read');
        $perm->setDescription('Allow viewing meetings');
        $this->entityManager->persist($perm);

        $this->entityManager->flush();
    }

    private function getAuthToken(string $email, string $password): string
    {
        $this->client->request(
            'POST',
            '/api/v1/auth/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => $password])
        );
        return json_decode($this->client->getResponse()->getContent(), true)['token'];
    }

    public function testAdminCanListUsers(): void
    {
        $token = $this->getAuthToken('admin-test@meeting-ia.com', 'admin123');
        $this->client->request('GET', '/api/v1/users', [], [], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertCount(2, $data);
    }

    public function testStandardUserCannotListUsers(): void
    {
        $token = $this->getAuthToken('user-test@meeting-ia.com', 'user123');
        $this->client->request('GET', '/api/v1/users', [], [], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        // Should be 403 Forbidden because ROLE_ADMIN is required
        $this->assertEquals(403, $this->client->getResponse()->getStatusCode());
    }

    public function testAdminSelfDeletionPrevention(): void
    {
        $token = $this->getAuthToken('admin-test@meeting-ia.com', 'admin123');
        $admin = $this->entityManager->getRepository(User::class)->findOneBy(['email' => 'admin-test@meeting-ia.com']);
        
        $this->client->request('DELETE', '/api/v1/users/' . $admin->getId(), [], [], ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]);

        $response = $this->client->getResponse();
        fwrite(STDERR, "\n[SELF-DELETE DEBUG] Status: " . $response->getStatusCode() . " Body: " . substr($response->getContent(), 0, 300) . "\n");
        // Should be 403 Forbidden (based on UserService logic R-07)
        $this->assertEquals(403, $response->getStatusCode());
    }
}
