<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260504103000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional project link to meeting table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE meeting ADD project_id UUID DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN meeting.project_id IS \'(DC2Type:uuid)\'');
        $this->addSql('CREATE INDEX IDX_7CE62F1F166D1F9C ON meeting (project_id)');
        $this->addSql('ALTER TABLE meeting ADD CONSTRAINT FK_7CE62F1F166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE meeting DROP CONSTRAINT FK_7CE62F1F166D1F9C');
        $this->addSql('DROP INDEX IDX_7CE62F1F166D1F9C');
        $this->addSql('ALTER TABLE meeting DROP project_id');
    }
}

