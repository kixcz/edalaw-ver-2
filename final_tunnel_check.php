<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Final Verification ===\n\n";

$user = \App\Models\User::find(8);
echo "Jail Officer: {$user->first_name} {$user->last_name} (ID: {$user->id})\n";
echo "Role: {$user->role->slug}\n\n";

// Simulate the exact controller logic
$query = \App\Models\InmateTunnel::with(['visitSession.visit.user', 'visitSession.visit.inmate'])
    ->whereHas('visitSession', function ($q) use ($user) {
        $q->where(function ($sessionQuery) use ($user) {
            $sessionQuery->where('monitor_id', $user->id)
                ->orWhereHas('visit', function ($visitQuery) use ($user) {
                    $visitQuery->where('jail_officer_id', $user->id);
                });
        })
        ->whereNotNull('visit_id');
    });

$count = $query->count();
echo "Tunnels visible to this JO: {$count}\n\n";

if ($count > 0) {
    echo "✅ Tunnels ARE available in the backend!\n";
    echo "   URL to access: http://127.0.0.1:8000/jail-officer/inmate-tunnels\n\n";
    
    $tunnels = $query->orderByDesc('created_at')->get();
    echo "Tunnel details:\n";
    foreach ($tunnels as $t) {
        echo "  - Short Code: {$t->short_code}\n";
        echo "    Token: {$t->tunnel_token}\n";
        echo "    Status: " . ($t->is_used ? 'used' : ($t->expires_at->isPast() ? 'expired' : 'valid')) . "\n";
        echo "    Link: " . route('inmate.join', ['token' => $t->tunnel_token]) . "\n\n";
    }
} else {
    echo "❌ No tunnels found! This is unexpected.\n";
    echo "   Possible causes:\n";
    echo "   1. Visit sessions don't have monitor_id = 8\n";
    echo "   2. Visits don't have jail_officer_id = 8\n";
    echo "   3. Sessions are not virtual (visit_id is null)\n";
}
