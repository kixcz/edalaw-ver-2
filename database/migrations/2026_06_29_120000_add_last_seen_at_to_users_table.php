<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds a `last_seen_at` timestamp to the users table so the
     * "online / offline" status of jail wardens and jail officers
     * can be derived in the reports & analytics module.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')
                    ->nullable()
                    ->after('email_verified_at')
                    ->comment('Last activity timestamp used for online/offline status in analytics.');
            }

            // Index to speed up online/offline group-bys in analytics
            $table->index('last_seen_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['last_seen_at']);
            $table->dropColumn('last_seen_at');
        });
    }
};
