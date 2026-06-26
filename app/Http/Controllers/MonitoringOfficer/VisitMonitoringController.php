<?php

namespace App\Http\Controllers\MonitoringOfficer;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitMonitoringController extends Controller
{
    /**
     * Display the list of virtual visits assigned to the current monitoring officer.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $visits = Visit::with(['user', 'visitSessions' => fn ($q) => $q->orderBy('scheduled_start', 'desc')->limit(1)])
            ->where('jail_officer_id', $user->id)
            ->where('visit_type', \App\VisitType::Virtual)
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('scheduled_time', 'desc')
            ->get()
            ->map(function ($visit) {
                $latestSession = $visit->visitSessions->first();
                $joinUrl = $latestSession
                    ? route('monitoring-officer.assigned-sessions.join', $latestSession)
                    : null;

                return [
                    'id' => $visit->id,
                    'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
                    'visitor_email' => $visit->user->email,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                    'scheduled_time' => $visit->scheduled_time,
                    'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                    'status' => $visit->status->value,
                    'join_url' => $joinUrl,
                    'created_at' => $visit->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('MonitoringOfficer/VisitMonitoring', [
            'visits' => $visits,
        ]);
    }
}
