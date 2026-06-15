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
        // Define all roles in order (consolidated from 8 to 5 roles)
        $roles = [
            ['slug' => 'national', 'name' => 'National Office'],
            ['slug' => 'regional_supervisor', 'name' => 'Regional Supervisor'],
            ['slug' => 'jail_warden', 'name' => 'Jail Warden'],
            ['slug' => 'jail_officer', 'name' => 'Jail Officer'],
            ['slug' => 'visitor', 'name' => 'Visitor'],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['slug' => $roleData['slug']],
                ['name' => $roleData['name']]
            );
        }
    }
}
