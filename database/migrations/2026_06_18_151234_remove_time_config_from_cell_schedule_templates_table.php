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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cell_schedule_templates', function (Blueprint $table) {
            $table->time('virtual_start_time')->nullable()->after('physical_available');
            $table->time('virtual_end_time')->nullable()->after('virtual_start_time');
            $table->integer('virtual_duration_minutes')->nullable()->after('virtual_end_time');
            $table->integer('virtual_interval_minutes')->nullable()->after('virtual_duration_minutes');
            $table->time('physical_start_time')->nullable()->after('virtual_interval_minutes');
            $table->time('physical_end_time')->nullable()->after('physical_start_time');
            $table->integer('physical_duration_minutes')->nullable()->after('physical_end_time');
            $table->integer('physical_interval_minutes')->nullable()->after('physical_duration_minutes');
        });
    }
};
