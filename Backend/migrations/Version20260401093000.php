<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Create Meeting, TranscriptSegment, Summary, and AnalyticData entities with all columns.
 */
final class Version20260401093000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create Meeting, TranscriptSegment, Summary, and AnalyticData entities';
    }

    public function up(Schema $schema): void
    {
        // Create meeting table with decisions and action_items
        $this->addSql('CREATE TABLE meeting (id UUID NOT NULL, owner_id UUID NOT NULL, title VARCHAR(255) NOT NULL, start_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, duration_minutes INT NOT NULL, status VARCHAR(50) NOT NULL, participants JSON NOT NULL, description VARCHAR(500) DEFAULT NULL, starred BOOLEAN NOT NULL, decisions JSON DEFAULT NULL, action_items JSON DEFAULT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_F515E139D3574D9F ON meeting (owner_id)');

        // Create transcript_segment table
        $this->addSql('CREATE TABLE transcript_segment (id UUID NOT NULL, meeting_id UUID NOT NULL, speaker VARCHAR(100) NOT NULL, speaker_color VARCHAR(10) DEFAULT NULL, time_start INT NOT NULL, time_end INT NOT NULL, content TEXT NOT NULL, order_index INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_7C4D5F3B0C2B53C ON transcript_segment (meeting_id)');

        // Create summary table
        $this->addSql('CREATE TABLE summary (id UUID NOT NULL, meeting_id UUID NOT NULL, title VARCHAR(255) DEFAULT NULL, type VARCHAR(50) NOT NULL, content JSON NOT NULL, focus_areas JSON NOT NULL, detail_level VARCHAR(50) DEFAULT NULL, version INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_4E0F462BD3574D9F ON summary (meeting_id)');

        // Create analytic_data table
        $this->addSql('CREATE TABLE analytic_data (id UUID NOT NULL, meeting_id UUID NOT NULL, metric_key VARCHAR(100) NOT NULL, metric_value JSON NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_28E04C2BD3574D9F ON analytic_data (meeting_id)');

        // Add foreign keys
        $this->addSql('ALTER TABLE meeting ADD CONSTRAINT FK_F515E139D3574D9F FOREIGN KEY (owner_id) REFERENCES "user" (id)');
        $this->addSql('ALTER TABLE transcript_segment ADD CONSTRAINT FK_7C4D5F3B0C2B53C FOREIGN KEY (meeting_id) REFERENCES meeting (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE summary ADD CONSTRAINT FK_4E0F462BD3574D9F FOREIGN KEY (meeting_id) REFERENCES meeting (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE analytic_data ADD CONSTRAINT FK_28E04C2BD3574D9F FOREIGN KEY (meeting_id) REFERENCES meeting (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transcript_segment DROP CONSTRAINT FK_7C4D5F3B0C2B53C');
        $this->addSql('ALTER TABLE summary DROP CONSTRAINT FK_4E0F462BD3574D9F');
        $this->addSql('ALTER TABLE analytic_data DROP CONSTRAINT FK_28E04C2BD3574D9F');
        $this->addSql('ALTER TABLE meeting DROP CONSTRAINT FK_F515E139D3574D9F');
        $this->addSql('DROP TABLE transcript_segment');
        $this->addSql('DROP TABLE summary');
        $this->addSql('DROP TABLE analytic_data');
        $this->addSql('DROP TABLE meeting');
    }
}
