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
            $table->foreignId('jail_id')->after('id')->nullable()->constrained()->onDelete('set null');
            $table->index('jail_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visit_sessions', function (Blueprint $table) {
            $table->dropForeign(['jail_id']);
            $table->dropIndex('jail_id');
            $table->dropColumn('jail_id');
        });
    }
};
