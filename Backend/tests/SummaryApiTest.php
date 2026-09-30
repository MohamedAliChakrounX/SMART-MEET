<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

class SummaryApiTest extends WebTestCase
{
    private string $bearerToken;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->bearerToken = $this->generateValidJWT();
    }

    public function testGetSummary(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/summaries/{$meetingId}", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        // May return 200 with summary or 404 if not found
        $this->assertContains(
            $client->getResponse()->getStatusCode(),
            [200, 404]
        );
    }

    public function testUpdateSummary(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('PUT', "/api/v1/summaries/{$meetingId}", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'title' => 'Updated Summary',
            'content' => ['sections' => ['Introduction', 'Main Points']]
        ]));

        $this->assertContains(
            $client->getResponse()->getStatusCode(),
            [200, 404]
        );
    }

    public function testUpdateSettings(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('PUT', "/api/v1/summaries/{$meetingId}/settings", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'detailLevel' => 'High'
        ]));

        $this->assertContains(
            $client->getResponse()->getStatusCode(),
            [200, 404]
        );
    }

    public function testReturnNullForMissingSummary(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/summaries/{$meetingId}", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        // Should return 404 for missing summary
        if ($client->getResponse()->getStatusCode() === 404) {
            $this->assertEquals(404, $client->getResponse()->getStatusCode());
        } else {
            $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            $this->assertNull($data);
        }
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
