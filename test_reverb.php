<?php

/**
 * Test Laravel Reverb Broadcasting
 * 
 * Run this script to verify Reverb is working:
 * php test_reverb.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Notification;
use App\Events\JailOfficerNotification;

echo "=== Laravel Reverb Test ===\n\n";

// Step 1: Check if Reverb is installed
echo "1. Checking Reverb installation...\n";
if (class_exists('Laravel\Reverb\ReverbServiceProvider')) {
    echo "   ✅ Reverb is installed\n";
} else {
    echo "   ❌ Reverb NOT installed\n";
    exit(1);
}

// Step 2: Check environment variables
echo "\n2. Checking environment configuration...\n";
$reverbAppId = env('REVERB_APP_ID');
$reverbKey = env('REVERB_APP_KEY');
$reverbSecret = env('REVERB_APP_SECRET');
$broadcastDriver = env('BROADCAST_CONNECTION');

if ($reverbAppId && $reverbKey && $reverbSecret) {
    echo "   ✅ REVERB_APP_ID: {$reverbAppId}\n";
    echo "   ✅ REVERB_APP_KEY: {$reverbKey}\n";
    echo "   ✅ REVERB_APP_SECRET: [HIDDEN]\n";
} else {
    echo "   ❌ Missing Reverb environment variables\n";
}

if ($broadcastDriver === 'reverb') {
    echo "   ✅ BROADCAST_CONNECTION: reverb\n";
} else {
    echo "   ⚠️  BROADCAST_CONNECTION: {$broadcastDriver} (should be 'reverb')\n";
}

// Step 3: Find a jail officer
echo "\n3. Finding a jail officer...\n";
$jailOfficer = User::where('role', 'jail_officer')->first();

if ($jailOfficer) {
    echo "   ✅ Found jail officer: {$jailOfficer->name} (ID: {$jailOfficer->id})\n";
} else {
    echo "   ❌ No jail officer found in database\n";
    echo "   💡 Create a jail officer first\n";
    exit(1);
}

// Step 4: Create test notification
echo "\n4. Creating test notification...\n";
try {
    $notification = Notification::create([
        'user_id' => $jailOfficer->id,
        'type' => 'test_notification',
        'title' => 'Test Notification',
        'message' => 'This is a test notification to verify Reverb is working!',
        'notifiable_id' => 999,
        'notifiable_type' => 'App\\Models\\Visit',
    ]);
    echo "   ✅ Notification created (ID: {$notification->id})\n";
} catch (\Exception $e) {
    echo "   ❌ Failed to create notification: {$e->getMessage()}\n";
    exit(1);
}

// Step 5: Broadcast event
echo "\n5. Broadcasting event...\n";
echo "   💡 Make sure Reverb server is running: php artisan reverb:start --debug\n";
echo "   💡 Open jail officer dashboard in browser first\n\n";

try {
    broadcast(new JailOfficerNotification($jailOfficer, $notification));
    echo "   ✅ Event broadcast successfully!\n";
    echo "\n📋 Check the jail officer browser for:\n";
    echo "   - Toast notification with title 'Test Notification'\n";
    echo "   - Console log: '[Reverb] New notification received: Test Notification'\n";
} catch (\Exception $e) {
    echo "   ❌ Failed to broadcast: {$e->getMessage()}\n";
    echo "\n   💡 Is Reverb server running?\n";
    echo "   💡 Run: php artisan reverb:start --debug\n";
    exit(1);
}

echo "\n=== Test Complete ===\n";
echo "\nIf you saw the notification in the browser, Reverb is working! 🎉\n";
echo "If not, check:\n";
echo "  1. Reverb server is running\n";
echo "  2. Browser console for errors\n";
echo "  3. Laravel logs: storage/logs/laravel.log\n";
