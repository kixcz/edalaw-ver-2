<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Inmate Tunnel Statistics ===\n\n";

echo "Total tunnels: " . \App\Models\InmateTunnel::count() . "\n";
echo "Tunnels with visit_session_id: " . \App\Models\InmateTunnel::whereNotNull('visit_session_id')->count() . "\n";
echo "Tunnels with short_code: " . \App\Models\InmateTunnel::whereNotNull('short_code')->count() . "\n";
echo "Tunnels with tunnel_token: " . \App\Models\InmateTunnel::whereNotNull('tunnel_token')->count() . "\n\n";

echo "=== Sample Tunnels (Last 5) ===\n";
$tunnels = \App\Models\InmateTunnel::with('visitSession')->latest()->limit(5)->get();

if ($tunnels->isEmpty()) {
    echo "No tunnels found in database!\n";
} else {
    foreach ($tunnels as $t) {
        echo "ID: {$t->id}\n";
        echo "  Session ID: {$t->visit_session_id}\n";
        echo "  Short Code: {$t->short_code}\n";
        echo "  Token: " . substr($t->tunnel_token, 0, 20) . "...\n";
        echo "  Created: {$t->created_at}\n";
        echo "  Expires: {$t->expires_at}\n";
        echo "  Is Used: " . ($t->is_used ? 'Yes' : 'No') . "\n";
        echo "  Session exists: " . ($t->visitSession ? 'Yes' : 'No') . "\n\n";
    }
}

echo "\n=== Visit Sessions (Last 5) ===\n";
$sessions = \App\Models\VisitSession::latest()->limit(5)->get();
foreach ($sessions as $s) {
    echo "Session ID: {$s->id}\n";
    echo "  Visit ID: {$s->visit_id}\n";
    echo "  Room ID: {$s->room_id}\n";
    echo "  Monitor ID: {$s->monitor_id}\n";
    echo "  Status: {$s->status}\n";
    echo "  Has tunnel: " . ($s->inmateTunnels()->exists() ? 'Yes' : 'No') . "\n";
    echo "  Tunnel count: " . $s->inmateTunnels()->count() . "\n\n";
}
