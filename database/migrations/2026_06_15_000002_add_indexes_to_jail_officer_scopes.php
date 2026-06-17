<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add performance indexes to jail_officer_scopes table for efficient scope resolution.
     */
    public function up(): void
    {
        Schema::table('jail_officer_scopes', function (Blueprint $table) {
            // Composite index for scope resolution queries
            $table->index(['jail_officer_id', 'scope_type', 'is_active'], 'idx_scope_resolution');
            
            // Indexes for facility-specific lookups
            $table->index(['building_id', 'is_active'], 'idx_building_scope');
            $table->index(['dormitory_id', 'is_active'], 'idx_dormitory_scope');
            $table->index(['cell_id', 'is_active'], 'idx_cell_scope');
            
            // Index for warden queries (finding scopes by assigned_by)
            $table->index(['assigned_by', 'is_active'], 'idx_assigned_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jail_officer_scopes', function (Blueprint $table) {
            $table->dropIndex('idx_scope_resolution');
            $table->dropIndex('idx_building_scope');
            $table->dropIndex('idx_dormitory_scope');
            $table->dropIndex('idx_cell_scope');
            $table->dropIndex('idx_assigned_by');
        });
    }
};
