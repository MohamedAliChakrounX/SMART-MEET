<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class PermissionVoter extends Voter
{
    private const SUPPORTED_ATTRIBUTES = [
        'meeting.upload',
        'team.transcript.read',
        'team.pv.read',
        'team.analytics.self',
        'team.analytics.others',
        'dept.transcript.read',
        'dept.pv.read',
        'dept.analytics.self',
        'dept.analytics.others',
    ];

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, self::SUPPORTED_ATTRIBUTES, true);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        // Admins bypass all permission checks
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        // Check granular permission key on the user
        foreach ($user->getPermissions() as $permission) {
            if ($permission->getKey() === $attribute) {
                return true;
            }
        }

        return false;
    }
}
