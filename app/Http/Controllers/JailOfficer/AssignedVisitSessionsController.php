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

        $visits = $visitsQuery->orderBy('created_at', 'desc')
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('scheduled_time', 'desc')
            ->paginate(20);

        // Fetch all visits in a broader timeframe or recent/upcoming for calendar and timetable quick-view
        $scheduleVisits = (clone $visitsQuery)
            ->whereBetween('scheduled_date', [
                now()->subMonths(2)->startOfMonth()->toDateString(),
                now()->addMonths(4)->endOfMonth()->toDateString(),
            ])
            ->orderBy('scheduled_date', 'asc')
            ->orderBy('scheduled_time', 'asc')
            ->get();

        // Scope summary for top bar
        $authorizedBuildingIds = $user->getAuthorizedBuildingIds();
        $authorizedDormitoryIds = $user->getAuthorizedDormitoryIds();
        $scopeSummary = [
            'total_dormitories' => count($authorizedDormitoryIds),
            'total_buildings' => count($authorizedBuildingIds),
            'total_cells' => count($authorizedCellIds),
        ];

        // Map helper for visits
        $mapVisit = function ($visit) {
            $relationshipProofPath = $visit->relationship_proof_path;
            $additionalProofPath = $visit->additional_proof_path;

            if (!$relationshipProofPath || !$additionalProofPath) {
                // Find previous proof for this visitor and inmate
                $previousVisit = Visit::where('user_id', $visit->user_id)
                    ->where('inmate_id', $visit->inmate_id)
                    ->where('id', '<', $visit->id)
                    ->where(function ($q) {
                        $q->whereNotNull('relationship_proof_path')
                          ->orWhereNotNull('additional_proof_path');
                    })
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($previousVisit) {
                    $relationshipProofPath = $relationshipProofPath ?: $previousVisit->relationship_proof_path;
                    $additionalProofPath = $additionalProofPath ?: $previousVisit->additional_proof_path;
                }
            }

            return [
                'id' => $visit->id,
                'reference_number' => 'V-' . ($visit->created_at ? $visit->created_at->format('Y') : date('Y')) . '-' . str_pad((string)$visit->id, 6, '0', STR_PAD_LEFT),
                'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
                'visitor_email' => $visit->user->email,
                'relationship_to_inmate' => $visit->relationship_to_inmate ?? 'Family / Relative',
                'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                'inmate_number' => $visit->inmate?->inmate_number ?? ('BJMP-' . str_pad((string)($visit->inmate_id ?? $visit->id), 5, '0', STR_PAD_LEFT)),
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
                'relationship_proof_path' => $relationshipProofPath,
                'additional_proof_path' => $additionalProofPath,
                'notes' => $visit->notes,
            ];
        };

        $visitsData = $visits->map($mapVisit);
        $scheduleVisitsData = $scheduleVisits->map($mapVisit);

        // Calculate stats
        $stats = [
            'total_visits' => $visits->total(),
            'pending_visits' => (clone $visitsQuery)->where('status', 'pending')->count(),
            'approved_visits' => (clone $visitsQuery)->where('status', 'approved')->count(),
            'rejected_visits' => (clone $visitsQuery)->where('status', 'rejected')->count(),
            'completed_visits' => (clone $visitsQuery)->where('status', 'completed')->count(),
            'virtual_visits' => (clone $visitsQuery)->where('visit_type', 'virtual')->count(),
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
                ['type' => 'Physical', 'count' => (clone $visitsQuery)->where('visit_type', 'physical')->count()],
            ],
        ];

        return Inertia::render('JailOfficer/AssignedVisitSessions', [
            'visits' => $visitsData,
            'scheduleVisits' => $scheduleVisitsData,
            'stats' => $stats,
            'chartData' => $chartData,
            'scopeSummary' => $scopeSummary,
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
     * Display TV queue monitor for PDLs and Officers (both virtual and physical visits).
     */
    public function queueTv(Request $request): Response
    {
        $queueData = $this->getTodayQueueData($request);

        return Inertia::render('JailOfficer/VisitQueueTv', $queueData);
    }

    /**
     * API endpoint for TV queue auto-refresh.
     */
    public function queueData(Request $request)
    {
        return response()->json($this->getTodayQueueData($request));
    }

    /**
     * API endpoint for quick header calendar events & sessions.
     */
    public function quickCalendarEvents(Request $request)
    {
        $user = $request->user();
        $authorizedCellIds = $user->getAuthorizedCellIds();

        // Range of -2 months to +3 months
        $startDate = now()->subMonths(2)->startOfMonth()->toDateString();
        $endDate = now()->addMonths(3)->endOfMonth()->toDateString();

        $visits = Visit::with(['user', 'inmate.cell.dormitory'])
            ->where(function ($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function ($inmateQuery) use ($authorizedCellIds) {
                      $inmateQuery->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->whereBetween('scheduled_date', [$startDate, $endDate])
            ->orderBy('scheduled_date', 'asc')
            ->orderBy('scheduled_time', 'asc')
            ->get()
            ->map(function ($v) {
                return [
                    'id' => $v->id,
                    'type' => 'visit',
                    'visit_type' => $v->visit_type->value ?? $v->visit_type,
                    'title' => ($v->visit_type->value ?? $v->visit_type) === 'virtual' ? 'Virtual Visit' : 'Physical Visit',
                    'date' => $v->scheduled_date->format('Y-m-d'),
                    'time' => $v->scheduled_time,
                    'status' => $v->status->value ?? $v->status,
                    'visitor_name' => trim("{$v->user->first_name} {$v->user->last_name}"),
                    'pdl_name' => trim("{$v->inmate_first_name} {$v->inmate_last_name}"),
                    'cell' => $v->inmate?->cell?->cell_number ?? null,
                ];
            });

        // Also fetch any e-burol sessions
        $eburols = \App\Models\Eburol::with('user')
            ->where(function ($q) use ($user) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereNull('jail_officer_id');
            })
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('wake_start_date', [$startDate, $endDate])
                  ->orWhereBetween('wake_end_date', [$startDate, $endDate]);
            })
            ->get()
            ->map(function ($eb) {
                return [
                    'id' => $eb->id,
                    'type' => 'eburol',
                    'visit_type' => 'eburol',
                    'title' => 'e-Burol Wake',
                    'date' => $eb->wake_start_date ? $eb->wake_start_date->format('Y-m-d') : now()->toDateString(),
                    'time' => $eb->preferred_time ?? '09:00 AM',
                    'status' => $eb->status->value ?? $eb->status,
                    'visitor_name' => trim("{$eb->user?->first_name} {$eb->user?->last_name}"),
                    'pdl_name' => trim("{$eb->inmate_first_name} {$eb->inmate_last_name}"),
                    'deceased_name' => trim("{$eb->deceased_first_name} {$eb->deceased_last_name}"),
                    'cell' => null,
                ];
            });

        return response()->json([
            'events' => $visits->concat($eburols),
        ]);
    }

    /**
     * Helper to compute today's visit queue grouped into ongoing, next in line, and upcoming.
     */
    private function getTodayQueueData(Request $request): array
    {
        $user = $request->user();
        $authorizedCellIds = $user->getAuthorizedCellIds();

        $todayDate = now()->toDateString();

        // Get all approved (or active/completed) visits for today assigned to this JO
        $visits = Visit::with(['user', 'inmate.cell.building', 'inmate.cell.dormitory', 'jailOfficer', 'visitSessions'])
            ->where(function ($q) use ($user, $authorizedCellIds) {
                $q->where('jail_officer_id', $user->id)
                  ->orWhereHas('inmate', function ($inmateQuery) use ($authorizedCellIds) {
                      $inmateQuery->whereIn('cell_id', $authorizedCellIds);
                  });
            })
            ->whereDate('scheduled_date', $todayDate)
            ->whereIn('status', ['approved', 'completed'])
            ->orderBy('scheduled_time', 'asc')
            ->get();

        $queueItems = $visits->map(function ($visit) {
            $hasActiveSession = $visit->visitSessions->where('status', 'active')->isNotEmpty();
            $isCompleted = $visit->status->value === 'completed' || $visit->visitSessions->where('status', 'completed')->isNotEmpty();

            // Determine queue status
            $queueStatus = 'upcoming';
            if ($hasActiveSession) {
                $queueStatus = 'ongoing';
            } elseif ($isCompleted) {
                $queueStatus = 'completed';
            }

            return [
                'id' => $visit->id,
                'queue_number' => 'V-' . str_pad($visit->id, 4, '0', STR_PAD_LEFT),
                'pdl_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
                'relationship' => $visit->relationship_to_inmate,
                'cell_number' => $visit->inmate?->cell?->cell_number ?? 'Cell N/A',
                'floor' => $visit->inmate?->cell?->floor ?? null,
                'dormitory_name' => $visit->inmate?->cell?->dormitory?->name ?? 'Dormitory',
                'scheduled_time' => $visit->scheduled_time ?? '00:00',
                'visit_type' => $visit->visit_type->value, // virtual or physical
                'status' => $visit->status->value,
                'queue_status' => $queueStatus,
                'tunnel_code' => $visit->inmate_token,
                'access_key' => $visit->access_key,
                'room_id' => $visit->daily_co_room_id,
            ];
        });

        // Split into Ongoing, Up Next (Top upcoming), and Upcoming queue
        $ongoing = $queueItems->where('queue_status', 'ongoing')->values();
        $pendingOrApproved = $queueItems->whereIn('queue_status', ['upcoming'])->values();

        // Separate virtual vs physical for specialized split counters
        $virtualQueue = $queueItems->where('visit_type', 'virtual')->values();
        $physicalQueue = $queueItems->where('visit_type', 'physical')->values();

        // Up next are the first 3-5 upcoming items
        $upNext = $pendingOrApproved->take(3)->values();
        $restQueue = $pendingOrApproved->slice(3)->values();

        return [
            'jail_name' => $user->jail?->name ?? 'BJMP Facility Detention Center',
            'today_date' => now()->format('l, F j, Y'),
            'current_time' => now()->format('H:i:s'),
            'total_today' => $queueItems->count(),
            'total_virtual' => $virtualQueue->count(),
            'total_physical' => $physicalQueue->count(),
            'total_ongoing' => $ongoing->count(),
            'total_waiting' => $pendingOrApproved->count(),
            'total_completed' => $queueItems->where('queue_status', 'completed')->count(),
            'ongoing' => $ongoing,
            'up_next' => $upNext,
            'upcoming' => $restQueue,
            'all_queue' => $queueItems,
        ];
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

        // Assignment via authorized cells (same logic as index query)
        $authorizedCellIds = $user->getAuthorizedCellIds();
        if ($visit->inmate && in_array($visit->inmate->cell_id, $authorizedCellIds)) {
            \Log::info('[AssignCheck] Matched via authorized cell IDs', [
                'cell_id' => $visit->inmate->cell_id,
            ]);
            return true;
        }

        // Fallback scope checks
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

            // Check building/annex (via dormitory's annex)
            if ($visit->inmate->cell) {
                $cellAnnexId = $visit->inmate->cell->dormitory?->annex_id;
                if ($cellAnnexId && $scopeIds->clone()
                    ->whereIn('scope_type', ['building', 'annex'])
                    ->pluck('building_id')
                    ->contains($cellAnnexId)) {
                    return true;
                }
            }
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
