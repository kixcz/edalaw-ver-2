<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Suggestion;
use App\SuggestionStatus;
use Illuminate\Database\Seeder;

class SuggestionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $visitors = User::whereHas('role', function ($q) {
            $q->where('slug', 'visitor');
        })->get();

        if ($visitors->isEmpty()) {
            $this->command->warn('No visitor users found. Please run user seeders first.');
            return;
        }

        $this->command->info('Seeding suggestions...');
        
        $totalSuggestions = 0;
        $types = ['suggestion', 'complaint'];

        // Create 10-20 suggestions
        $suggestionsCount = rand(10, 20);
        
        for ($i = 0; $i < $suggestionsCount; $i++) {
            $visitor = $visitors->random();

            Suggestion::create([
                'user_id' => $visitor->id,
                'type' => fake()->randomElement($types),
                'subject' => fake()->sentence(),
                'message' => fake()->paragraph(),
                'status' => fake()->randomElement([
                    SuggestionStatus::Pending->value,
                    SuggestionStatus::Reviewed->value,
                    SuggestionStatus::InProgress->value,
                    SuggestionStatus::Resolved->value,
                    SuggestionStatus::Dismissed->value,
                ]),
                'submitted_at' => fake()->dateTimeBetween('-6 months', 'now'),
                'reviewed_at' => fake()->optional(0.5)->dateTimeBetween('-3 months', 'now'),
                'admin_response' => fake()->optional(0.4)->paragraph(),
            ]);
            
            $totalSuggestions++;
        }

        $this->command->info("  Created {$totalSuggestions} suggestions successfully.");
    }
}
