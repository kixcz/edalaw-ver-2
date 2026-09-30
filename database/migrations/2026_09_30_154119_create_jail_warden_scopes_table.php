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
        Schema::create('jail_warden_scopes', function (Blueprint $table) {
            $table->id();
            
            // The Jail Warden this scope is assigned to
            $table->foreignId('jail_warden_id')
                  ->constrained('users')
                  ->cascadeOnDelete();
                  
            // The Regional Supervisor who assigned this scope
            $table->foreignId('assigned_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
                  
            // Type of scope: 'annex'/'building', 'dormitory', 'cell'
            $table->string('scope_type');
            
            // Facility IDs - only one of these will be populated per row
            $table->foreignId('building_id')->nullable()->constrained('annexes')->cascadeOnDelete();
            $table->foreignId('dormitory_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('cell_id')->nullable()->constrained()->cascadeOnDelete();
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // A warden should only be assigned a specific facility once
            $table->unique(['jail_warden_id', 'building_id'], 'jws_warden_building_unique');
            $table->unique(['jail_warden_id', 'dormitory_id'], 'jws_warden_dormitory_unique');
            $table->unique(['jail_warden_id', 'cell_id'], 'jws_warden_cell_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jail_warden_scopes');
    }
};
