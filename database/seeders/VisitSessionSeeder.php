<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\Inmate;
use App\Models\Jail;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitSession;
use App\VisitStatus;
use Illuminate\Database\Seeder;

class VisitSessionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jails = Jail::where('status', 'active')->get();

        if ($jails->isEmpty()) {
            $this->command->warn('No active jails found. Please run JailFacilitySeeder first.');
            return;
        }

        // Get jail officers for assignment
        $jailOfficers = User::whereHas('role', function ($q) {
            $q->where('slug', 'jail_officer');
        })->get();

        if ($jailOfficers->isEmpty()) {
            $this->command->warn('No jail officers found. Please run HierarchicalUserSeeder first.');
            return;
        }

        foreach ($jails as $jail) {
            $this->createVisitsForJail($jail, $jailOfficers);
        }

        $this->command->info('Visit sessions seeded successfully.');
    }

    /**
     * Create visits and visit sessions for a jail.
     */
    private function createVisitsForJail($jail, $jailOfficers): void
    {
        // Create 5-10 visits per jail
        $visitsCount = rand(5, 10);
        
        for ($i = 0; $i < $visitsCount; $i++) {
            $this->createVisitWithSession($jail, $jailOfficers);
        }
    }

    /**
     * Create a visit with associated session.
     */
    private function createVisitWithSession($jail, $jailOfficers): void
    {
        // Get or create an inmate for this jail
        $inmate = $this->getOrCreateInmate($jail);

        // Get a visitor user
        $visitor = User::whereHas('role', function ($q) {
            $q->where('slug', 'visitor');
        })->inRandomOrder()->first();

        if (!$visitor) {
            // Get visitor role and create a temporary visitor
            $visitorRole = \App\Models\Role::where('slug', 'visitor')->first();
            if (!$visitorRole) {
                return; // Skip if no visitor role exists
            }
            
            $visitor = User::factory()->create([
                'role_id' => $visitorRole->id,
                'approval_status' => 'approved',
            ]);
        }

        // Select a random jail officer from the same branch
        $branchOfficers = $jailOfficers->filter(function ($officer) use ($jail) {
            return $officer->branch_id === $jail->branch_id;
        });

        $jailOfficer = $branchOfficers->isNotEmpty() 
            ? $branchOfficers->random() 
            : $jailOfficers->random();

        // Generate realistic timestamps
        $scheduledDate = now()->addDays(rand(-5, 10));
        $timeSlots = ['09:00', '10:00', '13:00', '14:00', '15:00'];
        $scheduledTime = $timeSlots[array_rand($timeSlots)];

        // Random status distribution
        $statuses = [
            VisitStatus::Pending->value => 20,
            VisitStatus::Approved->value => 30,
            VisitStatus::Completed->value => 30,
            VisitStatus::Cancelled->value => 10,
            VisitStatus::Missed->value => 10,
        ];

        $status = $this->getWeightedRandom($statuses);

        // Create visit
        $visit = Visit::create([
            'user_id' => $visitor->id,
            'jail_officer_id' => $jailOfficer->id,
            'inmate_id' => $inmate->id,
            'jail_id' => $jail->id, // Tagged with jail_id for ownership
            'scheduled_date' => $scheduledDate,
            'scheduled_time' => $scheduledTime,
            'visit_type' => rand(0, 1) ? 'virtual' : 'physical',
            'inmate_first_name' => $inmate->first_name,
            'inmate_middle_name' => $inmate->middle_name ?? null,
            'inmate_last_name' => $inmate->last_name,
            'relationship_to_inmate' => fake()->randomElement(['spouse', 'parent', 'child', 'sibling', 'friend']),
            'status' => $status,
            'notes' => fake()->optional(0.7)->sentence(),
        ]);

        // Create visit session if visit is approved or completed
        if (in_array($status, [VisitStatus::Approved->value, VisitStatus::Completed->value])) {
            $this->createVisitSession($visit, $jailOfficer);
        }
    }

    /**
     * Create a visit session for a visit.
     */
    private function createVisitSession($visit, $jailOfficer): void
    {
        $scheduledStart = $visit->scheduled_date->copy()->setTime(
            (int) explode(':', $visit->scheduled_time)[0],
            (int) explode(':', $visit->scheduled_time)[1]
        );

        $scheduledEnd = $scheduledStart->copy()->addHour();

        // Determine session status based on visit status
        $sessionStatus = match ($visit->status->value) {
            VisitStatus::Completed->value => 'completed',
            default => rand(0, 1) ? 'scheduled' : 'active',
        };

        VisitSession::create([
            'visit_id' => $visit->id,
            'jail_id' => $visit->jail_id, // Inherit jail_id from visit
            'room_id' => 'ROOM-' . strtoupper(fake()->unique()->bothify('??###')),
            'monitor_id' => $jailOfficer->id,
            'scheduled_start' => $scheduledStart,
            'scheduled_end' => $scheduledEnd,
            'status' => $sessionStatus,
            'recording_status' => rand(0, 1) ? 'saved' : 'pending',
            'started_at' => $sessionStatus !== 'scheduled' ? $scheduledStart->copy()->addMinutes(rand(0, 15)) : null,
            'ended_at' => $sessionStatus === 'completed' ? $scheduledEnd->copy()->addMinutes(rand(5, 30)) : null,
            'terms_accepted_at' => now(),
            'session_consent_accepted' => true,
            'session_consent_timestamp' => now(),
        ]);
    }

    /**
     * Get or create an inmate for a jail.
     */
    private function getOrCreateInmate($jail): Inmate
    {
        // Try to get existing inmate from this jail
        $inmate = Inmate::whereHas('cell', function ($q) use ($jail) {
            $q->whereHas('dormitory', function ($q) use ($jail) {
                $q->whereHas('annex', function ($q) use ($jail) {
                    $q->where('jail_id', $jail->id);
                });
            });
        })->inRandomOrder()->first();

        if ($inmate) {
            return $inmate;
        }

        // Create new inmate if none exists
        // Get a random cell from this jail
        $cell = Cell::whereHas('dormitory.annex', function ($q) use ($jail) {
            $q->where('jail_id', $jail->id);
        })->inRandomOrder()->first();

        if (!$cell) {
            // Skip creating inmate if no cell available
            // This shouldn't happen in a properly seeded database
            return Inmate::create([
                'first_name' => fake()->firstName(),
                'middle_name' => fake()->optional()->lastName(),
                'last_name' => fake()->lastName(),
                'inmate_number' => fake()->unique()->bothify('INM-#####'),
                'cell_id' => null, // Allow null for edge cases
                'date_of_birth' => fake()->dateTimeBetween('-40 years', '-18 years'),
                'status' => 'active',
            ]);
        }

        return Inmate::create([
            'first_name' => fake()->firstName(),
            'middle_name' => fake()->optional()->lastName(),
            'last_name' => fake()->lastName(),
            'inmate_number' => fake()->unique()->bothify('INM-#####'),
            'cell_id' => $cell->id,
            'date_of_birth' => fake()->dateTimeBetween('-40 years', '-18 years'),
            'status' => 'active',
        ]);
    }

    /**
     * Get weighted random value.
     */
    private function getWeightedRandom($weights): string
    {
        $total = array_sum($weights);
        $rand = mt_rand(1, $total);
        
        foreach ($weights as $key => $weight) {
            $rand -= $weight;
            if ($rand <= 0) {
                return $key;
            }
        }
        
        return array_key_first($weights);
    }
}
