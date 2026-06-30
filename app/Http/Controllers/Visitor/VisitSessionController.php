<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\VisitSession;
use App\Services\VideoSdkService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VisitSessionController extends Controller
{
    /**
     * Show the visit session page with join information.
     */
    public function show(Request $request, VisitSession $session)
    {
        $user = $request->user();
        
        // Determine session type and inmate name
        $sessionType = $session->visit_id ? 'visit' : 'eburol';
        $inmateName = $session->inmateTunnels()->first()?->inmate?->name ?? 'Unknown Inmate';
        
        // Check if user can join now (within schedule and session is active)
        $canJoinNow = $session->isWithinSchedule() && ! $session->isCompleted();
        
        // Check if consent has been accepted
        $consentAccepted = $session->session_consent_accepted ?? false;
        
        // Prepare schedule reminder if session hasn't started yet
        $scheduleReminder = null;
        if (! $canJoinNow && ! $session->isCompleted()) {
            $now = now();
            $scheduledStart = $session->scheduled_start;
            $hoursUntilStart = max(0, floor($scheduledStart->diffInSeconds($now) / 3600));
            $minutesUntilStart = max(0, floor($scheduledStart->diffInSeconds($now) / 60)) % 60;
            
            $scheduleReminder = [
                'scheduled_start' => $scheduledStart->toIso8601String(),
                'scheduled_end' => $session->scheduled_end->toIso8601String(),
                'scheduled_label' => $scheduledStart->format('M d, Y g:i A'),
                'minutes_until_start' => $minutesUntilStart,
                'hours_until_start' => $hoursUntilStart,
            ];
        }
        
        // Generate join URL if session is available
        $joinUrl = null;
        if ($canJoinNow) {
            $videoSdk = new VideoSdkService();
            $participantId = 'user_' . $user->id;
            $tokenResult = $videoSdk->generateParticipantToken($session->room_id, $participantId);
            
            if ($tokenResult['success']) {
                // Always use local video-room route which handles both v1 and v2
                $joinUrl = route('visit-session.video-room', $session);
            }
        }
        
        return view('visitor.visit-session', [
            'session' => [
                'id' => $session->id,
                'room_id' => $session->room_id,
                'token' => null,
                'participant_id' => 'user_' . $user->id,
                'session_type' => $sessionType,
                'inmate_name' => $inmateName,
                'schedule_reminder' => $scheduleReminder,
                'can_join_now' => $canJoinNow,
                'consent_accepted' => $consentAccepted,
                'join_url' => $joinUrl,
            ],
        ]);
    }

    /**
     * Mark terms as accepted for the session.
     */
    public function acceptTerms(Request $request, VisitSession $session)
    {
        // mark terms as accepted
        $session->terms_accepted = true;
        $session->terms_accepted_at = now();
        $session->save();

        // Return URL for opening in new tab
        $videoRoomUrl = route('visit-session.video-room', $session);
        
        // Always return JSON so frontend can open in new tab
        return response()->json([
            'success' => true,
            'video_room_url' => $videoRoomUrl,
        ]);
    }

    /**
     * Accept session consent for video call monitoring.
     */
    public function acceptSessionConsent(Request $request, VisitSession $session)
    {
        $session->session_consent_accepted = true;
        $session->session_consent_timestamp = now();
        $session->save();

        return response()->json([
            'success' => true,
            'message' => 'Consent accepted successfully',
        ]);
    }

    public function videoRoom(Request $request, VisitSession $session)
    {
        $user = $request->user();
        $videoSdk = new VideoSdkService();

        // Validate the room exists
        $validation = $videoSdk->validateRoom($session->room_id);
        if (!$validation['success']) {
            Log::warning('VideoSDK room validation failed', [
                'room_id' => $session->room_id,
                'error' => $validation['error'] ?? 'Unknown error',
                'is_v2' => $videoSdk->isV2Rooms(),
            ]);
            
            return redirect()->route('visit-session.show', $session)
                ->withErrors(['session' => 'The video room is expired or unavailable. Room ID: '.$session->room_id]);
        }

        // Generate participant JWT (v2)
        $participantId = 'user_' . $user->id;
        $tokenResult = $videoSdk->generateParticipantToken($session->room_id, $participantId);

        if (!$tokenResult['success']) {
            abort(500, 'Failed to generate VideoSDK token: ' . ($tokenResult['error'] ?? 'Unknown'));
        }

        // Redirect to video room page with embedded SDK
        return view('visitor.video-room', [
            'session'            => $session,
            'room_id'            => $session->room_id,
            'participant_name'   => $user->name,
            'participant_id'     => $participantId,
            'is_observer'        => false,
            'scheduled_end'      => $session->scheduled_end?->format('Y-m-d H:i:s'),
            'token'              => $tokenResult['token'],
        ]);
    }

    /**
     * Mark participant as joined (called from frontend).
     */
    public function participantJoined(Request $request, VisitSession $session)
    {
        $request->validate([
            'participant_id' => ['required', 'string'],
        ]);

        // Update visitor joined timestamp
        $session->update([
            'visitor_joined_at' => $session->visitor_joined_at ?? now(),
            'visitor_participant_id' => $request->participant_id,
        ]);

        // Log participant entrance
        \App\Models\SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'participant_joined',
            'performed_by' => auth()->id(),
            'metadata' => [
                'participant_id' => $request->participant_id,
                'joined_at' => now()->toIso8601String(),
                'user_name' => auth()->user()?->name,
            ],
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Mark participant as left (called from frontend).
     */
    public function participantLeft(Request $request, VisitSession $session)
    {
        $request->validate([
            'participant_id' => ['required', 'string'],
            'left_at' => ['nullable', 'string'],
        ]);

        // Log participant exit
        \App\Models\SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'participant_left',
            'performed_by' => auth()->id(),
            'metadata' => [
                'participant_id' => $request->participant_id,
                'left_at' => $request->left_at ?? now()->toIso8601String(),
                'user_name' => auth()->user()?->name,
            ],
        ]);

        // Calculate and save duration if this is the last participant
        $this->calculateAndSaveDuration($session);

        return response()->json(['success' => true]);
    }

    /**
     * Handle session ended due to time limit.
     */
    public function timeEnded(Request $request, VisitSession $session)
    {
        // Update session status
        $session->update([
            'status' => 'completed',
            'ended_at' => now(),
            'end_reason' => 'time_limit_reached',
        ]);

        // Calculate and save duration
        $this->calculateAndSaveDuration($session);

        // Log session end
        \App\Models\SystemLog::create([
            'visit_session_id' => $session->id,
            'action' => 'session_time_ended',
            'performed_by' => null,
            'metadata' => [
                'ended_at' => now()->toIso8601String(),
                'reason' => 'Scheduled time limit reached',
            ],
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Calculate and save session duration.
     */
    private function calculateAndSaveDuration(VisitSession $session)
    {
        $startedAt = $session->visitor_joined_at ?? $session->started_at;
        $endedAt = $session->ended_at ?? now();

        if ($startedAt) {
            $durationSeconds = $startedAt->diffInSeconds($endedAt);
            
            $session->update([
                'duration_seconds' => $durationSeconds,
                'ended_at' => $endedAt,
                'status' => $session->status !== 'terminated' ? 'completed' : $session->status,
            ]);

            // Also update video recording if exists
            $recording = \App\Models\VideoRecording::where('visit_session_id', $session->id)->first();
            if ($recording && !$recording->duration_seconds) {
                $recording->update([
                    'duration_seconds' => $durationSeconds,
                    'ended_at' => $endedAt,
                ]);
            }
        }
    }

    /**
     * Save VideoSDK session_id to visit_sessions table.
     */
    public function saveSessionId(Request $request)
    {
        $validated = $request->validate([
            'session_id' => ['required', 'string'],
            'room_id' => ['required', 'string'],
        ]);

        // Find the visit_session by room_id
        $visitSession = \App\Models\VisitSession::where('room_id', $validated['room_id'])
            ->latest('id')
            ->first();

        if ($visitSession) {
            $visitSession->update([
                'session_id' => $validated['session_id'],
            ]);

            \Log::info('✅ Session ID saved', [
                'visit_session_id' => $visitSession->id,
                'session_id' => $validated['session_id'],
            ]);

            return response()->json(['success' => true]);
        }

        \Log::warning('❌ VisitSession not found for room_id', [
            'room_id' => $validated['room_id'],
        ]);

        return response()->json(['success' => false, 'message' => 'VisitSession not found'], 404);
    }

    /**
     * Check if session is ready to join.
     */
    public function checkStatus(VisitSession $session)
    {
        $now = now();
        $scheduledStart = $session->scheduled_start;
        
        // Session is ready if:
        // 1. Current time is at or after scheduled start time
        // 2. Session status is not terminated/failed
        // 3. Session hasn't ended yet
        
        $isReady = $now->gte($scheduledStart) && 
                   !in_array($session->status, ['terminated', 'failed', 'cancelled']);
        
        return response()->json([
            'ready' => $isReady,
            'status' => $session->status,
            'scheduled_start' => $scheduledStart->toIso8601String(),
            'current_time' => $now->toIso8601String(),
        ]);
    }
}