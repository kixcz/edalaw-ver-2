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
        Schema::table('visit_sessions', function (Blueprint $table) {
            $table->boolean('session_consent_accepted')->default(false)->after('terms_accepted_at');
            $table->timestamp('session_consent_timestamp')->nullable()->after('session_consent_accepted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visit_sessions', function (Blueprint $table) {
            $table->dropColumn(['session_consent_accepted', 'session_consent_timestamp']);
        });
    }
};
