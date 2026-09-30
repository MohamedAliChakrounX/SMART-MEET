<?php
namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:force-password')]
class UpdateAdminPasswordCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => 'admin@meeting-ia.com']);
        if (!$user) {
            $output->writeln("User not found.");
            return Command::FAILURE;
        }

        $user->setPassword($this->hasher->hashPassword($user, 'Admin1234!'));
        $this->em->flush();
        $output->writeln("Password updated via native hasher.");
        return Command::SUCCESS;
    }
}
