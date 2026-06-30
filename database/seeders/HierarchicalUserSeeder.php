<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class HierarchicalUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get roles
        $nationalRole = Role::where('slug', 'national')->first();
        $jailWardenRole = Role::where('slug', 'jail_warden')->first();
        $jailOfficerRole = Role::where('slug', 'jail_officer')->first();

        if (!$nationalRole || !$jailWardenRole || !$jailOfficerRole) {
            $this->command->error('Roles not found. Please run RoleSeeder first.');
            return;
        }

        // Create National Office user
        $this->createNationalOfficeUser($nationalRole);

        // Get all active branches
        $branches = Branch::where('status', 'active')->get();

        if ($branches->isEmpty()) {
            $this->command->warn('No active branches found. Please run RegionBranchSeeder first.');
            return;
        }

        // Create Jail Warden, Super Admin and Jail Officers for each branch
        foreach ($branches as $branch) {
            $this->createBranchUsers($branch, $jailWardenRole, $jailOfficerRole);
        }

        $this->command->info('Hierarchical users seeded successfully.');
    }

    /**
     * Create a National Office user with unrestricted access.
     */
    private function createNationalOfficeUser($role): void
    {
        User::firstOrCreate(
            ['email' => 'national@edalaw.gov.ph'],
            [
                'email' => 'national@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'National',
                'last_name' => 'Administrator',
                'middle_name' => 'Office',
                'role_id' => $role->id,
                'branch_id' => null, // No branch restriction
                'contact_number' => '+63-2-8888-0000',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );

        $this->command->info('  Created National Office user: national@edalaw.gov.ph');
    }

    /**
     * Create Jail Warden, Super Admin and Jail Officers for a branch.
     */
    private function createBranchUsers($branch, $jailWardenRole, $jailOfficerRole): void
    {
        // Create Jail Warden for this branch (head of facility)
        $warden = User::firstOrCreate(
            ['email' => "warden.{$branch->code}@edalaw.gov.ph"],
            [
                'email' => "warden.{$branch->code}@edalaw.gov.ph",
                'password' => Hash::make('password'),
                'first_name' => Str::title(fake()->firstName()),
                'last_name' => Str::title(fake()->lastName()),
                'middle_name' => Str::title(fake()->firstName()),
                'role_id' => $jailWardenRole->id,
                'branch_id' => $branch->id, // Assigned to specific branch
                'contact_number' => fake()->phoneNumber(),
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );

        $this->command->info("  Created Jail Warden for {$branch->name}: {$warden->email}");

        // Create Super Admin for this branch
        $superAdmin = User::firstOrCreate(
            ['email' => "superadmin.{$branch->code}@edalaw.gov.ph"],
            [
                'email' => "superadmin.{$branch->code}@edalaw.gov.ph",
                'password' => Hash::make('password'),
                'first_name' => Str::title(fake()->firstName()),
                'last_name' => Str::title(fake()->lastName()),
                'middle_name' => Str::title(fake()->firstName()),
                'role_id' => $jailWardenRole->id,
                'branch_id' => $branch->id, // Assigned to specific branch
                'contact_number' => fake()->phoneNumber(),
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );

        $this->command->info("  Created Super Admin for {$branch->name}: {$superAdmin->email}");

        // Create 2-4 Jail Officers for this branch
        $officersCount = rand(2, 4);
        
        for ($i = 1; $i <= $officersCount; $i++) {
            $officer = User::firstOrCreate(
                ['email' => "officer{$i}.{$branch->code}@edalaw.gov.ph"],
                [
                    'email' => "officer{$i}.{$branch->code}@edalaw.gov.ph",
                    'password' => Hash::make('password'),
                    'first_name' => Str::title(fake()->firstName()),
                    'last_name' => Str::title(fake()->lastName()),
                    'middle_name' => Str::title(fake()->firstName()),
                    'role_id' => $jailOfficerRole->id,
                    'branch_id' => $branch->id, // Assigned to same branch
                    'contact_number' => fake()->phoneNumber(),
                    'approval_status' => 'approved',
                    'status' => 'active',
                    'email_verified_at' => now(),
                    'consent_accepted' => true,
                    'consent_timestamp' => now(),
                ]
            );

            if ($i === 1) {
                $this->command->info("  Created Jail Officer for {$branch->name}: {$officer->email}");
            }
        }
    }
}
