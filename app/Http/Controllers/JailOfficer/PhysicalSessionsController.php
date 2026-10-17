<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Inmate;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhysicalSessionsController extends Controller
{
    /**
     * List all physical visit sessions for the jail officer.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'jail_warden' || $user->role?->slug === 'super_admin';

        $query = Visit::with(['user', 'inmate.cell.building', 'inmate.cell.dormitory'])
            ->where('visit_type', 'physical');

        if (! $isSuperAdmin) {
            $authorizedCellIds = $user->getAuthorizedCellIds();

            $query->where(function ($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                    ->orWhereHas('inmate', function ($inmateQuery) use ($authorizedCellIds) {
                        $inmateQuery->whereIn('cell_id', $authorizedCellIds);
                    });
            });
        }

        // Filter by date ranges if provided
        $startDateFilter = $request->input('start_date');
        $endDateFilter = $request->input('end_date');
        $monthFilter = $request->input('month');
        $yearFilter = $request->input('year');
        $statusFilter = $request->input('status');

        if ($startDateFilter) {
            $query->whereDate('scheduled_date', '>=', $startDateFilter);
        }
        if ($endDateFilter) {
            $query->whereDate('scheduled_date', '<=', $endDateFilter);
        }
        if ($monthFilter && $monthFilter !== 'none') {
            $query->whereMonth('scheduled_date', $monthFilter);
        }
        if ($yearFilter && $yearFilter !== 'none') {
            $query->whereYear('scheduled_date', $yearFilter);
        }
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $allVisits = (clone $query)->orderBy('scheduled_date', 'desc')
            ->orderBy('scheduled_time', 'desc')
            ->get();

        // Calculate stats
        $totalSessions = $allVisits->count();
        $approvedSessions = $allVisits->where('status', 'approved')->count();
        $completedSessions = $allVisits->where('status', 'completed')->count();
        $pendingSessions = $allVisits->where('status', 'pending')->count();
        $rejectedSessions = $allVisits->where('status', 'rejected')->count();

        // Unique PDLs visited vs unvisited in officer's scope
        $visitedInmateIds = $allVisits->pluck('inmate_id')->filter()->unique()->toArray();
        if (! $isSuperAdmin) {
            $authorizedCellIds = $user->getAuthorizedCellIds();
            $allPdls = Inmate::whereIn('cell_id', $authorizedCellIds)->get();
        } else {
            $allPdls = Inmate::all();
        }
        $totalPdlCount = $allPdls->count();
        $visitedPdlCount = count($visitedInmateIds);
        $unvisitedPdlCount = max(0, $totalPdlCount - $visitedPdlCount);

        // Chart data for physical visits: distribution by day of week or status
        $statusDistribution = [
            ['name' => 'Approved', 'value' => $approvedSessions, 'fill' => '#10b981'],
            ['name' => 'Pending', 'value' => $pendingSessions, 'fill' => '#f59e0b'],
            ['name' => 'Completed', 'value' => $completedSessions, 'fill' => '#3b82f6'],
            ['name' => 'Rejected', 'value' => $rejectedSessions, 'fill' => '#ef4444'],
        ];

        $sessions = $allVisits->map(function (Visit $visit) {
            $visitor = $visit->user;
            $inmate = $visit->inmate;

            $inmateName = $visit->inmate_first_name
                ? trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}")
                : ($inmate ? trim("{$inmate->first_name} {$inmate->middle_name} {$inmate->last_name}") : '—');

            $visitorName = $visitor
                ? trim("{$visitor->first_name} {$visitor->middle_name} {$visitor->last_name}")
                : ($visitor?->name ?? '—');

            $cell = $inmate?->cell;
            $cellNumber = $cell?->cell_number ?? '—';
            $dormitoryName = $cell?->dormitory?->name ?? '—';
            $buildingName = $cell?->building?->name ?? '—';

            $scheduledDateStr = $visit->scheduled_date ? Carbon::parse($visit->scheduled_date)->format('Y-m-d') : null;
            $scheduledTimeStr = $visit->scheduled_time ? (strlen($visit->scheduled_time) === 5 ? $visit->scheduled_time . ':00' : $visit->scheduled_time) : null;

            $isToday = $scheduledDateStr === now()->format('Y-m-d');

            return [
                'id' => $visit->id,
                'visit_id' => $visit->id,
                'inmate_id' => $visit->inmate_id,
                'inmate_name' => $inmateName,
                'visitor_id' => $visit->user_id,
                'visitor_name' => $visitorName,
                'visitor_email' => $visitor?->email,
                'visitor_phone' => $visitor?->phone_number,
                'cell_number' => $cellNumber,
                'dormitory_name' => $dormitoryName,
                'building_name' => $buildingName,
                'scheduled_date' => $scheduledDateStr,
                'scheduled_time' => $scheduledTimeStr,
                'status' => $visit->status,
                'visit_type' => 'physical',
                'relationship_to_inmate' => $visit->relationship_to_inmate,
                'notes' => $visit->notes,
                'rejection_reason' => $visit->rejection_reason,
                'is_today' => $isToday,
                'created_at' => $visit->created_at?->toIso8601String(),
            ];
        });

        $officerInfo = [
            'id' => $user->id,
            'name' => trim("{$user->first_name} {$user->last_name}") ?: ($user->name ?? 'Jail Officer'),
            'badge_number' => $user->badge_number ?? 'JO-' . str_pad($user->id, 5, '0', STR_PAD_LEFT),
            'branch' => $user->branch?->name ?? 'BJMP Facility',
            'role' => $user->role?->name ?? 'Jail Officer',
        ];

        return Inertia::render('JailOfficer/PhysicalSessions', [
            'sessions' => $sessions,
            'officerInfo' => $officerInfo,
            'stats' => [
                'total_sessions' => $totalSessions,
                'approved_sessions' => $approvedSessions,
                'completed_sessions' => $completedSessions,
                'pending_sessions' => $pendingSessions,
                'rejected_sessions' => $rejectedSessions,
                'visited_pdl_count' => $visitedPdlCount,
                'unvisited_pdl_count' => $unvisitedPdlCount,
                'total_pdl_count' => $totalPdlCount,
            ],
            'chartData' => [
                'statusDistribution' => $statusDistribution,
            ],
            'filters' => [
                'start_date' => $startDateFilter,
                'end_date' => $endDateFilter,
                'month' => $monthFilter,
                'year' => $yearFilter,
                'status' => $statusFilter,
            ],
        ]);
    }

    /**
     * Mark physical session as completed / checked-in based on scheduled date and time.
     */
    public function markCompleted(Request $request, Visit $visit): RedirectResponse
    {
        if ($visit->visit_type->value !== 'physical' && $visit->visit_type !== 'physical') {
            return back()->with('error', 'Visit is not a physical visit.');
        }

        if ($visit->status !== 'approved') {
            return back()->with('error', 'Only approved physical visits can be checked in.');
        }

        $today = now()->format('Y-m-d');
        $scheduledDate = $visit->scheduled_date ? Carbon::parse($visit->scheduled_date)->format('Y-m-d') : null;

        // Check if visit is scheduled for today
        if ($scheduledDate !== $today) {
            $formattedDate = $scheduledDate ? Carbon::parse($scheduledDate)->format('M d, Y') : 'N/A';
            return back()->with('error', "Cannot check in visitor today. Visit is scheduled for {$formattedDate}. Check-in is only allowed on the scheduled date.");
        }

        // Check if scheduled time exists and validate window (allows check-in 30 mins before up to 2 hours after scheduled time)
        if ($visit->scheduled_time) {
            $timeString = strlen($visit->scheduled_time) === 5 ? $visit->scheduled_time . ':00' : $visit->scheduled_time;
            $scheduledDateTime = Carbon::parse("{$today} {$timeString}");
            $earliestAllowed = $scheduledDateTime->copy()->subMinutes(30);
            $latestAllowed = $scheduledDateTime->copy()->addHours(2);

            if (now()->lt($earliestAllowed)) {
                $earliestFormatted = $earliestAllowed->format('h:i A');
                return back()->with('error', "Too early for check-in. Check-in opens at {$earliestFormatted} (30 minutes prior to scheduled slot {$scheduledDateTime->format('h:i A')}).");
            }

            if (now()->gt($latestAllowed)) {
                return back()->with('error', "Check-in window has elapsed for scheduled slot {$scheduledDateTime->format('h:i A')}. Please tag as No-Show.");
            }
        }

        $visit->update([
            'status' => 'completed',
        ]);

        return back()->with('success', 'Visitor checked in successfully.');
    }

    /**
     * Mark physical session as no-show or cancelled.
     */
    public function markNoShow(Request $request, Visit $visit): RedirectResponse
    {
        if ($visit->visit_type->value !== 'physical' && $visit->visit_type !== 'physical') {
            return back()->with('error', 'Visit is not a physical visit.');
        }

        $visit->update([
            'status' => 'rejected',
            'rejection_reason' => $request->input('reason', 'Visitor did not arrive / No show for scheduled physical visit.'),
        ]);

        return back()->with('success', 'Physical visit session marked as no-show.');
    }
}
