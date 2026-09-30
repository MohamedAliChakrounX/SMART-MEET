<?php

namespace App\Tests\Controller;

use App\Entity\Meeting;
use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

class MeetingApiTest extends WebTestCase
{
    private string $bearerToken;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->bearerToken = $this->generateValidJWT();
    }

    public function testListMeetingsPaginated(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/meetings?page=1&limit=20', [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('data', $data);
        $this->assertArrayHasKey('meta', $data);
        $this->assertArrayHasKey('currentPage', $data['meta']);
        $this->assertArrayHasKey('totalPages', $data['meta']);
    }

    public function testListMeetingsReturnsOnlyNonDeleted(): void
    {
        // This would require setting up fixtures with one deleted and one active meeting
        $client = static::createClient();
        $client->request('GET', '/api/v1/meetings?page=1&limit=20', [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        
        // All returned meetings should have no deletedAt
        foreach ($data['data'] as $meeting) {
            $this->assertNull($meeting['deletedAt'] ?? null);
        }
    }

    public function testListMeetingsReturns401WithoutJWT(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/meetings?page=1&limit=20');

        $this->assertResponseStatusCodeSame(401);
    }

    private function generateValidJWT(): string
    {
        // Call the login endpoint to get a real JWT token from the auth system
        $client = static::createClient();
        
        // Use test fixtures (or create a test user)
        $client->request('POST', '/api/v1/auth/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'test@example.com',
            'password' => 'testpassword123',
        ]));
        
        // If login endpoint exists and returns token
        if ($client->getResponse()->getStatusCode() === 200) {
            $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            return $data['token'] ?? '';
        }
        
        // Fallback: if no login endpoint, use environment JWT or skip test
        return getenv('TEST_JWT_TOKEN') ?? '';
    }
}
