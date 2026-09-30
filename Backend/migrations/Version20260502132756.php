<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Creates organizational structure tables (department, team, project)
 * and links users to teams.
 */
final class Version20260502132756 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create organizational entities (Department, Team, Project) and link User to Team';
    }

    public function up(Schema $schema): void
    {
        // 1. Create Department
        $this->addSql('CREATE TABLE department (id UUID NOT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('COMMENT ON COLUMN department.id IS \'(DC2Type:uuid)\'');

        // 2. Create Team
        $this->addSql('CREATE TABLE team (id UUID NOT NULL, department_id UUID NOT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_C4E0A61FCE9DC7 ON team (department_id)');
        $this->addSql('COMMENT ON COLUMN team.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN team.department_id IS \'(DC2Type:uuid)\'');

        // 3. Create Project
        $this->addSql('CREATE TABLE project (id UUID NOT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('COMMENT ON COLUMN project.id IS \'(DC2Type:uuid)\'');

        // 4. Create Project/Team pivot (ManyToMany)
        $this->addSql('CREATE TABLE project_team (project_id UUID NOT NULL, team_id UUID NOT NULL, PRIMARY KEY(project_id, team_id))');
        $this->addSql('CREATE INDEX IDX_6997A531166D1F9C ON project_team (project_id)');
        $this->addSql('CREATE INDEX IDX_6997A531296CD8AE ON project_team (team_id)');
        $this->addSql('COMMENT ON COLUMN project_team.project_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN project_team.team_id IS \'(DC2Type:uuid)\'');

        // 5. Foreign Keys for Teams and Projects
        $this->addSql('ALTER TABLE team ADD CONSTRAINT FK_C4E0A61FCE9DC7 FOREIGN KEY (department_id) REFERENCES department (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE project_team ADD CONSTRAINT FK_6997A531166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE project_team ADD CONSTRAINT FK_6997A531296CD8AE FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // 6. Link User to Team
        $this->addSql('ALTER TABLE "user" ADD team_id UUID DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN "user".team_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE "user" ADD CONSTRAINT FK_8D93D649296CD8AE FOREIGN KEY (team_id) REFERENCES team (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_8D93D649296CD8AE ON "user" (team_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP CONSTRAINT FK_8D93D649296CD8AE');
        $this->addSql('DROP INDEX IDX_8D93D649296CD8AE');
        $this->addSql('ALTER TABLE "user" DROP team_id');
        
        $this->addSql('ALTER TABLE project_team DROP CONSTRAINT FK_6997A531166D1F9C');
        $this->addSql('ALTER TABLE project_team DROP CONSTRAINT FK_6997A531296CD8AE');
        $this->addSql('ALTER TABLE team DROP CONSTRAINT FK_C4E0A61FCE9DC7');
        
        $this->addSql('DROP TABLE department');
        $this->addSql('DROP TABLE team');
        $this->addSql('DROP TABLE project');
        $this->addSql('DROP TABLE project_team');
    }
}
