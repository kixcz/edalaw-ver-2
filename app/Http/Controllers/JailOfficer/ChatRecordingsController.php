<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\ChatExport;
use App\Models\ChatLog;
use App\Models\VisitSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatRecordingsController extends Controller
{
    
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        $query = VisitSession::with(['visit.user', 'eburol.user', 'chatLogs', 'videoRecordings'])
            ->whereHas('chatLogs'); 

        if (! $isSuperAdmin) {
            $query->where('monitor_id', $user->id);
        }

        if ($request->filled('type')) {
            if ($request->input('type') === 'visit') {
                $query->whereNotNull('visit_id');
            } elseif ($request->input('type') === 'eburol') {
                $query->whereNotNull('eburol_id');
            }
        }
        
        if ($request->filled('has_flagged')) {
            $query->whereHas('chatLogs', fn ($q) => $q->where('flagged', true));
        }

        $sessions = $query->orderByDesc('started_at')->get()->map(function (VisitSession $session) {
            $visitor = $session->visit?->user ?? $session->eburol?->user;
            $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->last_name}") : null;
            
            $inmateName = 'N/A';
            if ($session->visit) {
                $inmateName = trim("{$session->visit->inmate_first_name} {$session->visit->inmate_last_name}");
            } elseif ($session->eburol) {
                $inmateName = trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_last_name}");
            }

            $totalMessages = $session->chatLogs->count();
            $flaggedCount = $session->chatLogs->where('flagged', true)->count();
            
            $durationSeconds = 0;
            if ($session->scheduled_start && $session->scheduled_end) {
                $durationSeconds = $session->scheduled_start->diffInSeconds($session->scheduled_end);
            } elseif ($session->duration_seconds) {
                $durationSeconds = $session->duration_seconds;
            }

            return [
                'id' => $session->id,
                'room_id' => $session->room_id,
                'session_type' => $session->visit_id ? 'visit' : 'eburol',
                'visitor_name' => $visitorName,
                'inmate_name' => $inmateName,
                'scheduled_start' => $session->scheduled_start?->toIso8601String(),
                'scheduled_end' => $session->scheduled_end?->toIso8601String(),
                'duration_seconds' => $durationSeconds,
                'status' => $session->status,
                'total_messages' => $totalMessages,
                'flagged_count' => $flaggedCount,
                'csv_download_url' => route('jail-officer.chat-recordings.export-session', ['roomId' => $session->room_id]),
            ];
        });

        $viewPrefix = $isSuperAdmin ? 'Admin' : 'JailOfficer';

        return Inertia::render("{$viewPrefix}/ChatRecordings", [
            'sessions' => $sessions,
            'filters' => [
                'type' => $request->input('type'),
                'has_flagged' => $request->boolean('has_flagged'),
            ],
        ]);
    }

    public function viewSessionApi(string $roomId)
    {
        $session = VisitSession::with(['visit.user', 'eburol.user', 'chatLogs.senderUser'])
            ->where('room_id', $roomId)
            ->firstOrFail();

        $chatLogs = ChatLog::with('senderUser')
            ->where('visit_session_id', $session->id)
            ->orderBy('sent_at', 'asc')
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'sender' => $log->sender,
                'sender_label' => match(strtolower($log->sender)) {
                    'visitor', 'guest' => 'Visitor',
                    'inmate' => 'Inmate',
                    'monitor', 'officer', 'jail officer' => 'Officer',
                    default => ucfirst($log->sender),
                },
                'sender_name' => $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : ($log->sender === 'inmate' ? 'Inmate' : 'Unknown'),
                'message' => $log->message,
                'sent_at' => ($log->sent_at ?? $log->created_at ?? now())->toIso8601String(),
                'flagged' => $log->flagged,
                'flag_reason' => $log->flag_reason,
            ]);

        $visitor = $session->visit?->user ?? $session->eburol?->user;
        $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->last_name}") : null;
        
        $inmateName = 'N/A';
        if ($session->visit) {
            $inmateName = trim("{$session->visit->inmate_first_name} {$session->visit->inmate_last_name}");
        } elseif ($session->eburol) {
            $inmateName = trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_last_name}");
        }

        $startedAt = $session->started_at ?? $session->scheduled_start ?? now();
        $endedAt = $session->ended_at ?? $session->scheduled_end;
        
        $durationSeconds = 0;
        if ($session->scheduled_start && $session->scheduled_end) {
            $durationSeconds = $session->scheduled_start->diffInSeconds($session->scheduled_end);
        } elseif ($session->duration_seconds) {
            $durationSeconds = $session->duration_seconds;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'session' => [
                    'id' => $session->id,
                    'room_id' => $session->room_id,
                    'session_type' => $session->visit_id ? 'visit' : 'eburol',
                    'visitor_name' => $visitorName,
                    'inmate_name' => $inmateName,
                    'started_at' => $startedAt->toIso8601String(),
                    'ended_at' => $endedAt?->toIso8601String(),
                    'duration_seconds' => $durationSeconds,
                    'status' => $session->status,
                ],
                'chatLogs' => $chatLogs,
            ]
        ]);
    }

    public function viewSession(Request $request, string $roomId): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        $session = VisitSession::with(['visit.user', 'eburol.user', 'chatLogs.senderUser'])
            ->where('room_id', $roomId)
            ->firstOrFail();

        if (! $isSuperAdmin && $session->monitor_id !== $user->id) {
            abort(403, 'Unauthorized access to this session.');
        }

        $chatLogs = ChatLog::with('senderUser')
            ->where('visit_session_id', $session->id)
            ->orderBy('sent_at', 'asc')
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'sender' => $log->sender,
                'sender_name' => $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : ($log->sender === 'inmate' ? 'Inmate' : 'Unknown'),
                'message' => $log->message,
                'sent_at' => $log->sent_at->toIso8601String(),
                'flagged' => $log->flagged,
                'flag_reason' => $log->flag_reason,
            ]);

        $visitor = $session->visit?->user ?? $session->eburol?->user;
        $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->last_name}") : null;
        
        $inmateName = 'N/A';
        if ($session->visit) {
            $inmateName = trim("{$session->visit->inmate_first_name} {$session->visit->inmate_last_name}");
        } elseif ($session->eburol) {
            $inmateName = trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_last_name}");
        }

        $viewPrefix = $isSuperAdmin ? 'Admin' : 'JailOfficer';
        
        $durationSeconds = 0;
        if ($session->scheduled_start && $session->scheduled_end) {
            $durationSeconds = $session->scheduled_start->diffInSeconds($session->scheduled_end);
        } elseif ($session->duration_seconds) {
            $durationSeconds = $session->duration_seconds;
        }

        return Inertia::render("{$viewPrefix}/ChatSessionView", [
            'session' => [
                'id' => $session->id,
                'room_id' => $session->room_id,
                'session_type' => $session->visit_id ? 'visit' : 'eburol',
                'visitor_name' => $visitorName,
                'inmate_name' => $inmateName,
                'started_at' => $session->started_at?->toIso8601String() ?? $session->scheduled_start?->toIso8601String() ?? now()->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String() ?? $session->scheduled_end?->toIso8601String(),
                'duration_seconds' => $durationSeconds,
                'status' => $session->status,
            ],
            'chatLogs' => $chatLogs,
        ]);
    }

    public function exportSession(Request $request, string $roomId): StreamedResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        $session = VisitSession::with(['visit.user', 'eburol.user', 'chatLogs.senderUser'])
            ->where('room_id', $roomId)
            ->firstOrFail();

        if (! $isSuperAdmin && $session->monitor_id !== $user->id) {
            abort(403, 'Unauthorized access to this session.');
        }

        $chatLogs = ChatLog::with('senderUser')
            ->where('visit_session_id', $session->id)
            ->orderBy('sent_at', 'asc')
            ->get();

        $visitor = $session->visit?->user ?? $session->eburol?->user;
        $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->last_name}") : 'Unknown';
        
        $inmateName = 'N/A';
        if ($session->visit) {
            $inmateName = trim("{$session->visit->inmate_first_name} {$session->visit->inmate_last_name}");
        } elseif ($session->eburol) {
            $inmateName = trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_last_name}");
        }

        $filename = "chat-session-{$roomId}-" . now()->format('Y-m-d-His') . '.csv';

        ChatExport::create([
            'visit_session_id' => $session->id,
            'format' => 'csv',
            'generated_by' => $user->id,
            'file_path' => "exports/{$filename}",
        ]);

        return response()->stream(function () use ($chatLogs, $session, $visitorName, $inmateName) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Chat Export']);
            fputcsv($handle, ['Session ID', $session->room_id]);
            fputcsv($handle, ['Session Type', $session->visit_id ? 'Visit' : 'E-Burol']);
            fputcsv($handle, ['Visitor', $visitorName]);
            fputcsv($handle, ['Inmate', $inmateName]);
            fputcsv($handle, ['Started At', $session->started_at?->format('Y-m-d H:i:s') ?? 'N/A']);
            fputcsv($handle, ['Ended At', $session->ended_at?->format('Y-m-d H:i:s') ?? 'N/A']);
            $duration = $session->duration_seconds ?? 0;
            $hours = floor($duration / 3600);
            $minutes = floor(($duration % 3600) / 60);
            $secs = $duration % 60;
            fputcsv($handle, ['Duration', sprintf('%dh %dm %ds', $hours, $minutes, $secs)]);
            fputcsv($handle, ['Status', $session->status]);
            fputcsv($handle, []);
            fputcsv($handle, ['Timestamp', 'Sender', 'Sender Name', 'Message', 'Flagged']);

            foreach ($chatLogs as $log) {
                fputcsv($handle, [
                    $log->sent_at?->format('Y-m-d H:i:s') ?? '',
                    $log->sender,
                    $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : ($log->sender === 'inmate' ? 'Inmate' : 'Unknown'),
                    $log->message,
                    $log->flagged ? 'Yes' : 'No',
                ]);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
