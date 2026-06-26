<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Eburol;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EburolMonitoringController extends Controller
{
    /**
     * Display the list of e-burol schedules assigned to the current jail officer.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $eburols = Eburol::with(['user', 'visitSessions.inmateTunnels'])
            ->where('jail_officer_id', $user->id)
            ->orderBy('wake_start_date', 'desc')
            ->get()
            ->map(function ($eburol) {
                $latestSession = $eburol->visitSessions->sortByDesc('scheduled_start')->first();
                $tunnel = $latestSession?->inmateTunnels->first();
                $inmateTunnelCode = $tunnel?->short_code;
                $inmateTunnelStatus = $tunnel ? ($tunnel->is_used ? 'used' : ($tunnel->expires_at->isPast() ? 'expired' : 'active')) : null;

                return [
                    'id' => $eburol->id,
                    'visitor_name' => trim("{$eburol->user->first_name} {$eburol->user->middle_name} {$eburol->user->last_name}"),
                    'visitor_email' => $eburol->user->email,
                    'inmate_name' => trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}"),
                    'deceased_name' => trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}"),
                    'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                    'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
                    'wake_location' => $eburol->wake_location,
                    'status' => $eburol->status->value,
                    'created_at' => $eburol->created_at->format('Y-m-d H:i:s'),
                    'inmate_tunnel_code' => $inmateTunnelCode,
                    'inmate_tunnel_status' => $inmateTunnelStatus,
                ];
            });

        return Inertia::render('MonitoringOfficer/EburolMonitoring', [
            'eburols' => $eburols,
        ]);
    }
}
