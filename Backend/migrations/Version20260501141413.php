<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260501141413 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE audit_log (id UUID NOT NULL, action VARCHAR(50) NOT NULL, payload JSON DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, admin_id UUID NOT NULL, target_user_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_F6E1C0F5642B8210 ON audit_log (admin_id)');
        $this->addSql('CREATE INDEX IDX_F6E1C0F56C066AFE ON audit_log (target_user_id)');
        $this->addSql('CREATE TABLE permission_profile (id UUID NOT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_B6464B585E237E06 ON permission_profile (name)');
        $this->addSql('CREATE TABLE permission_profile_permission (permission_profile_id UUID NOT NULL, permission_id UUID NOT NULL, PRIMARY KEY (permission_profile_id, permission_id))');
        $this->addSql('CREATE INDEX IDX_9A34074988DCC8E5 ON permission_profile_permission (permission_profile_id)');
        $this->addSql('CREATE INDEX IDX_9A340749FED90CCA ON permission_profile_permission (permission_id)');
        $this->addSql('ALTER TABLE audit_log ADD CONSTRAINT FK_F6E1C0F5642B8210 FOREIGN KEY (admin_id) REFERENCES "user" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE audit_log ADD CONSTRAINT FK_F6E1C0F56C066AFE FOREIGN KEY (target_user_id) REFERENCES "user" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE permission_profile_permission ADD CONSTRAINT FK_9A34074988DCC8E5 FOREIGN KEY (permission_profile_id) REFERENCES permission_profile (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE permission_profile_permission ADD CONSTRAINT FK_9A340749FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE "user" ADD permission_profile_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD CONSTRAINT FK_8D93D64988DCC8E5 FOREIGN KEY (permission_profile_id) REFERENCES permission_profile (id)');
        $this->addSql('CREATE INDEX IDX_8D93D64988DCC8E5 ON "user" (permission_profile_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE audit_log DROP CONSTRAINT FK_F6E1C0F5642B8210');
        $this->addSql('ALTER TABLE audit_log DROP CONSTRAINT FK_F6E1C0F56C066AFE');
        $this->addSql('ALTER TABLE permission_profile_permission DROP CONSTRAINT FK_9A34074988DCC8E5');
        $this->addSql('ALTER TABLE permission_profile_permission DROP CONSTRAINT FK_9A340749FED90CCA');
        $this->addSql('DROP TABLE audit_log');
        $this->addSql('DROP TABLE permission_profile');
        $this->addSql('DROP TABLE permission_profile_permission');
        $this->addSql('ALTER TABLE "user" DROP CONSTRAINT FK_8D93D64988DCC8E5');
        $this->addSql('DROP INDEX IDX_8D93D64988DCC8E5');
        $this->addSql('ALTER TABLE "user" DROP permission_profile_id');
    }
}
