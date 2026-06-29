<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Testing Full Controller Logic ===\n\n";

$user = \App\Models\User::find(8);

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

$tunnels = $query->orderByDesc('created_at')
    ->paginate(15)
    ->withQueryString()
    ->through(function (\App\Models\InmateTunnel $t) {
        $session = $t->visitSession;
        $visit = $session?->visit;
        $visitor = $visit?->user;
        $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->last_name}") : null;
        
        // Get inmate name from relationship or visit fields
        $inmateName = null;
        if ($visit) {
            if ($visit->inmate) {
                $inmateName = $visit->inmate->full_name;
            } else {
                $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
            }
        }

        return [
            'id' => $t->id,
            'visit_session_id' => $t->visit_session_id,
            'tunnel_token' => $t->tunnel_token,
            'short_code' => $t->short_code,
            'tunnel_link' => route('inmate.join', ['token' => $t->tunnel_token]),
            'expires_at' => $t->expires_at->toIso8601String(),
            'expires_at_human' => $t->expires_at->diffForHumans(),
            'is_used' => $t->is_used,
            'status' => $t->is_used ? 'used' : ($t->expires_at->isPast() ? 'expired' : 'valid'),
            'session_type' => 'visit',
            'visitor_name' => $visitorName,
            'inmate_name' => $inmateName ?: 'Unknown',
            'created_at' => $t->created_at->toIso8601String(),
        ];
    });

echo "Total tunnels returned: {$tunnels->total()}\n";
echo "Current page count: {$tunnels->count()}\n\n";

foreach ($tunnels as $t) {
    echo "Tunnel ID: {$t['id']}\n";
    echo "  Short Code: {$t['short_code']}\n";
    echo "  Tunnel Token: " . substr($t['tunnel_token'], 0, 20) . "...\n";
    echo "  Tunnel Link: {$t['tunnel_link']}\n";
    echo "  Visitor: {$t['visitor_name']}\n";
    echo "  Inmate: {$t['inmate_name']}\n";
    echo "  Status: {$t['status']}\n";
    echo "  Expires: {$t['expires_at_human']}\n\n";
}
