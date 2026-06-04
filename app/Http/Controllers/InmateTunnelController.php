<?php

namespace App\Http\Controllers;

use App\Events\VisitSessionMessageFlagged;
use App\Events\VisitSessionMessageSent;
use App\Models\ChatLog;
use App\Models\InmateTunnel;
use App\Models\SystemLog;
use App\Services\VideoSdkService;
use App\Services\VisitSessionRecordingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class InmateTunnelController extends Controller
{
    public function showEnterToken(Request $request): Response
    {
        return Inertia::render('Inmate/EnterTunnelToken', [
            'verifyUrl' => route('inmate.verify-token'),
            'csrfToken' => csrf_token(),
        ]);
    }

    public function verifyToken(Request $request): RedirectResponse
    {
        $request->validate([
            'token_or_url' => ['required', 'string', 'max:2048'],
        ], [
            'token_or_url.required' => 'Please enter the inmate tunnel code.',
        ]);

        $input = trim($request->input('token_or_url'));
        $token = $this->resolveTunnelToken($input);

        if (! $token) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['token_or_url' => 'The code you entered is invalid. Enter the 8-character code you received.']);
        }

        $tunnel = InmateTunnel::where('tunnel_token', $token)->first();
        if (! $tunnel) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['token_or_url' => 'Invalid or expired link.']);
        }
        if ($tunnel->expires_at->isPast()) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['token_or_url' => 'This code has expired.']);
        }

        return redirect()->route('inmate.join', ['token' => $tunnel->tunnel_token]);
    }

    private function resolveTunnelToken(string $input): ?string
    {
        $input = trim($input);
        if ($input === '') {
            return null;
        }
        $upper = strtoupper($input);
        if (strlen($upper) === 8 && ctype_alnum($upper)) {
            $tunnel = InmateTunnel::where('short_code', $upper)->first();

            return $tunnel ? $tunnel->tunnel_token : null;
        }
        if (str_contains($input, 'inmate/join/')) {
            $parts = explode('inmate/join/', $input);
            $after = end($parts);
            $token = trim(explode('?', $after)[0]);
            if ($token !== '') {
                return $token;
            }
        }

        return $input;
    }

    public function join(Request $request, string $token): View|RedirectResponse
    {
        return DB::transaction(function () use ($token) {
            $tunnel = InmateTunnel::where('tunnel_token', $token)->lockForUpdate()->first();
            
            if (!$tunnel) {
                abort(404, 'Invalid or expired link.');
            }
            
            if ($tunnel->is_used) {
                if (session('otp_verified')) {
                    session()->forget('otp_verified'); // Clear the flag
                } else {
                    return redirect()->route('inmate.tunnel-already-used', ['token' => $tunnel->tunnel_token]);
                }
            }
            
            if (!$tunnel->isValid()) {
                abort(404, 'This link has expired or has already been used.');
            }

            $session = $tunnel->visitSession;
            
            $session->refresh();
            
            if ($tunnel->is_used) {
                if (session('otp_verified')) {
                    session()->forget('otp_verified'); // Clear the flag
                } else {
                    return redirect()->route('inmate.tunnel-already-used', ['token' => $tunnel->tunnel_token]);
                }
            }

            if ($session->visit_type === 'virtual' && $session->jail_officer_id) {
                $otpService = new \App\Services\OtpService;
                $jailOfficer = $session->jailOfficer;
                
                if ($jailOfficer && $jailOfficer->contact_number) {
                    session(['inmate_tunnel_token' => $token]);
                    
                    $result = $otpService->generateAndSend($jailOfficer, 'inmate_tunnel_verification');
                    
                    if ($result['success']) {
                        \App\Models\SystemLog::create([
                            'visit_session_id' => $session->id,
                            'action' => 'inmate_tunnel_otp_sent',
                            'performed_by' => null,
                            'metadata' => [
                                'jail_officer_id' => $jailOfficer->id,
                                'jail_officer_name' => $jailOfficer->full_name,
                                'message' => 'OTP sent for inmate tunnel access',
                                'scheduled_start' => $session->scheduled_start?->toIso8601String(),
                            ],
                        ]);
                        
                        return redirect()->route('inmate.tunnel-otp-verify.show', ['token' => $token]);
                    } else {
                        abort(500, 'Failed to send OTP to jail officer. Please try again or contact support.');
                    }
                } else {
                    abort(400, 'Jail officer contact information not available. Cannot proceed with verification.');
                }
            }

            if (!$session->isWithinSchedule()) {
                $tz = config('app.timezone');
                $now = now($tz);
                $start = $session->scheduled_start->copy()->setTimezone($tz);
                $end = $session->scheduled_end->copy()->setTimezone($tz);
                $scheduleWindow = $start->format('M j, Y').', '.$start->format('g:i A').' – '.$end->format('g:i A');
                
                $timeUntilActive = null;
                if ($now->isBefore($start)) {
                    $diff = $now->diff($start);
                    $parts = [];
                    if ($diff->d > 0) {
                        $parts[] = $diff->d.' '.str('day')->plural($diff->d);
                    }
                    if ($diff->h > 0) {
                        $parts[] = $diff->h.' '.str('hour')->plural($diff->h);
                    }
                    if ($diff->i > 0 && count($parts) < 2) {
                        $parts[] = $diff->i.' '.str('minute')->plural($diff->i);
                    }
                    $timeUntilActive = count($parts) > 0 ? implode(' ', $parts) : 'less than a minute';
                }

                return view('visitor.video-room-not-started', [
                    'title' => 'Session not started yet',
                    'schedule_window' => $scheduleWindow,
                    'time_until_active' => $timeUntilActive,
                    'tunnel_token' => $tunnel->tunnel_token,
                    'session_id' => $session->id,
                    'session' => $session,
                ]);
            }
            
            if ($session->isCompleted()) {
                return view('visitor.video-room-ended', [
                    'title' => 'Session ended',
                    'message' => 'This session has ended.',
                    'session_id' => $session->id,
                ]);
            }

            if (!$tunnel->is_used) {
                $tunnel->update(['is_used' => true]);
            }

            return view('visitor.video-room', [
                'session' => $session,
                'room_id' => $session->room_id,
                'participant_name' => 'Inmate',
                'participant_id' => 'inmate-'.$session->id.'-'.uniqid(),
                'is_observer' => false,
                'scheduled_end' => $session->scheduled_end?->format('Y-m-d H:i:s'),
                'tunnel' => $tunnel,
            ]);
        });
    }

    public function showOtpVerification(string $token): Response
    {
        $tunnel = InmateTunnel::where('tunnel_token', $token)->first();
        
        if (!$tunnel || !$tunnel->isValid() || $tunnel->is_used) {
            abort(404, 'Invalid or expired tunnel code.');
        }
        
        return Inertia::render('Inmate/TunnelOtpVerification', [
            'tunnelToken' => $token,
            'verifyUrl' => route('inmate.tunnel-otp-verify'),
        ]);
    }

    public function verifyOtp(Request $request, string $token): RedirectResponse
    {
        $request->validate([
            'otp' => ['required', 'string', 'size' => 6],
        ], [
            'otp.required' => 'Please enter the 6-digit OTP code.',
            'otp.size' => 'OTP must be 6 digits.',
        ]);

        $tunnel = InmateTunnel::where('tunnel_token', $token)->first();
        
        if (!$tunnel || !$tunnel->isValid() || $tunnel->is_used) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['otp' => 'Invalid or expired tunnel code.']);
        }

        $session = $tunnel->visitSession;
        $jailOfficer = $session->jailOfficer;

        if (!$jailOfficer) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['otp' => 'No jail officer assigned to this session.']);
        }

        $otpService = new \App\Services\OtpService;
        $isValid = $otpService->verify($jailOfficer, $request->otp, 'inmate_tunnel_verification');

        if (!$isValid) {
            return back()->withErrors(['otp' => 'Invalid or expired OTP. Please contact the assigned jail officer.']);
        }

        session()->forget('inmate_tunnel_token');

        if ($session->inmate_joined_at) {
            cache()->forget("inmate_session_{$session->id}");
        }

        return redirect()->route('inmate.join', ['token' => $token])
            ->with('otp_verified', true);
    }

    public function resendOtp(Request $request, string $token): RedirectResponse
    {
        $tunnel = InmateTunnel::where('tunnel_token', $token)->first();
        
        if (!$tunnel || !$tunnel->isValid() || $tunnel->is_used) {
            return redirect()->route('inmate.enter-token')
                ->withErrors(['resend' => 'Invalid or expired tunnel code.']);
        }

        $session = $tunnel->visitSession;
        $jailOfficer = $session->jailOfficer;

        if (!$jailOfficer || !$jailOfficer->contact_number) {
            return back()->withErrors(['resend' => 'Jail officer contact information not available.']);
        }

        $otpService = new \App\Services\OtpService;
        $result = $otpService->generateAndSend($jailOfficer, 'inmate_tunnel_verification');

        if ($result['success']) {
            return back()->with('success', 'OTP has been resent to the jail officer.');
        }

        return back()->withErrors(['resend' => 'Failed to resend OTP. Please try again.']);
    }

    public function getInmateToken(Request $request, string $token): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($token) {
            $tunnel = InmateTunnel::where('tunnel_token', $token)->lockForUpdate()->first();
            
            if (! $tunnel) {
                return response()->json(['error' => 'Invalid or expired link.'], 404);
            }
            
            if ($tunnel->is_used) {
                return response()->json(['error' => 'This tunnel has already been used by another inmate.'], 403);
            }
            
            if (! $tunnel->isValid()) {
                return response()->json(['error' => 'This link has expired or has already been used.'], 403);
            }

            $session = $tunnel->visitSession;
            
            if (! $session->isWithinSchedule() || $session->isCompleted()) {
                return response()->json(['error' => 'Session not available.'], 403);
            }

            $tunnel->update(['is_used' => true]);

            $session->update(['inmate_joined_at' => now()]);

            if ($session->visitor_joined_at && $session->visitor_participant_id) {
                app(VisitSessionRecordingService::class)->tryStartRecording($session, $session->visitor_participant_id);
            }

            $videoSdk = new VideoSdkService;
            $participantId = 'inmate-'.$session->id.'-'.uniqid();
            $result = $videoSdk->generateJoinTokenForPrebuiltApp($session->room_id, $participantId, ['allow_join'], 120);

            if (! ($result['success'] ?? false) || empty($result['token'])) {
                return response()->json(['error' => 'Unable to generate join token.'], 500);
            }

            $token = preg_replace('/^Bearer\s+/i', '', (string) $result['token']);
            $token = trim($token);

            return response()->json([
                'token' => $token,
                'room_id' => $session->room_id,
                'participant_id' => $participantId,
                'api_key' => config('services.videosdk.api_key'),
                'participant_name' => 'Inmate',
                'is_observer' => false,
            ]);
        });
    }

    public function sendChat(Request $request): JsonResponse
    {
        $request->validate([
            'tunnel_token' => ['required', 'string'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $tunnel = InmateTunnel::where('tunnel_token', $request->input('tunnel_token'))->first();
        if (! $tunnel) {
            return response()->json(['error' => 'Invalid or expired link.'], 404);
        }
        if ($tunnel->expires_at->isPast()) {
            return response()->json(['error' => 'This link has expired.'], 403);
        }

        $session = $tunnel->visitSession;
        if ($session->isCompleted()) {
            return response()->json(['error' => 'Session has ended.'], 422);
        }
        if ($session->chat_locked) {
            return response()->json(['error' => 'Chat is locked.'], 422);
        }
        if (! $session->isWithinSchedule()) {
            return response()->json(['error' => 'Session is not in schedule.'], 422);
        }

        $message = $request->input('message');
        $keywords = config('visit_chat.forbidden_keywords', []);
        $lower = strtolower($message);
        $flagged = false;
        $flagReason = null;
        foreach ($keywords as $kw) {
            if ($kw !== '' && str_contains($lower, strtolower($kw))) {
                $flagged = true;
                $flagReason = 'Auto-flagged: forbidden keyword.';

                break;
            }
        }

        $chatLog = DB::transaction(function () use ($session, $message, $flagged, $flagReason) {
            $log = ChatLog::create([
                'visit_session_id' => $session->id,
                'sender' => 'inmate',
                'sender_id' => null,
                'message' => $message,
                'sent_at' => now(),
                'flagged' => $flagged,
                'flag_reason' => $flagReason,
                'flagged_by' => null,
                'flagged_at' => $flagged ? now() : null,
            ]);
            if ($flagged) {
                SystemLog::create([
                    'visit_session_id' => $session->id,
                    'action' => 'chat_auto_flagged',
                    'performed_by' => null,
                    'metadata' => ['chat_log_id' => $log->id, 'reason' => $flagReason],
                ]);
            }

            return $log;
        });

        $session->refresh();
        VisitSessionMessageSent::dispatch($session, $chatLog);
        if ($flagged) {
            VisitSessionMessageFlagged::dispatch($session, $chatLog);
        }

        return response()->json([
            'id' => $chatLog->id,
            'sender' => $chatLog->sender,
            'message' => $chatLog->message,
            'sent_at' => $chatLog->sent_at->toIso8601String(),
            'flagged' => $chatLog->flagged,
            'flag_reason' => $chatLog->flag_reason,
        ], 201);
    }

    public function listChat(Request $request): JsonResponse
    {
        $request->validate(['tunnel_token' => ['required', 'string']]);

        $tunnel = InmateTunnel::where('tunnel_token', $request->input('tunnel_token'))->first();
        if (! $tunnel) {
            return response()->json(['error' => 'Invalid or expired link.'], 404);
        }

        $session = $tunnel->visitSession;
        $messages = $session->chatLogs()
            ->orderBy('sent_at')
            ->get()
            ->map(fn (ChatLog $log) => [
                'id' => $log->id,
                'sender' => $log->sender,
                'sender_id' => $log->sender_id,
                'message' => $log->message,
                'sent_at' => $log->sent_at->toIso8601String(),
                'flagged' => $log->flagged,
                'flag_reason' => $log->flag_reason,
            ]);

        return response()->json(['messages' => $messages, 'chat_locked' => (bool) $session->chat_locked]);
    }

    public function tunnelAlreadyUsed(Request $request): View
    {
        return view('errors.inmate-tunnel-already-used', [
            'token' => $request->input('token'),
        ]);
    }
}
