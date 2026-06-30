<?php

namespace App\Http\Controllers\JailOfficer;

use App\Events\VisitSessionChatLockChanged;
use App\Http\Controllers\Controller;
use App\Models\InmateTunnel;
use App\Models\SessionMediaCommand;
use App\Models\SystemLog;
use App\Models\VisitSession;
use App\Services\AuditLogService;
use App\Services\VideoSdkService;
use App\Services\VisitSessionCompletionService;
use App\Services\VisitSessionRecordingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class AssignedSessionsController extends Controller
{
    /**
     * List visit_sessions assigned to the current jail officer.
     * Shows visits where the inmate is in a cell that matches the JO's assigned scope.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'jail_warden';

        $query = VisitSession::with(['visit.user', 'eburol.user', 'visit.inmate.cell', 'eburol', 'visit']);
        
        if (! $isSuperAdmin) {
            // Filter sessions based on jail officer's assigned scope - use scope resolver
            $authorizedCellIds = $user->getAuthorizedCellIds();
            
            $query->whereHas('visit', function ($q) use ($user, $authorizedCellIds) {
                // Match visits where the inmate's cell falls within the JO's scope
                $q->whereHas('inmate', function ($inmateQuery) use ($authorizedCellIds) {
                    $inmateQuery->whereIn('cell_id', $authorizedCellIds);
                })
                // Fallback: Also include visits explicitly assigned to this JO
                ->orWhere('jail_officer_id', $user->id);
            });
        }

        $typeFilter = $request->input('type'); // 'visit' | 'eburol' | null = all
        if ($typeFilter === 'visit') {
            $query->whereNotNull('visit_id');
        } elseif ($typeFilter === 'eburol') {
            $query->whereNotNull('eburol_id');
        }

        $sessions = $query->orderBy('scheduled_start', 'desc')
            ->get()
            ->map(function (VisitSession $session) {
                $visitor = $session->visit?->user ?? $session->eburol?->user;
                $inmateName = $session->visit
                    ? trim("{$session->visit->inmate_first_name} {$session->visit->inmate_middle_name} {$session->visit->inmate_last_name}")
                    : ($session->eburol
                        ? trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_middle_name} {$session->eburol->inmate_last_name}")
                        : '—');

                $scheduledDate = null;
                $scheduledTime = null;
                $visitType = null;
                if ($session->visit_id && $session->visit) {
                    $scheduledDate = $session->visit->scheduled_date->format('Y-m-d');
                    $scheduledTime = $session->visit->scheduled_time;
                    $visitType = $session->visit->visit_type->value;
                }
                $scheduleEnded = now()->isAfter($session->scheduled_end);

                // Auto-start session if within schedule and not yet started
                $status = $session->status;
                if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
                    // Session should be active if within time window
                    $status = 'active';
                    // Optionally update the database (commented out to avoid unnecessary writes)
                    // $session->update(['status' => 'active', 'started_at' => now()]);
                }

                $tunnel = $session->inmateTunnels()->whereNotNull('short_code')->latest()->first();

                return [
                    'id' => $session->id,
                    'visit_id' => $session->visit_id,
                    'eburol_id' => $session->eburol_id,
                    'room_id' => $session->room_id,
                    'tunnel_short_code' => $tunnel?->short_code,
                    'visitor_name' => $visitor ? trim("{$visitor->first_name} {$visitor->middle_name} {$visitor->last_name}") : null,
                    'inmate_name' => $inmateName,
                    'type' => $session->session_type,
                    'scheduled_start' => $session->scheduled_start->toIso8601String(),
                    'scheduled_end' => $session->scheduled_end->toIso8601String(),
                    'scheduled_date' => $scheduledDate,
                    'scheduled_time' => $scheduledTime,
                    'visit_type' => $visitType,
                    'schedule_ended' => $scheduleEnded,
                    'status' => $status, // Use calculated status
                    'recording_status' => $session->recording_status,
                    'started_at' => $session->started_at?->toIso8601String(),
                    'ended_at' => $session->ended_at?->toIso8601String(),
                    'has_active_tunnel' => $session->inmateTunnels()->where('is_used', false)->where('expires_at', '>', now())->exists(),
                    'has_tunnel' => $session->inmateTunnels()->exists(),
                    'chat_locked' => (bool) $session->chat_locked,
                ];
            });

        // Calculate stats
        $stats = [
            'total_sessions' => $sessions->count(),
            'active_sessions' => $sessions->where('status', 'active')->count(),
            'scheduled_sessions' => $sessions->where('status', 'scheduled')->count(),
            'completed_sessions' => $sessions->whereIn('status', ['completed', 'terminated'])->count(),
            'visit_sessions' => $sessions->where('type', 'visit')->count(),
            'eburol_sessions' => $sessions->where('type', 'eburol')->count(),
        ];

        // Chart data
        $chartData = [
            'sessions_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_sessions']],
                ['status' => 'Scheduled', 'count' => $stats['scheduled_sessions']],
                ['status' => 'Completed', 'count' => $sessions->where('status', 'completed')->count()],
                ['status' => 'Terminated', 'count' => $sessions->where('status', 'terminated')->count()],
            ],
            'sessions_by_type' => [
                ['type' => 'Visits', 'count' => $stats['visit_sessions']],
                ['type' => 'E-Burols', 'count' => $stats['eburol_sessions']],
            ],
        ];

        return Inertia::render('JailOfficer/AssignedSessions', [
            'sessions' => $sessions,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'type' => $typeFilter ?? 'all',
            ],
            'userRole' => 'jail_officer',
        ]);
    }

    /**
     * Generate inmate tunnel (secure link for inmate to join). Monitoring officer only.
     */
    public function generateTunnel(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        if (! $session->isWithinScheduleForTunnel()) {
            return response()->json(['error' => 'Session is not within the scheduled window. You can generate the inmate link from the start of the scheduled date until the session end.'], 422);
        }
        if ($session->isCompleted()) {
            return response()->json(['error' => 'Session has ended.'], 422);
        }

        $token = InmateTunnel::generateToken();
        $shortCode = InmateTunnel::generateShortCode();
        $expiresAt = $session->scheduled_end->copy();

        InmateTunnel::create([
            'visit_session_id' => $session->id,
            'tunnel_token' => $token,
            'short_code' => $shortCode,
            'expires_at' => $expiresAt,
            'is_used' => false,
        ]);

        $url = route('inmate.join', ['token' => $token]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'generate_inmate_tunnel',
            'performed_by' => $request->user()->id,
            'metadata' => ['expires_at' => $expiresAt->toIso8601String(), 'short_code' => $shortCode],
        ]);

        return response()->json(['join_url' => $url, 'token' => $token, 'short_code' => $shortCode]);
    }

    /**
     * Start session (set status active, started_at).
     */
    public function startSession(Request $request, VisitSession $session): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        if ($session->status === 'active') {
            return response()->json(['message' => 'Session already started.'], 200);
        }
        if ($session->isCompleted()) {
            return response()->json(['error' => 'Session has ended.'], 422);
        }
        if (! $session->inmateTunnels()->exists()) {
            return response()->json(['error' => 'An inmate tunnel link must exist before starting the session. Generate an inmate link first or ensure the visit was approved with a tunnel.'], 422);
        }

        $session->update([
            'status' => 'active',
            'started_at' => now(),
        ]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'start_session',
            'performed_by' => $request->user()->id,
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'session_started',
            $session,
            'Session Monitoring',
            null,
            $request
        );

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Session started.']);
        }

        return redirect()->back()->with('success', 'Session started.');
    }

    /**
     * End session (stop recording, set status completed, store duration).
     */
    public function endSession(Request $request, VisitSession $session): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        if ($session->isCompleted()) {
            return response()->json(['message' => 'Session already ended.'], 200);
        }

        $endedAt = now();
        $durationSeconds = null;
        if ($session->started_at) {
            $raw = (int) round($endedAt->diffInSeconds($session->started_at, false));
            $durationSeconds = max(0, $raw);
        }

        if ($session->recording_status === 'recording' && $session->visitor_participant_id) {
            app(VisitSessionRecordingService::class)->stopRecordingAndSave($session, $session->visitor_participant_id);
        }

        $session->update([
            'recording_status' => $session->recording_status === 'recording' ? 'saved' : $session->recording_status,
            'ended_at' => $endedAt,
            'duration_seconds' => $durationSeconds,
        ]);

        app(VisitSessionCompletionService::class)->endSessionWithOutcome(
            $session->fresh(),
            $request->input('reason', 'monitor_ended')
        );

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'end_session',
            'performed_by' => $request->user()->id,
            'metadata' => ['duration_seconds' => $durationSeconds],
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'session_ended',
            $session,
            'Session Monitoring',
            null,
            $request,
            ['duration_seconds' => $durationSeconds]
        );

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Session ended.']);
        }

        return redirect()->back()->with('success', 'Session ended.');
    }

    /**
     * Kill active session immediately (emergency termination).
     */
    public function killSession(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        
        // Calculate actual status (same logic as index method)
        $status = $session->status;
        $scheduleEnded = now()->isAfter($session->scheduled_end);
        if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
            $status = 'active';
        }
        
        if ($status !== 'active') {
            return response()->json(['error' => 'Session is not active.'], 422);
        }

        $endedAt = now();
        $durationSeconds = null;
        if ($session->started_at) {
            $raw = (int) round($endedAt->diffInSeconds($session->started_at, false));
            $durationSeconds = max(0, $raw);
        }

        // Stop recording if active
        if ($session->recording_status === 'recording' && $session->visitor_participant_id) {
            app(VisitSessionRecordingService::class)->stopRecordingAndSave($session, $session->visitor_participant_id);
        }

        $session->update([
            'status' => 'terminated',
            'end_reason' => 'killed_by_monitor',
            'recording_status' => $session->recording_status === 'recording' ? 'saved' : $session->recording_status,
            'ended_at' => $endedAt,
            'duration_seconds' => $durationSeconds,
        ]);

        // Mark tunnel as used
        InmateTunnel::where('visit_session_id', $session->id)->update(['is_used' => true]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'kill_session',
            'performed_by' => $request->user()->id,
            'metadata' => [
                'duration_seconds' => $durationSeconds,
                'reason' => 'killed_by_monitor',
            ],
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'session_killed',
            $session,
            'Session Monitoring',
            null,
            $request,
            [
                'duration_seconds' => $durationSeconds,
                'reason' => 'killed_by_monitor',
            ]
        );

        return response()->json(['message' => 'Session terminated immediately.']);
    }

    /**
     * Mute all participants' audio in the session.
     */
    public function muteAudio(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        
        // Calculate actual status (same logic as index method)
        $status = $session->status;
        $scheduleEnded = now()->isAfter($session->scheduled_end);
        if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
            $status = 'active';
        }
        
        if ($status !== 'active') {
            return response()->json(['error' => 'Session is not active.'], 422);
        }

        // Create media command for polling
        SessionMediaCommand::create([
            'room_id' => $session->room_id,
            'command' => 'mute_audio',
            'issued_by' => $user->id,
        ]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'mute_all_audio',
            'performed_by' => $request->user()->id,
            'metadata' => ['target' => 'all_participants'],
        ]);

        return response()->json(['message' => 'Audio mute command sent to all participants.', 'muted' => true]);
    }

    /**
     * Unmute all participants' audio in the session.
     */
    public function unmuteAudio(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        
        // Calculate actual status (same logic as index method)
        $status = $session->status;
        $scheduleEnded = now()->isAfter($session->scheduled_end);
        if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
            $status = 'active';
        }
        
        if ($status !== 'active') {
            return response()->json(['error' => 'Session is not active.'], 422);
        }

        // Create media command for polling
        SessionMediaCommand::create([
            'room_id' => $session->room_id,
            'command' => 'unmute_audio',
            'issued_by' => $user->id,
        ]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'unmute_all_audio',
            'performed_by' => $request->user()->id,
            'metadata' => ['target' => 'all_participants'],
        ]);

        return response()->json(['message' => 'Audio unmute command sent to all participants.', 'unmuted' => true]);
    }

    /**
     * Disable all participants' cameras in the session.
     */
    public function disableCamera(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        
        // Calculate actual status (same logic as index method)
        $status = $session->status;
        $scheduleEnded = now()->isAfter($session->scheduled_end);
        if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
            $status = 'active';
        }
        
        if ($status !== 'active') {
            return response()->json(['error' => 'Session is not active.'], 422);
        }

        // Create media command for polling
        SessionMediaCommand::create([
            'room_id' => $session->room_id,
            'command' => 'disable_camera',
            'issued_by' => $user->id,
        ]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'disable_all_cameras',
            'performed_by' => $request->user()->id,
            'metadata' => ['target' => 'all_participants'],
        ]);

        return response()->json(['message' => 'Camera disable command sent to all participants.', 'camera_disabled' => true]);
    }

    /**
     * Enable all participants' cameras in the session.
     */
    public function enableCamera(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        
        // Calculate actual status (same logic as index method)
        $status = $session->status;
        $scheduleEnded = now()->isAfter($session->scheduled_end);
        if ($status === 'scheduled' && $session->isWithinSchedule() && !$scheduleEnded) {
            $status = 'active';
        }
        
        if ($status !== 'active') {
            return response()->json(['error' => 'Session is not active.'], 422);
        }

        // Create media command for polling
        SessionMediaCommand::create([
            'room_id' => $session->room_id,
            'command' => 'enable_camera',
            'issued_by' => $user->id,
        ]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'enable_all_cameras',
            'performed_by' => $request->user()->id,
            'metadata' => ['target' => 'all_participants'],
        ]);

        return response()->json(['message' => 'Camera enable command sent to all participants.', 'camera_enabled' => true]);
    }

    /**
     * Lock chat for the session. Monitor only. Log and broadcast.
     */
    public function lockChat(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        if ($session->isCompleted()) {
            return response()->json(['error' => 'Session has ended.'], 422);
        }

        $session->update(['chat_locked' => true]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'lock_chat',
            'performed_by' => $request->user()->id,
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'chat_locked',
            $session,
            'Session Monitoring',
            null,
            $request
        );

        VisitSessionChatLockChanged::dispatch($session->fresh(), true);

        return response()->json(['ok' => true, 'chat_locked' => true]);
    }

    /**
     * Unlock chat for the session. Monitor only.
     */
    public function unlockChat(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'jail_warden') {
            abort(403);
        }
        if ($session->isCompleted()) {
            return response()->json(['error' => 'Session has ended.'], 422);
        }

        $session->update(['chat_locked' => false]);

        SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'unlock_chat',
            'performed_by' => $request->user()->id,
        ]);

        // Log to audit log
        AuditLogService::logAction(
            'chat_unlocked',
            $session,
            'Session Monitoring',
            null,
            $request
        );

        VisitSessionChatLockChanged::dispatch($session->fresh(), false);

        return response()->json(['ok' => true, 'chat_locked' => false]);
    }

    /**
     * Jail officer joins the video call as observer (no camera/mic; view-only).
     * Renders embedded VideoSDK room for both v1 and v2.
     */
    public function joinAsObserver(Request $request, VisitSession $session): RedirectResponse|View
    {
        $user = $request->user();
        // Load visit relationship to check jail_officer_id
        $session->load(['visit']);

        // Debug logging
        \Illuminate\Support\Facades\Log::debug('Jail Officer joinAsObserver check', [
            'user_id' => $user->id,
            'session_id' => $session->id,
            'visit_id' => $session->visit_id,
            'has_visit' => $session->visit !== null,
            'visit_jail_officer_id' => $session->visit?->jail_officer_id,
            'user_role' => $user->role?->slug,
        ]);

        // Jail officers can join as observers if they are assigned to the visit
        $isAssignedOfficer = $session->visit && $session->visit->jail_officer_id === $user->id;
        $isSuperAdmin = $user->role?->slug === 'jail_warden';
        if (! $isAssignedOfficer && ! $isSuperAdmin) {
            abort(403, 'You are not assigned to this visit. Only the assigned jail officer can join as observer.');
        }
        if ($session->isCompleted()) {
            return redirect()->route('jail-officer.assigned-sessions.index')
                ->with('error', 'This session has ended.');
        }
        
        // Check if session time has expired (even if status is still "active")
        if (! $session->isWithinSchedule()) {
            return redirect()->route('jail-officer.assigned-sessions.index')
                ->with('error', 'This session has ended. You can only join during the scheduled time.');
        }
        
        if ($session->status !== 'active' && ! $session->isWithinScheduleForTunnel()) {
            return redirect()->route('jail-officer.assigned-sessions.index')
                ->with('error', 'You can only join during the scheduled window or when the session is active.');
        }

        $videoSdk = new VideoSdkService;
        $validation = $videoSdk->validateRoom($session->room_id);
        if (! ($validation['success'] ?? false)) {
            return redirect()->route('jail-officer.assigned-sessions.index')
                ->with('error', $validation['error'] ?? 'Meeting not found or expired. Please ensure the visit has been approved and the video room is still valid.');
        }

        $participantId = 'jail-officer-'.$request->user()->id.'-'.$session->id;

        // Generate token like VideoRoomController does
        $videoSdk = new VideoSdkService;
        $result = $videoSdk->generateJoinTokenForPrebuiltApp($session->room_id, $participantId, ['allow_join', 'allow_mod'], 120);
        
        if (! ($result['success'] ?? false) || empty($result['token'])) {
            return redirect()->route('jail-officer.assigned-sessions.index')
                ->with('error', 'Failed to generate video room token.');
        }
        
        $token = preg_replace('/^Bearer\s+/i', '', (string) $result['token']);
        $token = trim($token);

        return view('visitor.video-room', [
            'session'            => $session,
            'room_id'            => $session->room_id,
            'participant_name'   => $request->user()->name ?? 'Jail Officer',
            'participant_id'     => $participantId,
            'is_observer'        => true,
            'scheduled_end'      => $session->scheduled_end?->format('Y-m-d H:i:s'),
            'token'              => $token,
        ]);
    }
}
