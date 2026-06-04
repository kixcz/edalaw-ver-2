<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\CellScheduleTemplate;
use Illuminate\Database\Seeder;

class CellScheduleTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cells = Cell::where('status', 'active')->get();

        if ($cells->isEmpty()) {
            $this->command->warn('No active cells found. Please run JailFacilitySeeder first.');
            return;
        }

        $this->command->info('Seeding cell schedule templates...');
        
        $totalSchedules = 0;
        
        foreach ($cells as $cell) {
            // Create schedule for each day of the week (0=Sunday, 6=Saturday)
            for ($day = 0; $day <= 6; $day++) {
                $this->createScheduleTemplate($cell, $day);
                $totalSchedules++;
            }
        }

        $this->command->info("  Created {$totalSchedules} cell schedule templates successfully.");
    }

    /**
     * Create a schedule template for a cell and day of week.
     */
    private function createScheduleTemplate($cell, $dayOfWeek): void
    {
        // Randomly decide if this day is available (70% chance)
        $isAvailable = fake()->boolean(70);
        
        if (!$isAvailable) {
            CellScheduleTemplate::firstOrCreate([
                'cell_id' => $cell->id,
                'day_of_week' => $dayOfWeek,
            ], [
                'virtual_available' => false,
                'physical_available' => false,
                'time_slots' => null,
            ]);
            return;
        }

        // Realistic visitation time slots
        $timeSlots = [
            [
                'start_time' => '08:00:00',
                'end_time' => '10:00:00',
                'type' => fake()->randomElement(['virtual', 'physical', 'both']),
            ],
            [
                'start_time' => '10:00:00',
                'end_time' => '12:00:00',
                'type' => fake()->randomElement(['virtual', 'physical', 'both']),
            ],
            [
                'start_time' => '13:00:00',
                'end_time' => '15:00:00',
                'type' => fake()->randomElement(['virtual', 'physical', 'both']),
            ],
            [
                'start_time' => '15:00:00',
                'end_time' => '17:00:00',
                'type' => fake()->randomElement(['virtual', 'physical', 'both']),
            ],
        ];

        // Select 2-3 time slots for this day
        $selectedSlots = fake()->randomElements($timeSlots, fake()->numberBetween(2, 3));

        CellScheduleTemplate::firstOrCreate([
            'cell_id' => $cell->id,
            'day_of_week' => $dayOfWeek,
        ], [
            'virtual_available' => collect($selectedSlots)->contains(function ($slot) {
                return in_array($slot['type'], ['virtual', 'both']);
            }),
            'physical_available' => collect($selectedSlots)->contains(function ($slot) {
                return in_array($slot['type'], ['physical', 'both']);
            }),
            'time_slots' => $selectedSlots,
        ]);
    }
}
