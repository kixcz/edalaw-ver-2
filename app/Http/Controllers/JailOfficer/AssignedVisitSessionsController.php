<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\InmateTunnel;
use App\Models\SystemLog;
use App\Models\Visit;
use App\Models\VisitSession;
use App\Services\AuditLogService;
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

        // Get JO's active scope IDs - use scope resolver service
        $authorizedCellIds = $user->getAuthorizedCellIds();

        // Get all visits assigned to this JO based on scope OR direct assignment
        $visitsQuery = Visit::with(['user', 'inmate.cell.building', 'inmate.cell.dormitory', 'jailOfficer'])
            ->where(function ($q) use ($user, $authorizedCellIds) {
                // Direct assignment by jail_officer_id
                $q->where('jail_officer_id', $user->id)
                  // OR inmate is in one of the cells assigned to JO
                  ->orWhereHas('inmate', function ($inmateQuery) use ($authorizedCellIds) {
                      $inmateQuery->whereIn('cell_id', $authorizedCellIds);
                  });
            });

        // DEBUG: Check raw SQL
        $sql = $visitsQuery->toSql();
        $bindings = $visitsQuery->getBindings();
        \Log::info('Visit Query SQL', ['sql' => $sql, 'bindings' => $bindings]);
        
        // DEBUG: Check visits without the inmate filter
        $directVisits = Visit::where('jail_officer_id', $user->id)->count();
        $cellVisits = Visit::whereHas('inmate', function ($q) use ($authorizedCellIds) {
            $q->whereIn('cell_id', $authorizedCellIds);
        })->count();
        \Log::info('Visit counts', [
            'direct_assignment' => $directVisits,
            'via_cell_scope' => $cellVisits,
            'cell_ids' => $authorizedCellIds,
        ]);

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

        // DEBUG: Log query results
        \Log::info('Jail Officer Visit Sessions Query', [
            'user_id' => $user->id,
            'cell_ids' => $authorizedCellIds,
            'total_visits' => $visits->total(),
            'current_page_visits' => $visits->count(),
        ]);

        // Transform visits for frontend
        $visitsData = $visits->map(function ($visit) {
            $data = [
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
                'relationship_proof_path' => $visit->relationship_proof_path,
                'additional_proof_path' => $visit->additional_proof_path,
                'notes' => $visit->notes,
            ];
            
            \Log::info('Visit transformed', ['visit_id' => $visit->id, 'data' => $data]);
            
            return $data;
        });

        // Calculate stats
        $stats = [
            'total_visits' => $visits->total(),
            'pending_visits' => $visits->where('status.value', 'pending')->count(),
            'approved_visits' => $visits->where('status.value', 'approved')->count(),
            'rejected_visits' => $visits->where('status.value', 'rejected')->count(),
            'completed_visits' => $visits->where('status.value', 'completed')->count(),
            'virtual_visits' => $visits->where('visit_type.value', 'virtual')->count(),
        ];

        // Chart data
        $chartData = [
            'visits_by_status' => [
                ['status' => 'Pending', 'count' => $stats['pending_visits']],
                ['status' => 'Approved', 'count' => $stats['approved_visits']],
                ['status' => 'Completed', 'count' => $stats['completed_visits']],
                ['status' => 'Rejected', 'count' => $stats['rejected_visits']],
            ],
            'visits_by_type' => [
                ['type' => 'Virtual', 'count' => $stats['virtual_visits']],
                ['type' => 'Physical', 'count' => $visits->where('visit_type.value', 'physical')->count()],
            ],
        ];

        return Inertia::render('JailOfficer/AssignedVisitSessions', [
            'visits' => $visitsData,
            'stats' => $stats,
            'chartData' => $chartData,
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
        
        // Load required relationships for assignment check
        $visit->load(['inmate.cell.dormitory']);
        
        \Log::info('[Approve] Starting approval process', [
            'visit_id' => $visit->id,
            'visit_type' => $visit->visit_type->value,
            'current_status' => $visit->status->value,
            'jail_officer_id' => $visit->jail_officer_id,
            'inmate_id' => $visit->inmate_id,
            'cell_id' => $visit->inmate?->cell_id,
        ]);
        
        // Verify JO is assigned to this visit (via scope or direct assignment)
        $isAssigned = $this->isJailOfficerAssignedToVisit($user, $visit);
        
        \Log::info('[Approve] Assignment check result', [
            'is_assigned' => $isAssigned,
            'user_id' => $user->id,
            'user_role' => $user->role?->slug,
        ]);
        
        if (!$isAssigned && $user->role?->slug !== 'super_admin') {
            \Log::error('[Approve] User not assigned to visit', ['user_id' => $user->id]);
            abort(403, 'You are not assigned to this visit.');
        }

        // Can only approve pending visits
        if ($visit->status->value !== 'pending') {
            \Log::error('[Approve] Visit not pending', ['status' => $visit->status->value]);
            return back()->withErrors(['approve' => 'Only pending visits can be approved.']);
        }

        // Check if schedule has passed
        if ($visit->isScheduleInPast()) {
            \Log::error('[Approve] Schedule in past');
            return back()->withErrors(['approve' => 'This schedule has passed and cannot be approved.']);
        }

        DB::beginTransaction();
        try {
            // Update visit status
            \Log::info('[Approve] Updating visit status to approved');
            $visit->update([
                'status' => 'approved',
                'jail_officer_id' => $user->id,
                'notes' => $request->input('notes'),
            ]);
            
            \Log::info('[Approve] Visit status updated', ['new_status' => $visit->fresh()->status->value]);

            // If virtual visit, create VideoSDK room and session
            if ($visit->visit_type === VisitType::Virtual && !$visit->daily_co_room_id) {
                $videoSdk = new VideoSdkService;
                
                // Generate participant IDs
                $visitorParticipantId = 'visitor-' . $visit->user->id . '-' . $visit->id;
                $inmateParticipantId = 'inmate-' . $visit->inmate_id . '-' . $visit->id;
                $monitorParticipantId = 'monitor-' . $user->id . '-' . $visit->id;

                // Create room
                $roomResult = $videoSdk->createRoom(
                    "Visit #{$visit->id} - {$visit->user->last_name}",
                    [
                        'scheduled_start' => $visit->scheduled_date->format('Y-m-d') . ' ' . $visit->scheduled_time,
                        'scheduled_end' => $visit->scheduled_date->copy()->addMinutes(10)->format('Y-m-d H:i'),
                    ]
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
                // scheduled_date is already a Carbon instance, so we need to extract just the date part
                $dateString = $visit->scheduled_date->format('Y-m-d');
                $scheduledStart = \Carbon\Carbon::parse($dateString . ' ' . $visit->scheduled_time);
                
                // Get duration from TimeSlotCapacity (same as VisitSessionService)
                $durationMinutes = $this->getDurationForTime($scheduledStart, $visit->visit_type->value);
                $scheduledEnd = $scheduledStart->copy()->addMinutes($durationMinutes);
                
                \Log::info('[Approve] Creating VisitSession', [
                    'visit_id' => $visit->id,
                    'date_string' => $dateString,
                    'scheduled_time' => $visit->scheduled_time,
                    'scheduled_start' => $scheduledStart->toDateTimeString(),
                    'scheduled_end' => $scheduledEnd->toDateTimeString(),
                ]);
                
                $visitSession = VisitSession::create([
                    'visit_id' => $visit->id,
                    'room_id' => $roomId,
                    'scheduled_start' => $scheduledStart,
                    'scheduled_end' => $scheduledEnd,
                    'status' => 'scheduled',
                    'recording_status' => 'not_recording',
                    'chat_locked' => false,
                    'monitor_id' => $user->id,
                ]);
                
                \Log::info('[Approve] VisitSession created', ['session_id' => $visitSession->id]);

                // Generate inmate tunnel - use the newly created session directly
                $tunnel = InmateTunnel::create([
                    'visit_session_id' => $visitSession->id,
                    'tunnel_token' => InmateTunnel::generateToken(),
                    'short_code' => InmateTunnel::generateShortCode(),
                    'expires_at' => $scheduledEnd,
                    'is_used' => false,
                ]);
                
                \Log::info('[Approve] InmateTunnel created', ['tunnel_id' => $tunnel->id]);
            }

            DB::commit();
            
            \Log::info('[Approve] Transaction committed successfully', ['visit_id' => $visit->id]);

            // Reload the visit to get the updated status
            $visit->refresh();
            
            \Log::info('[Approve] Visit reloaded', [
                'visit_id' => $visit->id,
                'status' => $visit->status->value,
                'jail_officer_id' => $visit->jail_officer_id,
            ]);

            // Send notification
            NotificationService::createVisitNotification($visit, 'approved');

            // Log to system log
            SystemLog::create([
                'visit_id' => $visit->id,
                'action' => 'visit_approved',
                'performed_by' => $user->id,
                'metadata' => [
                    'visit_type' => $visit->visit_type->value,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                ],
            ]);

            // Log to audit log
            AuditLogService::logAction(
                'visit_approved',
                $visit,
                'Visit Management',
                null,
                $request,
                [
                    'visit_type' => $visit->visit_type->value,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                    'scheduled_time' => $visit->scheduled_time,
                ]
            );

            return back()->with('success', 'Visit schedule approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('[Approve] Failed to approve visit', [
                'visit_id' => $visit->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->withErrors(['approve' => 'Failed to approve visit: ' . $e->getMessage()]);
        }
    }

    /**
     * Reject a visit schedule.
     */
    public function reject(Request $request, Visit $visit): RedirectResponse
    {
        $user = $request->user();
        
        // Load required relationships for assignment check
        $visit->load(['inmate.cell.dormitory']);
        
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

        // Log to system log
        SystemLog::create([
            'visit_id' => $visit->id,
            'action' => 'visit_rejected',
            'performed_by' => $user->id,
            'metadata' => [
                'reason' => $validated['rejection_reason'],
            ],
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'visit_rejected',
            $visit,
            'Visit Management',
            null,
            $request,
            [
                'rejection_reason' => $validated['rejection_reason'],
            ]
        );

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
            \Log::info('[AssignCheck] Direct assignment match', ['jail_officer_id' => $visit->jail_officer_id]);
            return true;
        }

        // Assignment via scope
        if ($visit->inmate) {
            $scopeIds = $user->jailOfficerScopes()->where('is_active', true);
            
            \Log::info('[AssignCheck] Checking scope-based assignment', [
                'inmate_id' => $visit->inmate->id,
                'cell_id' => $visit->inmate->cell_id,
                'has_cell' => !is_null($visit->inmate->cell),
                'cell_relationship_loaded' => $visit->relationLoaded('inmate.cell'),
            ]);
            
            // Check cell
            if ($visit->inmate->cell && $scopeIds->clone()
                ->where('scope_type', 'cell')
                ->pluck('cell_id')
                ->contains($visit->inmate->cell->id)) {
                \Log::info('[AssignCheck] Matched via cell scope', [
                    'cell_id' => $visit->inmate->cell->id,
                ]);
                return true;
            }

            // Check dormitory
            if ($visit->inmate->cell?->dormitory && $scopeIds->clone()
                ->where('scope_type', 'dormitory')
                ->pluck('dormitory_id')
                ->contains($visit->inmate->cell->dormitory->id)) {
                \Log::info('[AssignCheck] Matched via dormitory scope', [
                    'dormitory_id' => $visit->inmate->cell->dormitory->id,
                ]);
                return true;
            }

            // Check building/annex (via dormitory's annex)
            if ($visit->inmate->cell) {
                // Cell -> Dormitory -> Annex (cells don't have direct annex_id)
                $cellAnnexId = $visit->inmate->cell->dormitory?->annex_id;
                \Log::info('[AssignCheck] Checking annex scope', [
                    'dormitory_annex_id' => $cellAnnexId,
                    'cell_id' => $visit->inmate->cell->id,
                    'dormitory_id' => $visit->inmate->cell->dormitory_id,
                ]);
                
                if ($cellAnnexId && $scopeIds->clone()
                    ->whereIn('scope_type', ['building', 'annex'])
                    ->pluck('building_id')
                    ->contains($cellAnnexId)) {
                    \Log::info('[AssignCheck] Matched via annex scope', [
                        'annex_id' => $cellAnnexId,
                    ]);
                    return true;
                }
            }
        } else {
            \Log::warning('[AssignCheck] Visit has no inmate', ['visit_id' => $visit->id]);
        }

        \Log::info('[AssignCheck] No assignment found', ['visit_id' => $visit->id]);
        return false;
    }

    /**
     * Get duration minutes for a given time based on TimeSlotCapacity settings.
     */
    private function getDurationForTime(\Carbon\Carbon $scheduledStart, string $visitType): int
    {
        // Find the TimeSlotCapacity record that matches this time
        $timeSlot = $scheduledStart->format('H:i');
        
        $capacity = \App\Models\TimeSlotCapacity::where('visit_type', $visitType)
            ->where('time_slot', '<=', $timeSlot)
            ->orderBy('time_slot', 'desc')
            ->first();
        
        // If no specific capacity found, get default from first record or use fallback
        if (! $capacity) {
            $capacity = \App\Models\TimeSlotCapacity::where('visit_type', $visitType)->first();
        }
        
        return $capacity?->duration_minutes ?? ($visitType === 'virtual' ? 20 : 30);
    }
}
