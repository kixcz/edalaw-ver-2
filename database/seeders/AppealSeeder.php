<?php

namespace Database\Seeders;

use App\Models\Appeal;
use App\Models\User;
use App\Models\Visit;
use App\Models\Eburol;
use App\AppealStatus;
use Illuminate\Database\Seeder;

class AppealSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $visitors = User::whereHas('role', function ($q) {
            $q->where('slug', 'visitor');
        })->get();

        $visits = Visit::all();
        $eburoles = Eburol::all();

        if ($visitors->isEmpty()) {
            $this->command->warn('No visitor users found. Please run user seeders first.');
            return;
        }

        $this->command->info('Seeding appeals...');
        
        $totalAppeals = 0;

        // Create 15-25 appeals
        $appealsCount = rand(15, 25);
        
        for ($i = 0; $i < $appealsCount; $i++) {
            $visitor = $visitors->random();
            
            // Randomly choose between Visit or Eburol
            $appealable = fake()->boolean() && $visits->isNotEmpty() 
                ? $visits->random() 
                : ($eburoles->isNotEmpty() ? $eburoles->random() : null);

            if (!$appealable) {
                continue;
            }

            Appeal::create([
                'user_id' => $visitor->id,
                'appealable_type' => get_class($appealable),
                'appealable_id' => $appealable->id,
                'reason' => fake()->paragraph(),
                'status' => fake()->randomElement([
                    AppealStatus::Pending->value,
                    AppealStatus::Approved->value,
                    AppealStatus::Rejected->value,
                ]),
                'submitted_at' => fake()->dateTimeBetween('-3 months', 'now'),
                'reviewed_at' => fake()->optional(0.5)->dateTimeBetween('-2 months', 'now'),
                'reviewed_by' => fake()->boolean(40) ? $visitors->random()->id : null,
                'decision_notes' => fake()->optional(0.4)->paragraph(),
                'deadline' => fake()->optional(0.6)->dateTimeBetween('now', '+1 month'),
            ]);
            
            $totalAppeals++;
        }

        $this->command->info("  Created {$totalAppeals} appeals successfully.");
    }
}
