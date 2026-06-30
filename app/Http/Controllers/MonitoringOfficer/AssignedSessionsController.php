<?php

namespace App\Http\Controllers\MonitoringOfficer;

use App\Events\VisitSessionChatLockChanged;
use App\Http\Controllers\Controller;
use App\Models\InmateTunnel;
use App\Models\SystemLog;
use App\Models\VisitSession;
use App\Services\VideoSdkService;
use App\Services\VisitSessionCompletionService;
use App\Services\VisitSessionRecordingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AssignedSessionsController extends Controller
{
    /**
     * List visit_sessions assigned to the current monitoring officer.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        $query = VisitSession::with(['visit.user', 'eburol.user', 'visit', 'eburol']);
        if (! $isSuperAdmin) {
            $query->where('monitor_id', $user->id);
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
                    'status' => $session->status,
                    'recording_status' => $session->recording_status,
                    'started_at' => $session->started_at?->toIso8601String(),
                    'ended_at' => $session->ended_at?->toIso8601String(),
                    'has_active_tunnel' => $session->inmateTunnels()->where('is_used', false)->where('expires_at', '>', now())->exists(),
                    'has_tunnel' => $session->inmateTunnels()->exists(),
                    'chat_locked' => (bool) $session->chat_locked,
                ];
            });

        return Inertia::render('MonitoringOfficer/AssignedSessions', [
            'sessions' => $sessions,
            'filters' => [
                'type' => $typeFilter ?? 'all',
            ],
            'userRole' => 'monitoring_officer',
        ]);
    }

    /**
     * Generate inmate tunnel (secure link for inmate to join). Monitoring officer only.
     */
    public function generateTunnel(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'super_admin') {
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
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'super_admin') {
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
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'super_admin') {
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

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Session ended.']);
        }

        return redirect()->back()->with('success', 'Session ended.');
    }

    /**
     * Lock chat for the session. Monitor only. Log and broadcast.
     */
    public function lockChat(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'super_admin') {
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

        VisitSessionChatLockChanged::dispatch($session->fresh(), true);

        return response()->json(['ok' => true, 'chat_locked' => true]);
    }

    /**
     * Unlock chat for the session. Monitor only.
     */
    public function unlockChat(Request $request, VisitSession $session): JsonResponse
    {
        $user = $request->user();
        if ($session->monitor_id !== $user->id && $user->role?->slug !== 'super_admin') {
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

        VisitSessionChatLockChanged::dispatch($session->fresh(), false);

        return response()->json(['ok' => true, 'chat_locked' => false]);
    }

    /**
     * Monitoring officer joins the video call as observer (no camera/mic; view-only).
     * Redirects to VideoSDK with viewer token and params to disable webcam/mic.
     */
    public function joinAsObserver(Request $request, VisitSession $session): RedirectResponse|Response
    {
        $user = $request->user();
        $isMonitor = $session->monitor_id === $user->id;
        $isSuperAdmin = $user->role?->slug === 'super_admin';
        if (! $isMonitor && ! $isSuperAdmin) {
            abort(403);
        }
        if ($session->isCompleted()) {
            return redirect()->route('monitoring-officer.assigned-sessions.index')
                ->with('error', 'This session has ended.');
        }
        
        // Check if session time has expired (even if status is still "active")
        if (! $session->isWithinSchedule()) {
            return redirect()->route('monitoring-officer.assigned-sessions.index')
                ->with('error', 'This session has ended. You can only join during the scheduled time.');
        }
        
        if ($session->status !== 'active' && ! $session->isWithinScheduleForTunnel()) {
            return redirect()->route('monitoring-officer.assigned-sessions.index')
                ->with('error', 'You can only join during the scheduled window or when the session is active.');
        }

        $videoSdk = new VideoSdkService;
        $validation = $videoSdk->validateRoom($session->room_id);
        if (! ($validation['success'] ?? false)) {
            return redirect()->route('monitoring-officer.assigned-sessions.index')
                ->with('error', $validation['error'] ?? 'Meeting not found or expired. Please ensure the visit has been approved and the video room is still valid.');
        }

        $participantId = 'monitor-'.$request->user()->id.'-'.$session->id;
        $result = $videoSdk->generateJoinTokenForPrebuiltApp($session->room_id, $participantId, ['allow_join', 'allow_mod'], 120);

        if (! ($result['success'] ?? false) || empty($result['token'])) {
            return redirect()->route('monitoring-officer.assigned-sessions.index')
                ->with('error', 'Unable to generate join link. Please try again.');
        }

        $token = preg_replace('/^Bearer\s+/i', '', (string) $result['token']);
        $token = trim($token);

        // Use embedded VideoRoom for both v1 and v2 to ensure proper token handling
        return view('visitor.video-room', [
            'session'            => $session,
            'room_id'            => $session->room_id,
            'participant_name'   => $request->user()->name ?? 'Monitor',
            'participant_id'     => $participantId,
            'is_observer'        => true,
            'token'              => $token,
        ]);
    }
}
