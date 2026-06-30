<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration consolidates RBAC roles:
     * - super_admin → jail_warden (must have branch_id)
     * - bjmp_officer → jail_officer
     * - monitoring_officer → jail_officer
     */
    public function up(): void
    {
        // Ensure target roles exist
        DB::table('roles')->updateOrInsert(
            ['slug' => 'jail_warden'],
            ['name' => 'Jail Warden', 'created_at' => now(), 'updated_at' => now()]
        );
        DB::table('roles')->updateOrInsert(
            ['slug' => 'jail_officer'],
            ['name' => 'Jail Officer', 'created_at' => now(), 'updated_at' => now()]
        );

        // Get role IDs
        $superAdminRole = DB::table('roles')->where('slug', 'super_admin')->first();
        $jailWardenRole = DB::table('roles')->where('slug', 'jail_warden')->first();
        $bjmpOfficerRole = DB::table('roles')->where('slug', 'bjmp_officer')->first();
        $monitoringOfficerRole = DB::table('roles')->where('slug', 'monitoring_officer')->first();
        $jailOfficerRole = DB::table('roles')->where('slug', 'jail_officer')->first();

        // Merge super_admin users into jail_warden
        if ($superAdminRole && $jailWardenRole) {
            DB::table('users')
                ->where('role_id', $superAdminRole->id)
                ->update(['role_id' => $jailWardenRole->id]);
            
            echo "Migrated super_admin users to jail_warden\n";
        }

        // Merge bjmp_officer users into jail_officer
        if ($bjmpOfficerRole && $jailOfficerRole) {
            DB::table('users')
                ->where('role_id', $bjmpOfficerRole->id)
                ->update(['role_id' => $jailOfficerRole->id]);
            
            echo "Migrated bjmp_officer users to jail_officer\n";
        }

        // Merge monitoring_officer users into jail_officer
        if ($monitoringOfficerRole && $jailOfficerRole) {
            DB::table('users')
                ->where('role_id', $monitoringOfficerRole->id)
                ->update(['role_id' => $jailOfficerRole->id]);
            
            echo "Migrated monitoring_officer users to jail_officer\n";
        }

        // Remove old roles from roles table
        DB::table('roles')->whereIn('slug', ['super_admin', 'bjmp_officer', 'monitoring_officer'])->delete();
        
        echo "Removed super_admin, bjmp_officer, and monitoring_officer roles\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-create the old roles
        DB::table('roles')->insert([
            ['slug' => 'super_admin', 'name' => 'Super Admin', 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'bjmp_officer', 'name' => 'BJMP Officer', 'created_at' => now(), 'updated_at' => now()],
            ['slug' => 'monitoring_officer', 'name' => 'Monitoring Officer', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Note: We cannot automatically revert user role assignments
        // as we don't know which users were originally which role
        echo "Roles re-created. User role assignments must be manually reverted.\n";
    }
};
