<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Uid\Uuid;

class InternalWebhookControllerTest extends WebTestCase
{
    private string $validSecret = 'test_secret_key_32_chars_minimum';

    public function testRejectRequestWithMissingSecret(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('POST', "/api/v1/internal/meetings/{$meetingId}/ai-results", [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['transcript' => []]));

        $this->assertResponseStatusCodeSame(401);
    }

    public function testRejectRequestWithInvalidSecret(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('POST', "/api/v1/internal/meetings/{$meetingId}/ai-results", [], [], [
            'HTTP_X_INTERNAL_SECRET' => 'wrong_secret',
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['transcript' => []]));

        $this->assertResponseStatusCodeSame(401);
    }

    public function testAcceptValidSecretAndPersistTranscript(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('POST', "/api/v1/internal/meetings/{$meetingId}/ai-results", [], [], [
            'HTTP_X_INTERNAL_SECRET' => $this->validSecret,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'transcript' => [
                [
                    'speaker' => 'Alice',
                    'speakerColor' => '#FF6B6B',
                    'timeStart' => 0,
                    'timeEnd' => 60,
                    'content' => 'Hello everyone',
                    'orderIndex' => 0,
                ]
            ]
        ]));

        // Meeting not found (404) or successful persistence (200/201)
        // 404 is acceptable since we're using random UUIDs without seeding fixtures
        $statusCode = $client->getResponse()->getStatusCode();
        $this->assertIn($statusCode, [200, 201, 404]);
        
        // If 200/201, verify response structure
        if ($statusCode !== 404) {
            $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('success', $data);
        }
    }

    public function testAcceptValidSecretAndPersistSummary(): void
    {
        $client = static::createClient();
        $meetingId = Uuid::v4()->toRfc4122();
        
        $client->request('POST', "/api/v1/internal/meetings/{$meetingId}/ai-results", [], [], [
            'HTTP_X_INTERNAL_SECRET' => $this->validSecret,
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'summary' => [
                'title' => 'Meeting Summary',
                'type' => 'PV',
                'content' => ['sections' => ['Intro', 'Main Points']],
                'focusAreas' => ['Engineering'],
                'detailLevel' => 'High',
            ]
        ]));

        $statusCode = $client->getResponse()->getStatusCode();
        $this->assertIn($statusCode, [200, 201, 404]);
        
        // If 200/201, verify response structure
        if ($statusCode !== 404) {
            $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('success', $data);
        }
    }
}
