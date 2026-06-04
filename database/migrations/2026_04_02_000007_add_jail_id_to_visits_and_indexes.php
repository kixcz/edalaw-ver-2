<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add jail_id to visits table for ownership tracking
        if (!Schema::hasColumn('visits', 'jail_id')) {
            Schema::table('visits', function (Blueprint $table) {
                $table->foreignId('jail_id')->after('id')->nullable()->constrained()->onDelete('set null');
                $table->index('jail_id');
            });
        }

        // Add indexes to existing foreign keys for performance
        if (Schema::hasColumn('inmates', 'cell_id')) {
            // Check if index already exists before adding
            try {
                Schema::table('inmates', function (Blueprint $table) {
                    $table->index('cell_id');
                });
            } catch (\Exception $e) {
                // Ignore duplicate index errors
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('visits', 'jail_id')) {
            Schema::table('visits', function (Blueprint $table) {
                $table->dropForeign(['jail_id']);
                $table->dropIndex('jail_id');
                $table->dropColumn('jail_id');
            });
        }

        try {
            Schema::table('inmates', function (Blueprint $table) {
                $table->dropIndex(['cell_id']);
            });
        } catch (\Exception $e) {
            // Ignore if index doesn't exist
        }
    }


};
