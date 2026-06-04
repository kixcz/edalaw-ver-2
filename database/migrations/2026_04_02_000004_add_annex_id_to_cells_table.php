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
        // Check if column already exists
        if (!Schema::hasColumn('cells', 'annex_id')) {
            Schema::table('cells', function (Blueprint $table) {
                $table->foreignId('annex_id')->after('id')->nullable()->constrained()->onDelete('cascade');
                $table->index('annex_id');
            });
        }
        
        // Update existing cells to use the first available annex
        $hasAnnexes = DB::table('annexes')->exists();
        if ($hasAnnexes && Schema::hasColumn('cells', 'annex_id')) {
            DB::statement('
                UPDATE cells 
                SET annex_id = (SELECT id FROM annexes LIMIT 1)
                WHERE annex_id IS NULL
            ');
        }
        
        // Handle unique constraint - drop old and create composite
        try {
            Schema::table('cells', function (Blueprint $table) {
                $table->dropUnique(['cell_number']);
            });
        } catch (\Exception $e) {
            // Ignore if index doesn't exist
        }
        
        // Create composite unique index if it doesn't exist
        if (!Schema::hasIndex('cells', 'cells_annex_cell_unique')) {
            Schema::table('cells', function (Blueprint $table) {
                $table->unique(['annex_id', 'cell_number'], 'cells_annex_cell_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cells', function (Blueprint $table) {
            $table->dropForeign(['annex_id']);
            $table->dropIndex('annex_id');
            $table->dropUnique('cells_annex_cell_unique');
            $table->unique('cell_number');
            $table->dropColumn('annex_id');
        });
    }
};
