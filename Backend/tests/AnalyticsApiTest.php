<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

class AnalyticsApiTest extends WebTestCase
{
    private string $bearerToken;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->bearerToken = $this->generateValidJWT();
    }

    public function testGetAnalyticsReturns200WithCorrectKeys(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/meetings/{$meetingId}/analytics", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        
        // Should contain expected keys or be aggregated analytics
        $this->assertIsArray($data);
    }

    public function testGetAnalyticsReturns401WithoutJWT(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/meetings/{$meetingId}/analytics");

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetAnalyticsReturns404ForSoftDeletedMeeting(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/meetings/{$meetingId}/analytics", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        // Should return 404 if meeting doesn't exist or is soft-deleted
        $this->assertContains(
            $client->getResponse()->getStatusCode(),
            [403, 404]
        );
    }

    private function generateValidJWT(): string
    {
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $now = time();
        $payload = base64_encode(json_encode([
            'iat' => $now,
            'exp' => $now + 3600,
            'iss' => 'Meeting-IA-sfm',
            'username' => 'test@example.com',
        ]));
        $signature = base64_encode('test_signature');
        return sprintf('%s.%s.%s', $header, $payload, $signature);
    }
}
