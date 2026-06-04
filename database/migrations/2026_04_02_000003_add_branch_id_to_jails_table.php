<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if column already exists from failed migration
        if (!Schema::hasColumn('jails', 'branch_id')) {
            Schema::table('jails', function (Blueprint $table) {
                $table->foreignId('branch_id')->after('id')->nullable()->constrained()->onDelete('cascade');
                $table->index('branch_id');
            });
        }
        
        // Update existing jails to use the first available branch
        $hasBranches = DB::table('branches')->exists();
        if ($hasBranches) {
            DB::statement('
                UPDATE jails 
                SET branch_id = (SELECT id FROM branches LIMIT 1)
                WHERE branch_id IS NULL
            ');
            
            // Now make it non-nullable if there are branches
            if (Schema::hasColumn('jails', 'branch_id')) {
                Schema::table('jails', function (Blueprint $table) {
                    $table->foreignId('branch_id')->nullable(false)->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jails', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropIndex('branch_id');
            $table->dropColumn('branch_id');
        });
    }
};
