<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Region;
use Illuminate\Database\Seeder;

class RegionBranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define regions with their branches
        $regionsData = [
            [
                'name' => 'Region I',
                'code' => 'R01',
                'description' => 'Ilocos Region',
                'branches' => [
                    ['name' => 'Laoag Branch', 'code' => 'LAO-001', 'description' => 'Laoag City Branch Office'],
                    ['name' => 'Vigan Branch', 'code' => 'VIG-001', 'description' => 'Vigan City Branch Office'],
                    ['name' => 'San Fernando Branch', 'code' => 'SF-001', 'description' => 'San Fernando Branch Office'],
                ]
            ],
            [
                'name' => 'National Capital Region (NCR)',
                'code' => 'NCR',
                'description' => 'Metro Manila',
                'branches' => [
                    ['name' => 'Manila Main Branch', 'code' => 'MNL-001', 'description' => 'Manila Regional Office'],
                    ['name' => 'Quezon City Branch', 'code' => 'QC-001', 'description' => 'Quezon City Branch Office'],
                    ['name' => 'Makati Branch', 'code' => 'MKT-001', 'description' => 'Makati Branch Office'],
                    ['name' => 'Pasig Branch', 'code' => 'PSG-001', 'description' => 'Pasig Branch Office'],
                ]
            ],
            [
                'name' => 'Region VII',
                'code' => 'R07',
                'description' => 'Central Visayas',
                'branches' => [
                    ['name' => 'Cebu Branch', 'code' => 'CEB-001', 'description' => 'Cebu Regional Office'],
                    ['name' => 'Bohol Branch', 'code' => 'BOH-001', 'description' => 'Bohol Branch Office'],
                    ['name' => 'Negros Oriental Branch', 'code' => 'NE-001', 'description' => 'Negros Oriental Branch Office'],
                ]
            ],
            [
                'name' => 'Region III',
                'code' => 'R03',
                'description' => 'Central Luzon',
                'branches' => [
                    ['name' => 'Angeles Branch', 'code' => 'ANG-001', 'description' => 'Angeles City Branch Office'],
                    ['name' => 'San Fernando Pampanga Branch', 'code' => 'SFP-001', 'description' => 'San Fernando, Pampanga Branch Office'],
                    ['name' => 'Tarlac Branch', 'code' => 'TRL-001', 'description' => 'Tarlac Branch Office'],
                ]
            ],
        ];

        foreach ($regionsData as $regionData) {
            // Create or get region
            $region = Region::firstOrCreate(
                ['code' => $regionData['code']],
                [
                    'name' => $regionData['name'],
                    'description' => $regionData['description'],
                    'status' => 'active',
                ]
            );

            // Create branches for this region
            foreach ($regionData['branches'] as $branchData) {
                Branch::firstOrCreate(
                    ['code' => $branchData['code']],
                    [
                        'region_id' => $region->id,
                        'name' => $branchData['name'],
                        'description' => $branchData['description'],
                        'status' => 'active',
                    ]
                );
            }
        }

        $this->command->info('Regions and branches seeded successfully.');
    }
}
