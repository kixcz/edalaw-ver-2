<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Debugging Jail Officer Tunnel Query ===\n\n";

$userId = 8; // From the logs, this is the jail officer
$user = \App\Models\User::find($userId);

echo "User ID: {$user->id}\n";
echo "User Name: {$user->first_name} {$user->last_name}\n";
echo "Role: " . ($user->role ? $user->role->slug : 'None') . "\n\n";

echo "=== All Tunnels ===\n";
$allTunnels = \App\Models\InmateTunnel::with(['visitSession.visit'])->get();
foreach ($allTunnels as $t) {
    $session = $t->visitSession;
    $visit = $session?->visit;
    
    echo "Tunnel ID: {$t->id}\n";
    echo "  Session ID: {$t->visit_session_id}\n";
    echo "  Session Monitor ID: {$session->monitor_id}\n";
    echo "  Visit ID: " . ($visit ? $visit->id : 'N/A') . "\n";
    echo "  Visit Jail Officer ID: " . ($visit ? $visit->jail_officer_id : 'N/A') . "\n";
    echo "  Matches monitor_id? " . ($session->monitor_id == $userId ? 'YES' : 'NO') . "\n";
    echo "  Matches jail_officer_id? " . ($visit && $visit->jail_officer_id == $userId ? 'YES' : 'NO') . "\n";
    echo "  Short Code: {$t->short_code}\n\n";
}

echo "\n=== Testing the Query ===\n";
$query = \App\Models\InmateTunnel::with(['visitSession.visit.user', 'visitSession.visit.inmate'])
    ->whereHas('visitSession', function ($q) use ($user) {
        $q->where(function ($sessionQuery) use ($user) {
            // Option 1: Session is directly monitored by this JO
            $sessionQuery->where('monitor_id', $user->id)
                // Option 2: Session's visit is assigned to this JO
                ->orWhereHas('visit', function ($visitQuery) use ($user) {
                    $visitQuery->where('jail_officer_id', $user->id);
                });
        })
        // Only virtual visits (sessions with tunnels are virtual)
        ->whereNotNull('visit_id');
    });

echo "SQL: " . $query->toSql() . "\n";
echo "Bindings: " . json_encode($query->getBindings()) . "\n";
echo "Count: " . $query->count() . "\n\n";

$results = $query->get();
echo "Results:\n";
foreach ($results as $t) {
    echo "  Tunnel ID: {$t->id}, Short Code: {$t->short_code}\n";
}

if ($results->isEmpty()) {
    echo "\nNo tunnels returned! This is the problem.\n";
}
