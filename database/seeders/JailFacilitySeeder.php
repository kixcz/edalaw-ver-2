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

        $this->command->info('Facilities seeded successfully (Branch → Jail → Annex → Dormitory → Cell).');
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

            $this->createAnnexesForJail($jail);
            
            $this->command->info("  Created jail: {$jail->name}");
        }
    }

    /**
     * Create annexes for a jail.
     */
    private function createAnnexesForJail($jail): void
    {
        // Create 2-3 annexes per jail
        $annexesCount = rand(2, 3);
        
        for ($i = 1; $i <= $annexesCount; $i++) {
            $annex = Annex::firstOrCreate(
                ['jail_id' => $jail->id, 'name' => "{$jail->name} - Annex {$i}"],
                [
                    'jail_id' => $jail->id,
                    'name' => "{$jail->name} - Annex {$i}",
                    'description' => "Annex facility #{$i} at {$jail->name}",
                    'status' => 'active',
                ]
            );

            $this->createDormitoriesForAnnex($annex);
        }
    }

    /**
     * Create dormitories for an annex.
     */
    private function createDormitoriesForAnnex($annex): void
    {
        $dormitoryTypes = ['male', 'female', 'juvenile', 'special'];
        
        foreach ($dormitoryTypes as $type) {
            $dormitory = Dormitory::firstOrCreate(
                ['annex_id' => $annex->id, 'name' => "{$annex->name} - {$type} Dormitory"],
                [
                    'annex_id' => $annex->id,
                    'name' => "{$annex->name} - {$type} Dormitory",
                    'type' => $type,
                    'description' => "{$type} dormitory at {$annex->name}",
                    'status' => 'active',
                ]
            );

            $this->createCellsForDormitory($dormitory);
        }
    }

    /**
     * Create cells for a dormitory.
     */
    private function createCellsForDormitory($dormitory): void
    {
        // Create 4-8 cells per dormitory
        $cellsCount = rand(4, 8);
        
        for ($i = 1; $i <= $cellsCount; $i++) {
            Cell::firstOrCreate(
                ['dormitory_id' => $dormitory->id, 'cell_number' => "{$dormitory->name}-Cell-{$i}"],
                [
                    'dormitory_id' => $dormitory->id,
                    'cell_number' => "{$dormitory->name}-Cell-{$i}",
                    'capacity' => rand(4, 12),
                    'status' => 'active',
                ]
            );
        }
    }
}
