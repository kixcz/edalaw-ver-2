<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define all roles in order
        $roles = [
            ['slug' => 'national', 'name' => 'National Office'],
            ['slug' => 'regional_supervisor', 'name' => 'Regional Supervisor'],
            ['slug' => 'super_admin', 'name' => 'Super Admin'],
            ['slug' => 'jail_warden', 'name' => 'Jail Warden'],
            ['slug' => 'jail_officer', 'name' => 'Jail Officer'],
            ['slug' => 'bjmp_officer', 'name' => 'BJMP Officer'],
            ['slug' => 'visitor', 'name' => 'Visitor'],
            ['slug' => 'monitoring_officer', 'name' => 'Monitoring Officer'],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['slug' => $roleData['slug']],
                ['name' => $roleData['name']]
            );
        }
    }
}
