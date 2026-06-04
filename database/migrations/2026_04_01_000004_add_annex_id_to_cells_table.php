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
        Schema::table('cells', function (Blueprint $table) {
            $table->foreignId('annex_id')->nullable()->constrained()->onDelete('set null');
            
            // Add indexes for better query performance
            $table->index(['annex_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cells', function (Blueprint $table) {
            $table->dropForeign(['annex_id']);
            $table->dropColumn('annex_id');
        });
    }
};
