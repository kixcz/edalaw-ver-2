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
        Schema::table('users', function (Blueprint $table) {
            // Add name fields if they don't exist
            if (!Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name')->after('name');
            }
            if (!Schema::hasColumn('users', 'middle_name')) {
                $table->string('middle_name')->nullable()->after('first_name');
            }
            if (!Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name')->after('middle_name');
            }
            
            // Remove the default 'name' column if it exists
            if (Schema::hasColumn('users', 'name')) {
                // Keep it for backward compatibility but make it nullable
                $table->string('name')->nullable()->change();
            }
            
            // Add role_id and branch_id if they don't exist
            if (!Schema::hasColumn('users', 'role_id')) {
                $table->foreignId('role_id')->nullable()->after('email')->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('role_id')->constrained()->nullOnDelete();
            }
            
            // Add phone_number and status if they don't exist
            if (!Schema::hasColumn('users', 'phone_number')) {
                $table->string('phone_number')->nullable()->after('last_name');
            }
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('phone_number');
            }
            
            // Set approval_status to approved for all existing users
            if (Schema::hasColumn('users', 'approval_status')) {
                DB::statement("UPDATE users SET approval_status = 'approved'");
            }
            
            // Add other useful fields
            if (!Schema::hasColumn('users', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('status');
            }
            if (!Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable()->after('date_of_birth');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'middle_name', 
                'last_name',
                'phone_number',
                'status',
                'date_of_birth',
                'address',
            ]);
            
            $table->dropForeign(['role_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['role_id', 'branch_id']);
        });
    }
};
