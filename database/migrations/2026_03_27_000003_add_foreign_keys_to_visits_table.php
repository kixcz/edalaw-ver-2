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
        Schema::table('visits', function (Blueprint $table) {
            // Add foreign key columns
            $table->foreignId('inmate_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('relationship_proof_file_id')->nullable()->after('notes')->constrained('uploaded_files')->nullOnDelete();
            $table->foreignId('additional_proof_file_id')->nullable()->after('relationship_proof_file_id')->constrained('uploaded_files')->nullOnDelete();
            
            // Keep old columns for backward compatibility during migration
            // They will be removed after data migration
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropForeign(['inmate_id']);
            $table->dropForeign(['relationship_proof_file_id']);
            $table->dropForeign(['additional_proof_file_id']);
            
            $table->dropColumn(['inmate_id', 'relationship_proof_file_id', 'additional_proof_file_id']);
        });
    }
};
