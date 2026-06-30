<?php

namespace Database\Seeders;

use App\Models\Annex;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\JailOfficerScope;
use App\Models\User;
use Illuminate\Database\Seeder;

class JailOfficerScopeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding Jail Officer scopes...');

        // Get all active jail officers
        $jailOfficers = User::whereHas('role', function ($query) {
            $query->where('slug', 'jail_officer');
        })->get();

        if ($jailOfficers->isEmpty()) {
            $this->command->warn('No jail officers found.');
            return;
        }

        $wardenRole = \App\Models\Role::where('slug', 'jail_warden')->first();
        
        foreach ($jailOfficers as $officer) {
            // Skip if already has scopes
            if ($officer->assignedScopes()->active()->exists()) {
                continue;
            }

            // Find a warden from the same branch to be the assigner
            $warden = User::where('branch_id', $officer->branch_id)
                ->where('role_id', $wardenRole?->id)
                ->first();

            if (!$warden) {
                continue;
            }

            // Assign random scope (annex, dormitory, or cell level)
            $scopeType = collect(['annex', 'dormitory', 'cell'])->random();

            match($scopeType) {
                'annex' => $this->assignAnnexScope($officer, $warden),
                'dormitory' => $this->assignDormitoryScope($officer, $warden),
                'cell' => $this->assignCellScope($officer, $warden),
            };
        }

        $totalScopes = JailOfficerScope::count();
        $this->command->info("  Created {$totalScopes} jail officer scope assignments.");
    }

    /**
     * Assign annex-level scope to an officer.
     */
    private function assignAnnexScope($officer, $warden): void
    {
        $annexes = Annex::whereHas('jail', function ($query) use ($officer) {
            $query->where('branch_id', $officer->branch_id);
        })->get();

        if ($annexes->isEmpty()) {
            return;
        }

        $annex = $annexes->random();

        JailOfficerScope::create([
            'jail_officer_id' => $officer->id,
            'assigned_by' => $warden->id,
            'scope_type' => 'building',
            'building_id' => $annex->id,
            'is_active' => true,
        ]);
    }

    /**
     * Assign dormitory-level scope to an officer.
     */
    private function assignDormitoryScope($officer, $warden): void
    {
        $dormitories = Dormitory::whereHas('annex.jail', function ($query) use ($officer) {
            $query->where('branch_id', $officer->branch_id);
        })->get();

        if ($dormitories->isEmpty()) {
            return;
        }

        $dormitory = $dormitories->random();

        JailOfficerScope::create([
            'jail_officer_id' => $officer->id,
            'assigned_by' => $warden->id,
            'scope_type' => 'dormitory',
            'dormitory_id' => $dormitory->id,
            'is_active' => true,
        ]);
    }

    /**
     * Assign cell-level scope to an officer.
     */
    private function assignCellScope($officer, $warden): void
    {
        $cells = Cell::whereHas('dormitory.annex.jail', function ($query) use ($officer) {
            $query->where('branch_id', $officer->branch_id);
        })->get();

        if ($cells->isEmpty()) {
            return;
        }

        $cell = $cells->random();

        JailOfficerScope::create([
            'jail_officer_id' => $officer->id,
            'assigned_by' => $warden->id,
            'scope_type' => 'cell',
            'cell_id' => $cell->id,
            'is_active' => true,
        ]);
    }
}
