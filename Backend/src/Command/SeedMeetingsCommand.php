<?php

namespace App\Command;

use App\Entity\AnalyticData;
use App\Entity\Meeting;
use App\Entity\Summary;
use App\Entity\TranscriptSegment;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed:meetings',
    description: 'Seeds sample meetings with transcripts, summaries, and analytics for development.',
)]
class SeedMeetingsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        // Get first user (assuming admin exists from CreateAdminUserCommand)
        $userRepository = $this->entityManager->getRepository(User::class);
        $user = $userRepository->findOneBy([]);

        if (!$user) {
            $io->error('No users found. Please create at least one user with app:create:admin-user');

            return Command::FAILURE;
        }

        $io->info(sprintf('Seeding meetings for user: %s', $user->getEmail()));

        $meetingTitles = [
            'Q1 Planning Session',
            'Product Roadmap Discussion',
            'Engineering Team Standup',
            'Client Presentation',
            'Budget Review',
        ];

        $speakers = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        $colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

        for ($i = 0; $i < 5; $i++) {
            $meeting = new Meeting();
            $meeting->setOwner($user);
            $meeting->setTitle($meetingTitles[$i] ?? sprintf('Meeting %d', $i + 1));
            $meeting->setStartAt(new \DateTimeImmutable(sprintf('-%d days', 30 - $i * 5)));
            $meeting->setDurationMinutes(60 + $i * 10);
            $meeting->setStatus('Completed');
            $meeting->setParticipants(array_slice($speakers, 0, rand(2, 4)));
            $meeting->setDescription(sprintf('Sample meeting #%d for testing', $i + 1));
            $meeting->setStarred($i % 2 === 0);

            // Add transcript segments
            $content = [
                'Let\'s discuss our quarterly goals and objectives.',
                'We need to focus on product improvements and customer feedback.',
                'The timeline should be aggressive but realistic.',
                'I agree. We can allocate resources accordingly.',
                'Let\'s schedule a follow-up with the engineering team.',
            ];

            for ($j = 0; $j < count($content); $j++) {
                $segment = new TranscriptSegment();
                $segment->setMeeting($meeting);
                $segment->setSpeaker($speakers[$j % count($speakers)]);
                $segment->setSpeakerColor($colors[$j % count($colors)]);
                $segment->setTimeStart($j * 15 * 60);
                $segment->setTimeEnd(($j + 1) * 15 * 60);
                $segment->setContent($content[$j]);
                $segment->setOrderIndex($j);
                $this->entityManager->persist($segment);
            }

            // Add summary
            $summary = new Summary();
            $summary->setMeeting($meeting);
            $summary->setTitle(sprintf('Summary of %s', $meeting->getTitle()));
            $summary->setType('PV');
            $summary->setContent([
                'objectives' => ['Improve product quality', 'Increase customer satisfaction'],
                'decisions' => ['Allocate 40% resources to Q2', 'Monthly review meetings scheduled'],
            ]);
            $summary->setFocusAreas(['Product', 'Engineering', 'Customer Experience']);
            $summary->setDetailLevel('Medium');
            $summary->setVersion(1);
            $this->entityManager->persist($summary);

            // Add analytics
            $analyticsData = [
                'totalDuration' => $meeting->getDurationMinutes(),
                'speakerCount' => count($meeting->getParticipants()),
                'topicCount' => 3,
            ];

            $analytic = new AnalyticData();
            $analytic->setMeeting($meeting);
            $analytic->setMetricKey('summaryMetrics');
            $analytic->setMetricValue($analyticsData);
            $this->entityManager->persist($analytic);

            $this->entityManager->persist($meeting);
            $io->writeln(sprintf('Created meeting: %s', $meeting->getTitle()));
        }

        $this->entityManager->flush();
        $io->success('Successfully seeded 5 sample meetings with transcripts, summaries, and analytics!');

        return Command::SUCCESS;
    }
}
