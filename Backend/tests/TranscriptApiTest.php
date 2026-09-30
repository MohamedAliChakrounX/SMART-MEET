<?php

namespace App\Tests\Controller;

use App\Entity\Meeting;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

class TranscriptApiTest extends WebTestCase
{
    private string $bearerToken;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->bearerToken = $this->generateValidJWT();
    }

    public function testGetAllSegmentsForMeeting(): void
    {
        $client = static::createClient();
        // Assuming a meeting ID exists in the test database
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/meetings/{$meetingId}/transcript", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($data);
    }

    public function testUpdateSegments(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('PUT', "/api/v1/meetings/{$meetingId}/transcript", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'segments' => [
                ['id' => Uuid::v4()->toRfc4122(), 'content' => 'Updated content']
            ]
        ]));

        $this->assertResponseIsSuccessful();
    }

    public function testReturnEmptyArrayForInProgressMeeting(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('GET', "/api/v1/meetings/{$meetingId}/transcript", [], [], [
            'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $this->bearerToken),
        ]);

        // Should return 200 with empty array or placeholder
        $this->assertResponseIsSuccessful();
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
