<?php

namespace App\Security;

use App\Repository\TokenDenylistRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTDecodedEvent;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class DenylistTokenValidator implements EventSubscriberInterface
{
    public function __construct(
        private readonly TokenDenylistRepository $denylistRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            'lexik_jwt_authentication.on_jwt_decoded' => 'onJwtDecoded',
        ];
    }

    public function onJwtDecoded(JWTDecodedEvent $event): void
    {
        $payload = $event->getPayload();
        $jti = $payload['jti'] ?? null;

        if (null === $jti) {
            return;
        }

        if ($this->denylistRepository->findByJti($jti) !== null) {
            $this->logger->warning('Rejected denylisted JWT token.', ['jti' => $jti]);
            $event->markAsInvalid();
        }
    }
}
