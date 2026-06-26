<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MinimalUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates minimal test accounts: 1 national, 1 regional, 1 warden, 2 officers
     */
    public function run(): void
    {
        // Get roles
        $nationalRole = Role::where('slug', 'national')->first();
        $regionalRole = Role::where('slug', 'regional_supervisor')->first();
        $jailWardenRole = Role::where('slug', 'jail_warden')->first();
        $jailOfficerRole = Role::where('slug', 'jail_officer')->first();

        if (!$nationalRole || !$regionalRole || !$jailWardenRole || !$jailOfficerRole) {
            $this->command->error('Roles not found. Please run RoleSeeder first.');
            return;
        }

        // Get first active branch for warden and officers
        $branch = Branch::where('status', 'active')->first();
        if (!$branch) {
            $this->command->error('No active branches found. Please run RegionBranchSeeder first.');
            return;
        }

        // 1. National Account
        $national = User::firstOrCreate(
            ['email' => 'national@edalaw.gov.ph'],
            [
                'email' => 'national@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'National',
                'last_name' => 'Administrator',
                'middle_name' => '',
                'role_id' => $nationalRole->id,
                'branch_id' => null,
                'contact_number' => '+63-2-8888-0000',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );
        $this->command->info("✓ National Account: national@edalaw.gov.ph (password: password)");

        // 2. Regional Supervisor
        $regional = User::firstOrCreate(
            ['email' => 'regional@edalaw.gov.ph'],
            [
                'email' => 'regional@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'Regional',
                'last_name' => 'Supervisor',
                'middle_name' => '',
                'role_id' => $regionalRole->id,
                'branch_id' => $branch->id,
                'contact_number' => '+63-2-8888-0001',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );
        $this->command->info("✓ Regional Supervisor: regional@edalaw.gov.ph (password: password)");

        // 3. Jail Warden
        $warden = User::firstOrCreate(
            ['email' => 'warden@edalaw.gov.ph'],
            [
                'email' => 'warden@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'John',
                'last_name' => 'Warden',
                'middle_name' => '',
                'role_id' => $jailWardenRole->id,
                'branch_id' => $branch->id,
                'contact_number' => '+63-2-8888-0002',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );
        $this->command->info("✓ Jail Warden: warden@edalaw.gov.ph (password: password)");

        // 4. Jail Officer #1
        $officer1 = User::firstOrCreate(
            ['email' => 'officer1@edalaw.gov.ph'],
            [
                'email' => 'officer1@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'Maria',
                'last_name' => 'Officer',
                'middle_name' => '',
                'role_id' => $jailOfficerRole->id,
                'branch_id' => $branch->id,
                'contact_number' => '+63-2-8888-0003',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );
        $this->command->info("✓ Jail Officer 1: officer1@edalaw.gov.ph (password: password)");

        // 5. Jail Officer #2
        $officer2 = User::firstOrCreate(
            ['email' => 'officer2@edalaw.gov.ph'],
            [
                'email' => 'officer2@edalaw.gov.ph',
                'password' => Hash::make('password'),
                'first_name' => 'Jose',
                'last_name' => 'Guard',
                'middle_name' => '',
                'role_id' => $jailOfficerRole->id,
                'branch_id' => $branch->id,
                'contact_number' => '+63-2-8888-0004',
                'approval_status' => 'approved',
                'status' => 'active',
                'email_verified_at' => now(),
                'consent_accepted' => true,
                'consent_timestamp' => now(),
            ]
        );
        $this->command->info("✓ Jail Officer 2: officer2@edalaw.gov.ph (password: password)");

        $this->command->info("\n✅ Minimal user seeding completed successfully!");
        $this->command->info("Branch: {$branch->name} (ID: {$branch->id})");
    }
}
