<?php

namespace App\Command;

use App\Entity\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed:permissions',
    description: 'Seeds the initial permission data into the database.',
)]
class SeedPermissionsCommand extends Command
{
    private const INITIAL_PERMISSIONS = [
        'meeting.upload' => 'Uploader un meeting (génère transcription, PV et analytics)',
        'team.transcript.read' => 'Voir les transcriptions de son équipe',
        'team.pv.read' => 'Voir les PV (Procès-Verbal) de son équipe',
        'team.analytics.self' => 'Voir ses propres analytics comportementales (équipe)',
        'team.analytics.others' => 'Voir les analytics des autres membres de son équipe',
        'dept.transcript.read' => 'Voir les transcriptions de son département',
        'dept.pv.read' => 'Voir les PV de son département',
        'dept.analytics.self' => 'Voir ses propres analytics (département)',
        'dept.analytics.others' => 'Voir les analytics des autres membres de son département',
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $permissionRepository = $this->entityManager->getRepository(Permission::class);

        foreach (self::INITIAL_PERMISSIONS as $key => $description) {
            if ($permissionRepository->findOneBy(['key' => $key])) {
                $io->note(sprintf('Permission "%s" already exists, skipping.', $key));
                continue;
            }

            $permission = new Permission();
            $permission->setKey($key);
            $permission->setDescription($description);
            $this->entityManager->persist($permission);
            $io->info(sprintf('Permission "%s" generated.', $key));
        }

        $this->entityManager->flush();
        $io->success('Initial permissions seeded successfully.');

        return Command::SUCCESS;
    }
}
