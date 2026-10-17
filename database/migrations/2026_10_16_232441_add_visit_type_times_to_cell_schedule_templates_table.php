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
        Schema::table('cell_schedule_templates', function (Blueprint $table) {
            $table->time('virtual_start_time')->nullable()->after('virtual_available');
            $table->time('virtual_end_time')->nullable()->after('virtual_start_time');
            $table->time('physical_start_time')->nullable()->after('physical_available');
            $table->time('physical_end_time')->nullable()->after('physical_start_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cell_schedule_templates', function (Blueprint $table) {
            $table->dropColumn([
                'virtual_start_time',
                'virtual_end_time',
                'physical_start_time',
                'physical_end_time',
            ]);
        });
    }
};
