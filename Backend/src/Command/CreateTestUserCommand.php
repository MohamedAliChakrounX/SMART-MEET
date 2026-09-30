<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-test-user',
    description: 'Create a test user for development',
)]
class CreateTestUserCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        // Check if user already exists
        $existingUser = $this->entityManager->getRepository(User::class)
            ->findOneBy(['email' => 'test@example.com']);

        if ($existingUser) {
            $io->warning('Test user already exists: test@example.com');
            return Command::SUCCESS;
        }

        // Create test user
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setFirstName('Test');
        $user->setLastName('User');
        $user->setRoles(['ROLE_USER']);
        
        // Hash password
        $hashedPassword = $this->passwordHasher->hashPassword($user, 'password123');
        $user->setPassword($hashedPassword);

        // Persist
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $io->success('Test user created successfully!');
        $io->text([
            'Email: test@example.com',
            'Password: password123',
        ]);

        return Command::SUCCESS;
    }
}
