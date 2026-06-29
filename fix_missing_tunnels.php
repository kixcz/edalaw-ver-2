<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking for Visit Sessions Without Tunnels ===\n\n";

// Get all virtual visit sessions
$sessions = \App\Models\VisitSession::whereNotNull('visit_id')
    ->with(['visit'])
    ->get();

echo "Total virtual visit sessions: {$sessions->count()}\n\n";

$sessionsWithoutTunnels = [];

foreach ($sessions as $session) {
    $hasTunnel = $session->inmateTunnels()->exists();
    
    if (!$hasTunnel) {
        $sessionsWithoutTunnels[] = $session;
        echo "Session ID: {$session->id}\n";
        echo "  Visit ID: {$session->visit_id}\n";
        echo "  Status: {$session->status}\n";
        echo "  Monitor ID: {$session->monitor_id}\n";
        echo "  Scheduled: {$session->scheduled_start} to {$session->scheduled_end}\n";
        echo "  ❌ NO TUNNEL\n\n";
    }
}

echo "\n=== Summary ===\n";
echo "Sessions with tunnels: " . ($sessions->count() - count($sessionsWithoutTunnels)) . "\n";
echo "Sessions without tunnels: " . count($sessionsWithoutTunnels) . "\n";

if (count($sessionsWithoutTunnels) > 0) {
    echo "\nWould you like to create tunnels for these sessions? (y/n): ";
    $handle = fopen("php://stdin", "r");
    $response = trim(fgets($handle));
    
    if (strtolower($response) === 'y') {
        echo "\nCreating tunnels...\n";
        foreach ($sessionsWithoutTunnels as $session) {
            try {
                $tunnel = \App\Models\InmateTunnel::create([
                    'visit_session_id' => $session->id,
                    'tunnel_token' => \App\Models\InmateTunnel::generateToken(),
                    'short_code' => \App\Models\InmateTunnel::generateShortCode(),
                    'expires_at' => $session->scheduled_end,
                    'is_used' => false,
                ]);
                
                echo "✓ Created tunnel for Session {$session->id}: {$tunnel->short_code}\n";
            } catch (\Exception $e) {
                echo "✗ Failed to create tunnel for Session {$session->id}: " . $e->getMessage() . "\n";
            }
        }
        echo "\nDone!\n";
    } else {
        echo "Skipped.\n";
    }
}
