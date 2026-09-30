<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Corrects the behavioral_interpretation table to match Doctrine's expected schema:
 * - Removes DEFAULT values on columns (Doctrine manages defaults at the PHP level)
 * - Renames the unique index to Doctrine's auto-generated name
 */
final class Version20260502130001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Sync behavioral_interpretation table with Doctrine mapping (remove SQL defaults, rename index)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE behavioral_interpretation ALTER meeting_dynamics DROP DEFAULT');
        $this->addSql('ALTER TABLE behavioral_interpretation ALTER speakers DROP DEFAULT');
        $this->addSql('ALTER TABLE behavioral_interpretation ALTER model DROP DEFAULT');
        $this->addSql('ALTER TABLE behavioral_interpretation ALTER language DROP DEFAULT');
        $this->addSql('ALTER INDEX uniq_bi_meeting RENAME TO UNIQ_775A5DA467433D9C');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE behavioral_interpretation ALTER meeting_dynamics SET DEFAULT ''");
        $this->addSql("ALTER TABLE behavioral_interpretation ALTER speakers SET DEFAULT '[]'");
        $this->addSql("ALTER TABLE behavioral_interpretation ALTER model SET DEFAULT 'qwen3:4b'");
        $this->addSql("ALTER TABLE behavioral_interpretation ALTER language SET DEFAULT 'fr'");
        $this->addSql('ALTER INDEX UNIQ_775A5DA467433D9C RENAME TO uniq_bi_meeting');
    }
}
