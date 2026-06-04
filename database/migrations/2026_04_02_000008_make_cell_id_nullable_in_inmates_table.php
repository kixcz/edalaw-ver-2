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
        // Make cell_id nullable to allow inmates without cell assignment
        Schema::table('inmates', function (Blueprint $table) {
            $table->foreignId('cell_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inmates', function (Blueprint $table) {
            $table->foreignId('cell_id')->nullable(false)->change();
        });
    }
};
