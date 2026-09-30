<?php

namespace App\Tests;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AuthenticationTest extends WebTestCase
{
    private EntityManagerInterface $entityManager;
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);

        // Purge user and create a fresh test admin
        $userRepo = $this->entityManager->getRepository(User::class);
        foreach ($userRepo->findAll() as $u) {
            $this->entityManager->remove($u);
        }
        $this->entityManager->flush();

        $hasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        $user = new User();
        $user->setEmail('admin-test@meeting-ia.com');
        $user->setFirstName('Test');
        $user->setLastName('Admin');
        $user->setRoles(['ROLE_ADMIN']);
        $user->setPassword($hasher->hashPassword($user, 'password123'));

        $this->entityManager->persist($user);
        $this->entityManager->flush();
    }

    public function testLoginSuccess(): string
    {
        $this->client->request(
            'POST',
            '/api/v1/auth/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'email' => 'admin-test@meeting-ia.com',
                'password' => 'password123',
            ])
        );

        $response = $this->client->getResponse();
        if ($response->getStatusCode() !== 200) {
           fwrite(STDERR, "\n[DEBUG] Error 500: " . $response->getContent() . "\n");
        }
        $this->assertEquals(200, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('refresh_token', $data);

        return $data['token'];
    }

    public function testGetMeAuthorized(): void
    {
        $token = $this->testLoginSuccess();

        $this->client->request(
            'GET',
            '/api/v1/auth/me',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $response = $this->client->getResponse();
        if ($response->getStatusCode() !== 200) {
            fwrite(STDERR, "\n[DEBUG] Error 500: " . $response->getContent() . "\n");
         }
        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('admin-test@meeting-ia.com', $data['email']);
    }

    public function testLogoutInvalidatesToken(): void
    {
        $token = $this->testLoginSuccess();

        // 1. Logout
        $this->client->request(
            'POST',
            '/api/v1/auth/logout',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );
        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());

        // 2. Try to access /me again with the SAME token
        $this->client->request(
            'GET',
            '/api/v1/auth/me',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        // Should be 401 because it is in denylist
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }
}
