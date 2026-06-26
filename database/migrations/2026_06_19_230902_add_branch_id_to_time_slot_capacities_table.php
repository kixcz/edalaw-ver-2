<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('time_slot_capacities', function (Blueprint $table) {
            $table->unsignedBigInteger('branch_id')->nullable()->after('id')
                  ->comment('Branch this time configuration applies to');
            
            $table->dropUnique(['time_slot', 'visit_type']);
            $table->unique(['branch_id', 'time_slot', 'visit_type']);
        });
    }

    public function down(): void
    {
        Schema::table('time_slot_capacities', function (Blueprint $table) {
            $table->dropColumn('branch_id');
            $table->dropUnique(['branch_id', 'time_slot', 'visit_type']);
            $table->unique(['time_slot', 'visit_type']);
        });
    }
};
