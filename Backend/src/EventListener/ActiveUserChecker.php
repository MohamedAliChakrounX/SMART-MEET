<?php

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTAuthenticatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Psr\Log\LoggerInterface;

class ActiveUserChecker implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            Events::JWT_AUTHENTICATED => 'onJWTAuthenticated',
        ];
    }

    public function onJWTAuthenticated(JWTAuthenticatedEvent $event): void
    {
        $user = $event->getToken()->getUser();

        if (!$user instanceof User) {
            return;
        }

        if (!$user->isActive()) {
            $this->logger->warning('Access denied for inactive user.', [
                'user' => $user->getUserIdentifier(),
                'id' => $user->getId()
            ]);
            
            throw new CustomUserMessageAuthenticationException('account_disabled');
        }
    }
}
