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
        Schema::create('session_media_commands', function (Blueprint $table) {
            $table->id();
            $table->string('room_id'); // VideoSDK room ID
            $table->string('command'); // 'mute_audio', 'unmute_audio', 'disable_camera', 'enable_camera'
            $table->unsignedBigInteger('issued_by'); // User ID who issued the command
            $table->boolean('executed')->default(false); // Whether command has been executed
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
            
            $table->index('room_id');
            $table->index(['room_id', 'executed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_media_commands');
    }
};
