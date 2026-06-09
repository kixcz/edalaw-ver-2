<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\InmateTunnel;
use App\Models\SystemLog;
use App\Models\Visit;
use App\Models\VisitSession;
use App\Services\VideoSdkService;
use App\Services\VisitSessionCompletionService;
use App\Services\VisitSessionRecordingService;
use App\Services\NotificationService;
use App\VisitType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AssignedVisitSessionsController extends Controller
{
    /**
     * Display all assigned visit sessions (pending for approval + active/scheduled for monitoring).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        // Get JO's active scope IDs
        $scopeIds = $user->jailOfficerScopes()->where('is_active', true);
        
        // Build list of cell IDs that match JO's scopes
        $cellIds = [];
        
        // Get cells from direct cell assignments
        $cellScopeIds = $scopeIds->clone()
            ->where('scope_type', 'cell')
            ->pluck('cell_id');
        $cellIds = array_merge($cellIds, $cellScopeIds->toArray());
        
        // Get cells from dormitory assignments
        $dormScopeIds = $scopeIds->clone()
            ->where('scope_type', 'dormitory')
            ->pluck('dormitory_id');
        if ($dormScopeIds->isNotEmpty()) {
            $cellsFromDorms = \App\Models\Cell::whereIn('dormitory_id', $dormScopeIds)->pluck('id');
            $cellIds = array_merge($cellIds, $cellsFromDorms->toArray());
        }
        
        // Get cells from annex assignments
        $annexScopeIds = $scopeIds->clone()
            ->where('scope_type', 'annex')
            ->pluck('annex_id');
        if ($annexScopeIds->isNotEmpty()) {
            // Get cells that have this annex_id directly OR cells in dormitories that belong to this annex
            $cellsFromAnnexes = \App\Models\Cell::where(function($q) use ($annexScopeIds) {
                    $q->whereIn('annex_id', $annexScopeIds)
                      ->orWhereHas('dormitory', function($dq) use ($annexScopeIds) {
                          $dq->whereIn('annex_id', $annexScopeIds);
                      });
                })->pluck('id');
            $cellIds = array_merge($cellIds, $cellsFromAnnexes->toArray());
        }
        
        // Remove duplicates
        $cellIds = array_unique($cellIds);

        // Get all visits assigned to this JO based on scope OR direct assignment
        $visitsQuery = Visit::with(['user', 'inmate.cell.dormitory', 'inmate.cell.annex', 'jailOfficer'])
            ->where(function ($q) use ($user, $cellIds) {
                // Direct assignment by jail_officer_id
                $q->where('jail_officer_id', $user->id)
                  // OR inmate is in one of the cells assigned to JO
                  ->orWhereHas('inmate', function ($inmateQuery) use ($cellIds) {
                      $inmateQuery->whereIn('cell_id', $cellIds);
                  });
            });

        // Filter by status if requested
        $statusFilter = $request->input('status');
        if ($statusFilter) {
            $visitsQuery->where('status', $statusFilter);
        }

        // Filter by visit type if requested
        $typeFilter = $request->input('visit_type');
        if ($typeFilter) {
            $visitsQuery->where('visit_type', $typeFilter);
        }

        $visits = $visitsQuery->orderBy('scheduled_date', 'desc')
            ->orderBy('scheduled_time', 'desc')
            ->paginate(20);

        // Transform visits for frontend
        $visitsData = $visits->map(function ($visit) {
            return [
                'id' => $visit->id,
                'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
                'visitor_email' => $visit->user->email,
                'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                'inmate_id' => $visit->inmate_id,
                'cell_info' => $visit->inmate?->cell ? [
                    'cell_number' => $visit->inmate->cell->cell_number,
                    'floor' => $visit->inmate->cell->floor ?? null,
                    'dormitory_name' => $visit->inmate->cell->dormitory?->name,
                    'annex_name' => $visit->inmate->cell->annex?->name ?? $visit->inmate->cell->dormitory?->annex?->name,
                ] : null,
                'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                'scheduled_time' => $visit->scheduled_time,
                'visit_type' => $visit->visit_type->value,
                'status' => $visit->status->value,
                'rejection_reason' => $visit->rejection_reason,
                'created_at' => $visit->created_at?->toIso8601String(),
                'has_session' => $visit->visitSessions()->exists(),
            ];
        });

        return Inertia::render('JailOfficer/AssignedVisitSessions', [
            'visits' => $visitsData,
            'pagination' => [
                'current_page' => $visits->currentPage(),
                'last_page' => $visits->lastPage(),
                'per_page' => $visits->perPage(),
                'total' => $visits->total(),
            ],
            'filters' => [
                'status' => $statusFilter ?? 'all',
                'visit_type' => $typeFilter ?? 'all',
            ],
        ]);
    }

    /**
     * Approve a visit schedule.
     */
    public function approve(Request $request, Visit $visit): RedirectResponse
    {
        $user = $request->user();
        
        // Verify JO is assigned to this visit (via scope or direct assignment)
        $isAssigned = $this->isJailOfficerAssignedToVisit($user, $visit);
        if (!$isAssigned && $user->role?->slug !== 'super_admin') {
            abort(403, 'You are not assigned to this visit.');
        }

        // Can only approve pending visits
        if ($visit->status->value !== 'pending') {
            return back()->withErrors(['approve' => 'Only pending visits can be approved.']);
        }

        // Check if schedule has passed
        if ($visit->isScheduleInPast()) {
            return back()->withErrors(['approve' => 'This schedule has passed and cannot be approved.']);
        }

        DB::beginTransaction();
        try {
            // Update visit status
            $visit->update([
                'status' => 'approved',
                'jail_officer_id' => $user->id,
                'notes' => $request->input('notes'),
            ]);

            // If virtual visit, create VideoSDK room and session
            if ($visit->visit_type === VisitType::Virtual && !$visit->daily_co_room_id) {
                $videoSdk = new VideoSdkService;
                
                // Generate participant IDs
                $visitorParticipantId = 'visitor-' . $visit->user->id . '-' . $visit->id;
                $inmateParticipantId = 'inmate-' . $visit->inmate_id . '-' . $visit->id;
                $monitorParticipantId = 'monitor-' . $user->id . '-' . $visit->id;

                // Create room
                $roomResult = $videoSdk->createRoom(
                    roomId: null,
                    title: "Visit #{$visit->id} - {$visit->user->last_name}",
                    scheduledStart: $visit->scheduled_date->format('Y-m-d') . ' ' . $visit->scheduled_time,
                    scheduledEnd: $visit->scheduled_date->copy()->addMinutes(10)->format('Y-m-d H:i'),
                );

                if (!($roomResult['success'] ?? false)) {
                    throw new \Exception('Failed to create video room: ' . ($roomResult['error'] ?? 'Unknown error'));
                }

                $roomId = $roomResult['room_id'];
                $roomUrl = $roomResult['room_url'] ?? '';

                // Generate tokens
                $visitorToken = $videoSdk->generateJoinTokenForPrebuiltApp(
                    $roomId,
                    $visitorParticipantId,
                    ['allow_join'],
                    120
                );

                $inmateToken = $videoSdk->generateJoinTokenForPrebuiltApp(
                    $roomId,
                    $inmateParticipantId,
                    ['allow_join'],
                    120
                );

                $visit->update([
                    'daily_co_room_id' => $roomId,
                    'daily_co_room_name' => "Visit #{$visit->id}",
                    'daily_co_room_url' => $roomUrl,
                    'inmate_token' => preg_replace('/^Bearer\s+/i', '', $inmateToken['token'] ?? ''),
                ]);

                // Create visit session
                VisitSession::create([
                    'visit_id' => $visit->id,
                    'room_id' => $roomId,
                    'session_type' => 'visit',
                    'scheduled_start' => $visit->scheduled_date->copy()->parse($visit->scheduled_time),
                    'scheduled_end' => $visit->scheduled_date->copy()->parse($visit->scheduled_time)->addMinutes(10),
                    'status' => 'scheduled',
                    'recording_status' => 'not_recording',
                    'chat_locked' => false,
                    'monitor_id' => $user->id,
                ]);

                // Generate inmate tunnel
                $tunnel = InmateTunnel::create([
                    'visit_session_id' => Visit::latest()->first()->id,
                    'tunnel_token' => InmateTunnel::generateToken(),
                    'short_code' => InmateTunnel::generateShortCode(),
                    'expires_at' => $visit->scheduled_date->copy()->parse($visit->scheduled_time)->addMinutes(10),
                    'is_used' => false,
                ]);
            }

            DB::commit();

            // Send notification
            NotificationService::createVisitNotification($visit, 'approved');

            SystemLog::create([
                'visit_id' => $visit->id,
                'action' => 'visit_approved',
                'performed_by' => $user->id,
                'metadata' => [
                    'visit_type' => $visit->visit_type->value,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                ],
            ]);

            return back()->with('success', 'Visit schedule approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['approve' => 'Failed to approve visit: ' . $e->getMessage()]);
        }
    }

    /**
     * Reject a visit schedule.
     */
    public function reject(Request $request, Visit $visit): RedirectResponse
    {
        $user = $request->user();
        
        // Verify JO is assigned to this visit
        $isAssigned = $this->isJailOfficerAssignedToVisit($user, $visit);
        if (!$isAssigned && $user->role?->slug !== 'super_admin') {
            abort(403, 'You are not assigned to this visit.');
        }

        // Can only reject pending visits
        if ($visit->status->value !== 'pending') {
            return back()->withErrors(['reject' => 'Only pending visits can be rejected.']);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $visit->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'jail_officer_id' => $user->id,
        ]);

        SystemLog::create([
            'visit_id' => $visit->id,
            'action' => 'visit_rejected',
            'performed_by' => $user->id,
            'metadata' => [
                'reason' => $validated['rejection_reason'],
            ],
        ]);

        // Send notification
        NotificationService::createVisitNotification($visit, 'rejected');

        return back()->with('success', 'Visit schedule rejected.');
    }

    /**
     * Check if jail officer is assigned to visit via scope or direct assignment.
     */
    private function isJailOfficerAssignedToVisit($user, Visit $visit): bool
    {
        // Direct assignment
        if ($visit->jail_officer_id === $user->id) {
            return true;
        }

        // Assignment via scope
        if ($visit->inmate) {
            $scopeIds = $user->jailOfficerScopes()->where('is_active', true);
            
            // Check cell
            if ($visit->inmate->cell && $scopeIds->clone()
                ->where('scope_type', 'cell')
                ->pluck('cell_id')
                ->contains($visit->inmate->cell->id)) {
                return true;
            }

            // Check dormitory
            if ($visit->inmate->cell?->dormitory && $scopeIds->clone()
                ->where('scope_type', 'dormitory')
                ->pluck('dormitory_id')
                ->contains($visit->inmate->cell->dormitory->id)) {
                return true;
            }

            // Check annex (via cell's direct annex or through dormitory)
            if ($visit->inmate->cell) {
                $cellAnnexId = $visit->inmate->cell->annex_id ?? $visit->inmate->cell->dormitory?->annex_id;
                if ($cellAnnexId && $scopeIds->clone()
                    ->where('scope_type', 'annex')
                    ->pluck('annex_id')
                    ->contains($cellAnnexId)) {
                    return true;
                }
            }
        }

        return false;
    }
}
