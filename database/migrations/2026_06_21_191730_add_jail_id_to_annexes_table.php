<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Restores proper hierarchy: Branch → Jail → Annex → Dormitory → Cell
     */
    public function up(): void
    {
        Schema::table('annexes', function (Blueprint $table) {
            if (!Schema::hasColumn('annexes', 'jail_id')) {
                $table->foreignId('jail_id')->nullable()->after('id')->constrained()->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('annexes', function (Blueprint $table) {
            if (Schema::hasColumn('annexes', 'jail_id')) {
                // Drop foreign key first
                $fks = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'annexes'
                    AND COLUMN_NAME = 'jail_id'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ");
                
                if (!empty($fks)) {
                    DB::statement('ALTER TABLE annexes DROP FOREIGN KEY ' . $fks[0]->CONSTRAINT_NAME);
                }
                
                $table->dropForeign(['jail_id']);
                $table->dropColumn('jail_id');
            }
        });
    }
};
