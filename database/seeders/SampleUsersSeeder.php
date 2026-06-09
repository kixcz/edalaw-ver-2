<?php

namespace Database\Seeders;

use App\ApprovalStatus;
use App\Models\Annex;
use App\Models\Branch;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\Jail;
use App\Models\JailOfficerScope;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🌱 Seeding minimal sample data...');

        // Get or create roles
        $nationalRole = Role::firstOrCreate(['slug' => 'national'], ['name' => 'National Office']);
        $regionalRole = Role::firstOrCreate(['slug' => 'regional_supervisor'], ['name' => 'Regional Supervisor']);
        $jailWardenRole = Role::firstOrCreate(['slug' => 'jail_warden'], ['name' => 'Jail Warden']);
        $jailOfficerRole = Role::firstOrCreate(['slug' => 'jail_officer'], ['name' => 'Jail Officer']);
        $visitorRole = Role::firstOrCreate(['slug' => 'visitor'], ['name' => 'Visitor']);

        $password = Hash::make('asdf1234');
        $phone = '09676979568';

        // ==========================================
        // 1. Create Region & Branch
        // ==========================================
        $this->command->info('📍 Creating region and branch...');
        
        $region = Region::firstOrCreate(
            ['code' => 'NCR'],
            [
                'name' => 'National Capital Region',
                'description' => 'Metro Manila',
                'status' => 'active',
            ]
        );

        $branch = Branch::firstOrCreate(
            ['code' => 'MNL-001'],
            [
                'region_id' => $region->id,
                'name' => 'Manila Main Branch',
                'description' => 'Manila Regional Office',
                'status' => 'active',
            ]
        );

        // ==========================================
        // 2. Create Jail Facility Hierarchy
        // ==========================================
        $this->command->info('🏢 Creating jail facilities...');

        // Jail
        $jail = Jail::firstOrCreate(
            ['name' => 'Manila City Jail'],
            [
                'branch_id' => $branch->id,
                'name' => 'Manila City Jail',
                'code' => 'JAIL-MNL-001',
                'description' => 'Main jail facility in Manila',
                'status' => 'active',
            ]
        );

        // Dormitory
        $dormitory = Dormitory::firstOrCreate(
            ['name' => 'Male Dormitory A'],
            [
                'jail_id' => $jail->id,
                'name' => 'Male Dormitory A',
                'type' => 'male',
                'description' => 'Main male dormitory',
                'status' => 'active',
            ]
        );

        // Annex
        $annex = Annex::firstOrCreate(
            ['name' => 'Building 1'],
            [
                'dormitory_id' => $dormitory->id,
                'name' => 'Building 1',
                'description' => 'First building of male dormitory',
                'status' => 'active',
            ]
        );

        // Cell
        $cell = Cell::firstOrCreate(
            ['cell_number' => 'Cell-101'],
            [
                'annex_id' => $annex->id,
                'dormitory_id' => $dormitory->id,
                'cell_number' => 'Cell-101',
                'capacity' => 10,
                'status' => 'active',
            ]
        );

        $this->command->info("✅ Created: Branch → Jail → Dormitory → Annex → Cell");

        // ==========================================
        // 3. Create 5 PDLs (Inmates)
        // ==========================================
        $this->command->info('👤 Creating 5 PDLs...');

        $pdlData = [
            ['first_name' => 'Juan', 'middle_name' => 'Dela', 'last_name' => 'Cruz', 'inmate_number' => 'PDL-001', 'dob' => '1990-01-15'],
            ['first_name' => 'Maria', 'middle_name' => 'Santos', 'last_name' => 'Reyes', 'inmate_number' => 'PDL-002', 'dob' => '1985-03-22'],
            ['first_name' => 'Pedro', 'middle_name' => 'Garcia', 'last_name' => 'Lopez', 'inmate_number' => 'PDL-003', 'dob' => '1992-07-10'],
            ['first_name' => 'Ana', 'middle_name' => 'Rose', 'last_name' => 'Torres', 'inmate_number' => 'PDL-004', 'dob' => '1988-11-05'],
            ['first_name' => 'Roberto', 'middle_name' => 'Mae', 'last_name' => 'Fernandez', 'inmate_number' => 'PDL-005', 'dob' => '1995-09-18'],
        ];

        foreach ($pdlData as $pdl) {
            Inmate::firstOrCreate(
                ['inmate_number' => $pdl['inmate_number']],
                [
                    'cell_id' => $cell->id,
                    'first_name' => $pdl['first_name'],
                    'middle_name' => $pdl['middle_name'],
                    'last_name' => $pdl['last_name'],
                    'inmate_number' => $pdl['inmate_number'],
                    'date_of_birth' => $pdl['dob'],
                    'status' => 'active',
                ]
            );
        }

        $this->command->info("✅ Created 5 PDLs in Cell-101");

        // ==========================================
        // 4. Create User Accounts
        // ==========================================
        $this->command->info('👥 Creating user accounts...');

        // National Office Account
        $nationalUser = User::updateOrCreate(
            ['email' => 'national@edalaw.gov.ph'],
            [
                'first_name' => 'National',
                'middle_name' => null,
                'last_name' => 'Supervisor',
                'email' => 'national@edalaw.gov.ph',
                'phone_number' => $phone,
                'password' => $password,
                'dob' => '1980-01-01',
                'gender' => 'male',
                'street' => '123 National Highway',
                'brgy' => 'Central',
                'municipality' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'role_id' => $nationalRole->id,
                'approval_status' => ApprovalStatus::Approved,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info("  ✓ National: national@edalaw.gov.ph");

        // Regional Supervisor Account
        $regionalUser = User::updateOrCreate(
            ['email' => 'regional@edalaw.gov.ph'],
            [
                'first_name' => 'Regional',
                'middle_name' => null,
                'last_name' => 'Supervisor',
                'email' => 'regional@edalaw.gov.ph',
                'phone_number' => $phone,
                'password' => $password,
                'dob' => '1982-05-10',
                'gender' => 'female',
                'street' => '456 Regional Road',
                'brgy' => 'Zone 1',
                'municipality' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'role_id' => $regionalRole->id,
                'region_id' => $region->id,
                'approval_status' => ApprovalStatus::Approved,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info("  ✓ Regional: regional@edalaw.gov.ph");

        // Jail Warden Account
        $jailWardenUser = User::updateOrCreate(
            ['email' => 'warden@edalaw.gov.ph'],
            [
                'first_name' => 'Jail',
                'middle_name' => null,
                'last_name' => 'Warden',
                'email' => 'warden@edalaw.gov.ph',
                'phone_number' => $phone,
                'password' => $password,
                'dob' => '1978-08-20',
                'gender' => 'male',
                'street' => '789 Jail Road',
                'brgy' => 'Central',
                'municipality' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'role_id' => $jailWardenRole->id,
                'branch_id' => $branch->id,
                'approval_status' => ApprovalStatus::Approved,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info("  ✓ Jail Warden: warden@edalaw.gov.ph");

        // Jail Officer Account
        $jailOfficerUser = User::updateOrCreate(
            ['email' => 'officer@edalaw.gov.ph'],
            [
                'first_name' => 'Jail',
                'middle_name' => null,
                'last_name' => 'Officer',
                'email' => 'officer@edalaw.gov.ph',
                'phone_number' => $phone,
                'password' => $password,
                'dob' => '1990-03-15',
                'gender' => 'female',
                'street' => '321 Officer Lane',
                'brgy' => 'Zone 2',
                'municipality' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'role_id' => $jailOfficerRole->id,
                'branch_id' => $branch->id,
                'approval_status' => ApprovalStatus::Approved,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info("  ✓ Jail Officer: officer@edalaw.gov.ph");

        // Assign Jail Officer scope to the cell
        JailOfficerScope::firstOrCreate(
            [
                'jail_officer_id' => $jailOfficerUser->id,
                'scope_type' => 'cell',
                'cell_id' => $cell->id,
                'is_active' => true,
            ],
            [
                'annex_id' => null,
                'dormitory_id' => null,
                'assigned_by' => $jailWardenUser->id,
            ]
        );
        $this->command->info("  ✓ Assigned officer scope to Cell-101");

        // Visitor Account
        $visitorUser = User::updateOrCreate(
            ['email' => 'visitor@edalaw.gov.ph'],
            [
                'first_name' => 'Test',
                'middle_name' => null,
                'last_name' => 'Visitor',
                'email' => 'visitor@edalaw.gov.ph',
                'phone_number' => $phone,
                'password' => $password,
                'dob' => '1995-12-01',
                'gender' => 'male',
                'street' => '555 Visitor Street',
                'brgy' => 'Zone 3',
                'municipality' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'role_id' => $visitorRole->id,
                'approval_status' => ApprovalStatus::Approved,
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $this->command->info("  ✓ Visitor: visitor@edalaw.gov.ph");

        // ==========================================
        // 5. Summary
        // ==========================================
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════');
        $this->command->info('✅ Seeding Complete!');
        $this->command->info('═══════════════════════════════════════════');
        $this->command->info('📋 Facility Structure:');
        $this->command->info("   Region: {$region->name}");
        $this->command->info("   Branch: {$branch->name}");
        $this->command->info("   Jail: {$jail->name}");
        $this->command->info("   Dormitory: {$dormitory->name}");
        $this->command->info("   Annex: {$annex->name}");
        $this->command->info("   Cell: {$cell->cell_number} (Capacity: {$cell->capacity})");
        $this->command->info("   PDLs: 5 inmates assigned to Cell-101");
        $this->command->info('');
        $this->command->info('👥 User Accounts (All passwords: asdf1234):');
        $this->command->info("   National:     national@edalaw.gov.ph");
        $this->command->info("   Regional:     regional@edalaw.gov.ph");
        $this->command->info("   Jail Warden:  warden@edalaw.gov.ph");
        $this->command->info("   Jail Officer: officer@edalaw.gov.ph");
        $this->command->info("   Visitor:      visitor@edalaw.gov.ph");
        $this->command->info('═══════════════════════════════════════════');
    }
}
