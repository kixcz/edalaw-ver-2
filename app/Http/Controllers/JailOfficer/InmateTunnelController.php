<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\InmateTunnel;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InmateTunnelController extends Controller
{
    /**
     * Display inmate tunnels for virtual sessions assigned to this jail officer.
     * Jail officers can only manage tunnels for visits where they are the assigned jail officer.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Filter tunnels for virtual sessions where this JO is assigned
        $query = InmateTunnel::with(['visitSession.visit.user', 'visitSession.visit.inmate'])
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

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tunnel_token', 'like', "%{$search}%")
                    ->orWhere('short_code', 'like', "%{$search}%")
                    ->orWhereHas('visitSession', function ($s) use ($search) {
                        $s->where('id', 'like', "%{$search}%")
                            ->orWhereHas('visit', function ($v) use ($search) {
                                $v->where('inmate_first_name', 'like', "%{$search}%")
                                    ->orWhere('inmate_middle_name', 'like', "%{$search}%")
                                    ->orWhere('inmate_last_name', 'like', "%{$search}%")
                                    ->orWhereHas('inmate', function ($i) use ($search) {
                                        $i->where('first_name', 'like', "%{$search}%")
                                            ->orWhere('middle_name', 'like', "%{$search}%")
                                            ->orWhere('last_name', 'like', "%{$search}%");
                                    });
                            });
                    });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('status')) {
            if ($request->status === 'used') {
                $query->where('is_used', true);
            } elseif ($request->status === 'expired') {
                $query->where('expires_at', '<', now());
            } elseif ($request->status === 'valid') {
                $query->where('is_used', false)->where('expires_at', '>=', now());
            }
        }

        $tunnels = $query->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(function (InmateTunnel $t) {
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

        // Calculate stats (use all tunnels, not just paginated)
        $allTunnelsQuery = InmateTunnel::query()->whereHas('visitSession', function ($q) use ($user) {
            $q->where(function ($sessionQuery) use ($user) {
                $sessionQuery->where('monitor_id', $user->id)
                    ->orWhereHas('visit', function ($visitQuery) use ($user) {
                        $visitQuery->where('jail_officer_id', $user->id);
                    });
            })->whereNotNull('visit_id');
        });
        
        $stats = [
            'total_tunnels' => (clone $allTunnelsQuery)->count(),
            'valid_tunnels' => (clone $allTunnelsQuery)->where('is_used', false)->where('expires_at', '>=', now())->count(),
            'used_tunnels' => (clone $allTunnelsQuery)->where('is_used', true)->count(),
            'expired_tunnels' => (clone $allTunnelsQuery)->where('expires_at', '<', now())->where('is_used', false)->count(),
        ];

        // Chart data
        $chartData = [
            'tunnels_by_status' => [
                ['status' => 'Valid', 'count' => $stats['valid_tunnels']],
                ['status' => 'Used', 'count' => $stats['used_tunnels']],
                ['status' => 'Expired', 'count' => $stats['expired_tunnels']],
            ],
            'tunnels_by_day' => collect(range(6, 0))->map(function ($daysAgo) use ($allTunnelsQuery) {
                $date = now()->subDays($daysAgo);
                $count = (clone $allTunnelsQuery)->whereDate('created_at', $date)->count();
                return [
                    'day' => $date->format('D'),
                    'count' => $count,
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('JailOfficer/InmateTunnels', [
            'tunnels' => $tunnels,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'search' => $request->search,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'status' => $request->status ?? 'all',
            ],
        ]);
    }
}
