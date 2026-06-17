<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Eburol;
use App\Models\Inmate;
use App\Models\Cell;
use App\Models\Visit;
use App\Models\VisitSession;
use App\Models\ChatFlag;
use App\Models\MonitoringAlert;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the Jail Officer operational command center dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Get authorized cell IDs from scope resolver (already loaded by middleware)
        $authorizedCellIds = $user->getAuthorizedCellIds();
        $authorizedBuildingIds = $user->getAuthorizedBuildingIds();
        $authorizedDormitoryIds = $user->getAuthorizedDormitoryIds();
        
        // ===== SCOPE SUMMARY =====
        $scopeSummary = [
            'total_dormitories' => count($authorizedDormitoryIds),
            'total_buildings' => count($authorizedBuildingIds),
            'total_cells' => count($authorizedCellIds),
            'total_pdls' => Inmate::whereIn('cell_id', $authorizedCellIds)->where('status', 'active')->count(),
        ];

        // ===== KPI CARDS =====
        // Total PDLs
        $totalPdls = $scopeSummary['total_pdls'];
        
        // Occupied vs Available Cells
        $occupiedCells = Cell::whereIn('id', $authorizedCellIds)
            ->whereHas('inmates', function($q) {
                $q->where('status', 'active');
            })
            ->count();
        $availableCells = count($authorizedCellIds) - $occupiedCells;
        
        // Pending Visit Requests
        $pendingVisits = Visit::whereIn('status', ['pending'])
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->count();
        
        // Pending E-Burol Requests
        $pendingEburols = Eburol::whereIn('status', ['pending'])
            ->where('jail_officer_id', $user->id)
            ->count();
        
        // Active Monitoring Sessions
        $activeSessions = VisitSession::whereIn('status', ['active'])
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('monitor_id', $user->id)
                  ->orWhereHas('visit.inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->count();
        
        // Today's Scheduled Visits
        $todayVisits = Visit::where('status', 'approved')
            ->where('scheduled_date', today())
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->count();

        // ===== VISIT VOLUME TREND (Last 7 days) =====
        $visitVolume = Visit::whereIn('status', ['approved', 'completed'])
            ->where('scheduled_date', '>=', now()->subDays(7))
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->selectRaw('DATE(scheduled_date) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($r) => [
                'date' => $r->date,
                'count' => (int) $r->count,
            ]);

        // ===== PDL DISTRIBUTION BY FACILITY =====
        $pdlDistribution = Cell::whereIn('id', $authorizedCellIds)
            ->withCount(['inmates' => function($q) {
                $q->where('status', 'active');
            }])
            ->orderBy('inmates_count', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($cell) => [
                'name' => "Cell {$cell->cell_number}",
                'count' => $cell->inmates_count,
                'capacity' => $cell->capacity,
            ]);

        // ===== CELL OCCUPANCY =====
        $cellOccupancy = Cell::whereIn('id', $authorizedCellIds)
            ->withCount(['inmates' => function($q) {
                $q->where('status', 'active');
            }])
            ->get()
            ->map(fn($cell) => [
                'cell' => "Cell {$cell->cell_number}",
                'occupied' => $cell->inmates_count,
                'capacity' => $cell->capacity,
                'percentage' => $cell->capacity > 0 ? round(($cell->inmates_count / $cell->capacity) * 100, 1) : 0,
            ]);

        // ===== SESSION MONITORING STATS =====
        $sessionStats = [
            'completed' => VisitSession::where('status', 'completed')
                ->where(function($q) use ($user, $authorizedCellIds) {
                    $q->where('monitor_id', $user->id)
                      ->orWhereHas('visit.inmate', function($iq) use ($authorizedCellIds) {
                          $iq->whereIn('cell_id', $authorizedCellIds);
                      });
                })
                ->where('ended_at', '>=', now()->subDays(7))
                ->count(),
            'active' => $activeSessions,
            'flagged' => ChatFlag::whereHas('monitoringSession', function($q) use ($user, $authorizedCellIds) {
                    $q->where('monitored_by', $user->id)
                      ->orWhereHas('visit.inmate', function($iq) use ($authorizedCellIds) {
                          $iq->whereIn('cell_id', $authorizedCellIds);
                      });
                })
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
        ];

        // ===== RECENT ACTIVITY FEED =====
        $recentActivities = collect();
        
        // Recent visit requests
        $recentVisits = Visit::where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->where('created_at', '>=', now()->subDays(2))
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn($visit) => [
                'id' => $visit->id,
                'type' => 'visit_request',
                'title' => "Visit Request #{$visit->id}",
                'description' => "New visit request from {$visit->user->full_name}",
                'status' => $visit->status->value,
                'created_at' => $visit->created_at->diffForHumans(),
            ]);
        
        $recentActivities = $recentActivities->merge($recentVisits);
        
        // Sort by created_at descending
        $recentActivities = $recentActivities->sortByDesc('created_at')->values();

        // ===== UPCOMING VISITS =====
        $upcomingVisits = Visit::where('status', 'approved')
            ->where('scheduled_date', '>=', today())
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->with(['user', 'inmate'])
            ->orderBy('scheduled_date')
            ->orderBy('scheduled_time')
            ->limit(10)
            ->get()
            ->map(fn($visit) => [
                'id' => $visit->id,
                'visitor_name' => $visit->user->full_name,
                'inmate_name' => $visit->inmate->full_name,
                'scheduled_date' => $visit->scheduled_date->format('M d, Y'),
                'scheduled_time' => $visit->scheduled_time,
                'visit_type' => $visit->visit_type->value,
            ]);

        // ===== UPCOMING E-BUROL SESSIONS =====
        $upcomingEburols = Eburol::whereIn('status', ['approved'])
            ->where('wake_start_date', '>=', today())
            ->where('jail_officer_id', $user->id)
            ->with('user')
            ->orderBy('wake_start_date')
            ->limit(5)
            ->get()
            ->map(fn($eburol) => [
                'id' => $eburol->id,
                'visitor_name' => $eburol->user->full_name,
                'scheduled_date' => $eburol->wake_start_date->format('M d, Y'),
                'scheduled_time' => $eburol->preferred_time ?? 'N/A',
            ]);

        // ===== PENDING APPROVALS =====
        $pendingApprovals = Visit::where('status', 'pending')
            ->where(function($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->with(['user', 'inmate'])
            ->orderBy('scheduled_date')
            ->limit(5)
            ->get()
            ->map(fn($visit) => [
                'id' => $visit->id,
                'visitor_name' => $visit->user->full_name,
                'inmate_name' => $visit->inmate->full_name,
                'scheduled_date' => $visit->scheduled_date->format('M d, Y'),
                'scheduled_time' => $visit->scheduled_time,
            ]);

        // ===== FLAGGED CHATS/INCIDENTS =====
        $flaggedItems = ChatFlag::whereIn('severity', ['high', 'medium', 'low'])
            ->whereHas('monitoringSession', function($q) use ($user, $authorizedCellIds) {
                $q->where('monitored_by', $user->id)
                  ->orWhereHas('visit.inmate', function($iq) use ($authorizedCellIds) {
                      $iq->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->with(['monitoringSession.visit.user', 'monitoringSession.visit.inmate', 'chatMessage'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($flag) => [
                'id' => $flag->id,
                'message' => $flag->chatMessage?->message ?? 'Flagged content detected',
                'severity' => $flag->severity,
                'visitor_name' => $flag->monitoringSession?->visit?->user?->full_name,
                'created_at' => $flag->created_at->diffForHumans(),
            ]);

        // ===== FACILITY ALERTS =====
        $facilityAlerts = collect();
        
        // Overcrowded cells
        $overcrowdedCells = Cell::whereIn('id', $authorizedCellIds)
            ->withCount(['inmates' => function($q) {
                $q->where('status', 'active');
            }])
            ->get()
            ->filter(fn($cell) => $cell->inmates_count > $cell->capacity)
            ->map(fn($cell) => [
                'type' => 'overcrowded',
                'title' => "Cell {$cell->cell_number} Overcrowded",
                'description' => "{$cell->inmates_count} PDLs (Capacity: {$cell->capacity})",
                'severity' => 'high',
            ]);
        
        $facilityAlerts = $facilityAlerts->merge($overcrowdedCells);

        return Inertia::render('JailOfficer/Dashboard', [
            'scopeSummary' => $scopeSummary,
            'kpis' => [
                'total_pdls' => $totalPdls,
                'occupied_cells' => $occupiedCells,
                'available_cells' => $availableCells,
                'pending_visits' => $pendingVisits,
                'pending_eburols' => $pendingEburols,
                'active_sessions' => $activeSessions,
                'today_visits' => $todayVisits,
            ],
            'visitVolume' => $visitVolume,
            'pdlDistribution' => $pdlDistribution,
            'cellOccupancy' => $cellOccupancy,
            'sessionStats' => $sessionStats,
            'recentActivities' => $recentActivities,
            'upcomingVisits' => $upcomingVisits,
            'upcomingEburols' => $upcomingEburols,
            'pendingApprovals' => $pendingApprovals,
            'flaggedItems' => $flaggedItems,
            'facilityAlerts' => $facilityAlerts,
        ]);
    }
}
