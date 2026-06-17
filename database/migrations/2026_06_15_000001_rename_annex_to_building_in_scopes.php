<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Rename annex_id to building_id in jail_officer_scopes table
     * and update scope_type from 'annex' to 'building'
     */
    public function up(): void
    {
        // First, update all scope_type values from 'annex' to 'building'
        DB::table('jail_officer_scopes')
            ->where('scope_type', 'annex')
            ->update(['scope_type' => 'building']);

        // Now rename the column
        Schema::table('jail_officer_scopes', function (Blueprint $table) {
            $table->renameColumn('annex_id', 'building_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert scope_type back to 'annex'
        DB::table('jail_officer_scopes')
            ->where('scope_type', 'building')
            ->update(['scope_type' => 'annex']);

        // Rename column back
        Schema::table('jail_officer_scopes', function (Blueprint $table) {
            $table->renameColumn('building_id', 'annex_id');
        });
    }
};
