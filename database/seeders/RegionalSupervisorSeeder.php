<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Region;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RegionalSupervisorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $regions = Region::all();
        
        if ($regions->isEmpty()) {
            $this->command->error('No regions found. Please run RegionSeeder first.');
            return;
        }

        $supervisors = [
            [
                'region_name' => 'National Capital Region (NCR)',
                'first_name' => 'Maria',
                'middle_name' => 'Santos',
                'last_name' => 'Reyes',
                'email' => 'regional.ncr@edalaw.gov.ph',
            ],
            [
                'region_name' => 'Region I',
                'first_name' => 'Juan',
                'middle_name' => 'Bautista',
                'last_name' => 'Cruz',
                'email' => 'regional.region1@edalaw.gov.ph',
            ],
            [
                'region_name' => 'Region III',
                'first_name' => 'Elena',
                'middle_name' => 'Garcia',
                'last_name' => 'Lopez',
                'email' => 'regional.region3@edalaw.gov.ph',
            ],
            [
                'region_name' => 'Region VII',
                'first_name' => 'Roberto',
                'middle_name' => 'Dela Cruz',
                'last_name' => 'Fernandez',
                'email' => 'regional.region7@edalaw.gov.ph',
            ],
        ];

        foreach ($supervisors as $supervisorData) {
            $region = Region::where('name', $supervisorData['region_name'])->first();
            
            if (!$region) {
                $this->command->warn("Region '{$supervisorData['region_name']}' not found. Skipping...");
                continue;
            }

            User::firstOrCreate(
                ['email' => $supervisorData['email']],
                [
                    'region_id' => $region->id,
                    'role_id' => \App\Models\Role::where('slug', 'regional_supervisor')->value('id'),
                    'first_name' => $supervisorData['first_name'],
                    'middle_name' => $supervisorData['middle_name'] ?? null,
                    'last_name' => $supervisorData['last_name'],
                    'password' => Hash::make('password'),
                    'phone_number' => null,
                    'status' => 'active',
                    'approval_status' => 'approved',
                ]
            );
            $this->command->info("Created Regional Supervisor for {$supervisorData['region_name']}: {$supervisorData['email']}");
        }

        $genericRegion = $regions->first();
        User::firstOrCreate(
            ['email' => 'regional@edalaw.gov.ph'],
            [
                'region_id' => $genericRegion->id,
                'role_id' => \App\Models\Role::where('slug', 'regional_supervisor')->value('id'),
                'first_name' => 'Regional',
                'middle_name' => '',
                'last_name' => 'Supervisor',
                'password' => Hash::make('password'),
                'phone_number' => null,
                'status' => 'active',
                'approval_status' => 'approved',
            ]
        );

        $this->command->info("Created generic Regional Supervisor account: regional@edalaw.gov.ph");
    }
}
