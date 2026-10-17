<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $sessions = DB::table('sessions')->latest('last_activity')->take(10)->get();
    foreach ($sessions as $s) {
        $user = $s->user_id ? App\Models\User::with('role')->find($s->user_id) : null;
        echo "Session {$s->id} | User ID: " . ($s->user_id ?? 'guest') . " | Email: " . ($user?->email ?? 'none') . " | Role: " . ($user?->role?->slug ?? 'none') . " | Last: " . date('Y-m-d H:i:s', $s->last_activity) . "\n";
    }
} catch (\Exception $e) {
    echo "Sessions table check: " . $e->getMessage() . "\n";
}
