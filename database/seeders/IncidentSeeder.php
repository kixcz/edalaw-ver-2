<?php

namespace Database\Seeders;

use App\Models\MonitoringSession;
use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $monitoringSessions = MonitoringSession::all();
        $jailOfficers = User::whereHas('role', function ($q) {
            $q->where('slug', 'jail_officer');
        })->get();

        if ($monitoringSessions->isEmpty()) {
            $this->command->warn('No monitoring sessions found. Skipping incident seeding.');
            return;
        }

        $this->command->info('Seeding incidents...');
        
        $totalIncidents = 0;
        $classifications = ['minor', 'major', 'critical'];
        $statuses = ['open', 'under_review', 'resolved', 'closed'];

        // Create 10-20 incidents
        $incidentsCount = rand(10, 20);
        
        for ($i = 0; $i < $incidentsCount; $i++) {
            $session = $monitoringSessions->random();
            $reportedBy = $jailOfficers->isNotEmpty() ? $jailOfficers->random() : null;

            Incident::create([
                'monitoring_session_id' => $session->id,
                'reported_by' => $reportedBy?->id,
                'title' => fake()->sentence(),
                'description' => fake()->paragraph(),
                'classification' => fake()->randomElement($classifications),
                'status' => fake()->randomElement($statuses),
                'attached_chat_excerpts' => fake()->optional(0.4)->jsonEncode([fake()->sentence(), fake()->sentence()]),
                'video_timestamps' => fake()->optional(0.5)->jsonEncode([rand(60, 3600), rand(60, 3600)]),
                'notes' => fake()->optional(0.6)->paragraph(),
                'reviewed_by' => fake()->boolean(40) ? ($jailOfficers->isNotEmpty() ? $jailOfficers->random()->id : null) : null,
                'reviewed_at' => fake()->optional(0.4)->dateTimeBetween('-1 month', 'now'),
                'admin_response' => fake()->optional(0.4)->paragraph(),
            ]);
            
            $totalIncidents++;
        }

        $this->command->info("  Created {$totalIncidents} incidents successfully.");
    }
}
