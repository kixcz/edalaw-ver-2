<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Implements hierarchy: Branch → Annex → Dormitory → Cell → PDL
     */
    public function up(): void
    {
        // Step 1: Remove dormitory_id from annexes table (if it exists)
        if (Schema::hasColumn('annexes', 'dormitory_id')) {
            // Try to drop foreign key if it exists
            $fks = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'annexes'
                AND COLUMN_NAME = 'dormitory_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            if (!empty($fks)) {
                DB::statement('ALTER TABLE annexes DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
            }
            
            try {
                Schema::table('annexes', function (Blueprint $table) {
                    $table->dropColumn('dormitory_id');
                });
            } catch (\Exception $e) {
                // Column might already be removed
            }
        }

        // Step 2: Add annex_id to dormitories table (Dormitory belongs to Annex)
        if (!Schema::hasColumn('dormitories', 'annex_id')) {
            Schema::table('dormitories', function (Blueprint $table) {
                $table->foreignId('annex_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
        
        // Remove jail_id from dormitories
        if (Schema::hasColumn('dormitories', 'jail_id')) {
            $fks = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'dormitories'
                AND COLUMN_NAME = 'jail_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            if (!empty($fks)) {
                DB::statement('ALTER TABLE dormitories DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
            }
            
            try {
                Schema::table('dormitories', function (Blueprint $table) {
                    $table->dropColumn('jail_id');
                });
            } catch (\Exception $e) {
                // Column might already be removed
            }
        }

        // Step 3: Add dormitory_id to cells table (Cell belongs to Dormitory)
        if (!Schema::hasColumn('cells', 'dormitory_id')) {
            Schema::table('cells', function (Blueprint $table) {
                $table->foreignId('dormitory_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
        
        // Remove annex_id from cells
        if (Schema::hasColumn('cells', 'annex_id')) {
            $fks = DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'cells'
                AND COLUMN_NAME = 'annex_id'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            
            if (!empty($fks)) {
                DB::statement('ALTER TABLE cells DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
            }
            
            try {
                Schema::table('cells', function (Blueprint $table) {
                    $table->dropColumn('annex_id');
                });
            } catch (\Exception $e) {
                // Column might already be removed
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert Step 3: Remove dormitory_id, add back annex_id in cells
        Schema::table('cells', function (Blueprint $table) {
            $table->dropForeign(['dormitory_id']);
            $table->dropColumn('dormitory_id');
            $table->foreignId('annex_id')->after('id')->constrained()->cascadeOnDelete();
        });

        // Revert Step 2: Remove annex_id, add back jail_id in dormitories
        Schema::table('dormitories', function (Blueprint $table) {
            $table->dropForeign(['annex_id']);
            $table->dropColumn('annex_id');
            $table->foreignId('jail_id')->after('id')->constrained()->cascadeOnDelete();
        });

        // Revert Step 1: Add back dormitory_id in annexes
        Schema::table('annexes', function (Blueprint $table) {
            $table->foreignId('dormitory_id')->after('id')->constrained()->cascadeOnDelete();
        });
    }
};
