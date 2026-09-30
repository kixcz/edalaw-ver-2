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
        Schema::table('jail_warden_scopes', function (Blueprint $table) {
            $table->foreignId('jail_id')->nullable()->after('scope_type')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jail_warden_scopes', function (Blueprint $table) {
            $table->dropForeign(['jail_id']);
            $table->dropColumn('jail_id');
        });
    }
};
