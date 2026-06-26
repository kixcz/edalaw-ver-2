<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drops the old single-column unique index if it exists (legacy DBs). Ensures
     * composite unique exists. Safe when run on fresh DBs where create migration
     * already added the composite.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        $indexName = 'time_slot_capacities_time_slot_unique';

        if ($driver === 'sqlite') {
            DB::statement("DROP INDEX IF EXISTS {$indexName}");
        } elseif ($driver === 'mysql') {
            // MySQL doesn't support DROP INDEX IF EXISTS, so we check first
            $indexExists = DB::select("SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_name = 'time_slot_capacities' AND index_name = '{$indexName}'");
            if ($indexExists[0]->count > 0) {
                DB::statement("ALTER TABLE time_slot_capacities DROP INDEX {$indexName}");
            }
        } else {
            DB::statement("DROP INDEX IF EXISTS {$indexName}");
        }

        try {
            Schema::table('time_slot_capacities', function (Blueprint $table) {
                $table->unique(['time_slot', 'visit_type']);
            });
        } catch (\Throwable $e) {
            // Composite unique already exists (e.g. from create migration)
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_slot_capacities', function (Blueprint $table) {
            $table->dropUnique(['time_slot', 'visit_type']);
            $table->unique('time_slot');
        });
    }
};
