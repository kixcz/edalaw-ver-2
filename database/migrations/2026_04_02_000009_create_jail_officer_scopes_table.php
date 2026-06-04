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
        Schema::create('jail_officer_scopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jail_officer_id')->constrained('users')->onDelete('cascade'); // The assigned JO
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade'); // Jail Warden who assigned
            $table->string('scope_type'); // 'annex', 'dormitory', 'cell'
            $table->foreignId('annex_id')->nullable()->constrained()->onDelete('cascade'); // If scope_type is annex or higher
            $table->foreignId('dormitory_id')->nullable()->constrained()->onDelete('cascade'); // If scope_type is dormitory or cell
            $table->foreignId('cell_id')->nullable()->constrained()->onDelete('cascade'); // If scope_type is cell
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['jail_officer_id', 'is_active']);
            $table->index(['scope_type']);
            
            // Ensure one active scope per combination
            $table->unique(['jail_officer_id', 'annex_id', 'dormitory_id', 'cell_id', 'is_active'], 'unique_scope_assignment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jail_officer_scopes');
    }
};
