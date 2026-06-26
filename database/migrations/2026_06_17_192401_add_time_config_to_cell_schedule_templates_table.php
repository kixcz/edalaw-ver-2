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
            // Virtual visit time configuration
            $table->time('virtual_start_time')->nullable()->after('physical_available')
                  ->comment('Virtual visit start time (e.g., 07:00:00)');
            $table->time('virtual_end_time')->nullable()->after('virtual_start_time')
                  ->comment('Virtual visit end time (e.g., 21:00:00)');
            $table->integer('virtual_duration_minutes')->nullable()->after('virtual_end_time')
                  ->comment('Duration per virtual visit in minutes (e.g., 5)');
            $table->integer('virtual_interval_minutes')->nullable()->after('virtual_duration_minutes')
                  ->comment('Interval between virtual visits in minutes (e.g., 0 or 1)');

            // Physical visit time configuration
            $table->time('physical_start_time')->nullable()->after('virtual_interval_minutes')
                  ->comment('Physical visit start time (e.g., 08:00:00)');
            $table->time('physical_end_time')->nullable()->after('physical_start_time')
                  ->comment('Physical visit end time (e.g., 17:00:00)');
            $table->integer('physical_duration_minutes')->nullable()->after('physical_end_time')
                  ->comment('Duration per physical visit in minutes (e.g., 15)');
            $table->integer('physical_interval_minutes')->nullable()->after('physical_duration_minutes')
                  ->comment('Interval between physical visits in minutes (e.g., 5)');
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
                'virtual_duration_minutes',
                'virtual_interval_minutes',
                'physical_start_time',
                'physical_end_time',
                'physical_duration_minutes',
                'physical_interval_minutes',
            ]);
        });
    }
};
