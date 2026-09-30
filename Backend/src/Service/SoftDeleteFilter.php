<?php

namespace App\Service;

use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\Filter\SQLFilter;

class SoftDeleteFilter extends SQLFilter
{
    /**
     * Add soft-delete constraint to exclude rows where deletedAt IS NOT NULL
     */
    public function addFilterConstraint(ClassMetadata $targetEntity, string $targetTableAlias): string
    {
        // Only apply filter to entities that have a deletedAt field
        if (!$targetEntity->hasField('deletedAt')) {
            return '';
        }

        return sprintf('%s.deleted_at IS NULL', $targetTableAlias);
    }
}
