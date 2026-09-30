<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Creates a new admin user.',
)]
class CreateAdminUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('email', null, InputOption::VALUE_REQUIRED, 'Admin email')
            ->addOption('password', null, InputOption::VALUE_REQUIRED, 'Admin password')
            ->addOption('firstName', null, InputOption::VALUE_REQUIRED, 'First name')
            ->addOption('lastName', null, InputOption::VALUE_REQUIRED, 'Last name')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        
        $email = $input->getOption('email');
        $password = $input->getOption('password');
        $firstName = $input->getOption('firstName');
        $lastName = $input->getOption('lastName');

        if (!$email || !$password) {
            $io->error('Email and password are required.');
            return Command::FAILURE;
        }

        $user = new User();
        $user->setEmail($email);
        $user->setFirstName($firstName ?? 'Admin');
        $user->setLastName($lastName ?? 'Super');
        $user->setRoles(['ROLE_ADMIN']);
        
        $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $io->success(sprintf('Admin user "%s" created successfully.', $email));

        return Command::SUCCESS;
    }
}
