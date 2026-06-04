<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\Inmate;
use Illuminate\Database\Seeder;

class InmatePdlSeeder extends Seeder
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

        $this->command->info('Seeding inmates/PDLs...');
        
        $totalInmates = 0;
        
        foreach ($cells as $cell) {
            // Create 2-6 inmates per cell
            $inmatesCount = rand(2, 6);
            
            for ($i = 0; $i < $inmatesCount; $i++) {
                $this->createInmate($cell);
                $totalInmates++;
            }
        }

        $this->command->info("  Created {$totalInmates} inmates/PDLs successfully.");
    }

    /**
     * Create a realistic inmate/PDL record.
     */
    private function createInmate($cell): void
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();
        $middleName = fake()->optional(0.7)->lastName();
        
        // Generate unique inmate number using uniqid
        $inmateNumber = "PDL-" . strtoupper(substr(md5(uniqid()), 0, 10));

        $status = fake()->randomElement(['active', 'inactive', 'released']);

        Inmate::create([
            'first_name' => $firstName,
            'middle_name' => $middleName,
            'last_name' => $lastName,
            'inmate_number' => $inmateNumber,
            'cell_id' => $cell->id,
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-18 years'),
            'status' => $status,
        ]);
    }
}
