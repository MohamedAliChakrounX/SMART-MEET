<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Creates the behavioral_interpretation table — a dedicated, typed store
 * for AI-generated meeting behavioral analyses (replacing the generic
 * analytic_data row with metric_key = 'ai_interpretation').
 *
 * Also migrates any existing ai_interpretation rows from analytic_data
 * into the new table so no data is lost.
 */
final class Version20260502130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create behavioral_interpretation table and migrate existing ai_interpretation data from analytic_data';
    }

    public function up(Schema $schema): void
    {
        // 1. Create the new dedicated table
        $this->addSql(
            'CREATE TABLE behavioral_interpretation (
                id           UUID        NOT NULL,
                meeting_id   UUID        NOT NULL,
                meeting_dynamics TEXT    NOT NULL DEFAULT \'\',
                speakers     JSON        NOT NULL DEFAULT \'[]\',
                model        VARCHAR(100) NOT NULL DEFAULT \'qwen3:4b\',
                language     VARCHAR(10)  NOT NULL DEFAULT \'fr\',
                generated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                created_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY(id)
            )'
        );

        // 2. Unique index: one interpretation per meeting
        $this->addSql(
            'CREATE UNIQUE INDEX UNIQ_BI_MEETING ON behavioral_interpretation (meeting_id)'
        );

        // 3. Foreign key → meeting (cascade delete keeps data clean)
        $this->addSql(
            'ALTER TABLE behavioral_interpretation
             ADD CONSTRAINT FK_BI_MEETING
             FOREIGN KEY (meeting_id) REFERENCES meeting (id) ON DELETE CASCADE'
        );

        // 4. Migrate existing ai_interpretation rows from analytic_data
        //    The stored metric_value JSON looks like:
        //      {"ai_interpretation": {"meeting_dynamics": "...", "speakers": {...}}}
        $this->addSql("
            INSERT INTO behavioral_interpretation
                (id, meeting_id, meeting_dynamics, speakers, model, language, generated_at, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                ad.meeting_id,
                COALESCE(
                    ad.metric_value -> 'ai_interpretation' ->> 'meeting_dynamics',
                    ad.metric_value ->> 'meeting_dynamics',
                    ''
                ),
                COALESCE(
                    ad.metric_value -> 'ai_interpretation' -> 'speakers',
                    ad.metric_value -> 'speakers',
                    '[]'::json
                ),
                'qwen3:4b',
                'fr',
                ad.created_at,
                ad.created_at,
                ad.updated_at
            FROM analytic_data ad
            WHERE ad.metric_key = 'ai_interpretation'
        ");

        // 5. Remove migrated rows from analytic_data (keep it clean)
        $this->addSql(
            "DELETE FROM analytic_data WHERE metric_key = 'ai_interpretation'"
        );
    }

    public function down(Schema $schema): void
    {
        // Move data back to analytic_data before dropping the table
        $this->addSql("
            INSERT INTO analytic_data (id, meeting_id, metric_key, metric_value, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                bi.meeting_id,
                'ai_interpretation',
                json_build_object(
                    'ai_interpretation',
                    json_build_object(
                        'meeting_dynamics', bi.meeting_dynamics,
                        'speakers',         bi.speakers
                    )
                ),
                bi.created_at,
                bi.updated_at
            FROM behavioral_interpretation bi
        ");

        $this->addSql('ALTER TABLE behavioral_interpretation DROP CONSTRAINT FK_BI_MEETING');
        $this->addSql('DROP TABLE behavioral_interpretation');
    }
}
