<?php

namespace Database\Seeders;

use App\Models\Annex;
use App\Models\Branch;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Jail;
use Illuminate\Database\Seeder;

class JailFacilitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = Branch::where('status', 'active')->get();

        if ($branches->isEmpty()) {
            $this->command->warn('No active branches found. Please run RegionBranchSeeder first.');
            return;
        }

        foreach ($branches as $branch) {
            $this->createJailsForBranch($branch);
        }

        $this->command->info('Jails and facilities seeded successfully.');
    }

    /**
     * Create jails and related facilities for a branch.
     */
    private function createJailsForBranch($branch): void
    {
        // Create 2-3 jails per branch
        $jailsCount = rand(2, 3);
        
        for ($i = 1; $i <= $jailsCount; $i++) {
            $jail = Jail::firstOrCreate(
                ['code' => "{$branch->code}-JAIL-{$i}"],
                [
                    'branch_id' => $branch->id,
                    'name' => "{$branch->name} Jail #{$i}",
                    'location' => fake()->address(),
                    'description' => "Jail facility #{$i} under {$branch->name}",
                    'status' => 'active',
                ]
            );

            $this->createDormitoriesForJail($jail);
            
            $this->command->info("  Created jail: {$jail->name}");
        }
    }

    /**
     * Create dormitories for a jail.
     */
    private function createDormitoriesForJail($jail): void
    {
        $dormitoryTypes = ['male', 'female', 'juvenile', 'special'];
        
        foreach ($dormitoryTypes as $type) {
            $dormitory = Dormitory::firstOrCreate(
                ['jail_id' => $jail->id, 'name' => "{$jail->name} - {$type} Dormitory"],
                [
                    'jail_id' => $jail->id,
                    'name' => "{$jail->name} - {$type} Dormitory",
                    'type' => $type,
                    'description' => "{$type} dormitory at {$jail->name}",
                    'status' => 'active',
                ]
            );

            $this->createAnnexesForDormitory($dormitory);
        }
    }

    /**
     * Create annexes for a dormitory.
     */
    private function createAnnexesForDormitory($dormitory): void
    {
        // Create 2-3 annexes per dormitory
        $annexesCount = rand(2, 3);
        
        for ($i = 1; $i <= $annexesCount; $i++) {
            $annex = Annex::firstOrCreate(
                ['dormitory_id' => $dormitory->id, 'name' => "{$dormitory->name} - Building {$i}"],
                [
                    'dormitory_id' => $dormitory->id,
                    'name' => "{$dormitory->name} - Building {$i}",
                    'description' => "Building {$i} of {$dormitory->name}",
                    'status' => 'active',
                ]
            );

            $this->createCellsForAnnex($annex);
        }
    }

    /**
     * Create cells for an annex.
     */
    private function createCellsForAnnex($annex): void
    {
        // Create 4-8 cells per annex
        $cellsCount = rand(4, 8);
        
        for ($i = 1; $i <= $cellsCount; $i++) {
            Cell::firstOrCreate(
                ['annex_id' => $annex->id, 'cell_number' => "{$annex->name}-Cell-{$i}"],
                [
                    'annex_id' => $annex->id,
                    'cell_number' => "{$annex->name}-Cell-{$i}",
                    'capacity' => rand(4, 12),
                    'status' => 'active',
                ]
            );
        }
    }
}
