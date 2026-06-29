<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\ChatLog;
use App\Models\VisitSession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatLogsController extends Controller
{
    /**
     * Display chat logs management page.
     */
    public function index(Request $request): Response
    {
        $query = ChatLog::with(['visitSession.visit.user', 'visitSession.eburol.user', 'senderUser'])
            ->orderBy('sent_at', 'desc');

        // Filter by session ID if provided
        if ($request->filled('session_id')) {
            $query->where('visit_session_id', $request->input('session_id'));
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('sent_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sent_at', '<=', $request->input('date_to'));
        }

        // Filter by sender type
        if ($request->filled('sender')) {
            $query->where('sender', $request->input('sender'));
        }

        // Filter by flagged status
        if ($request->filled('flagged')) {
            $query->where('flagged', $request->input('flagged') === 'true');
        }

        $chatLogs = $query->paginate(50)->withQueryString();

        $formattedLogs = $chatLogs->map(function (ChatLog $log) {
            $session = $log->visitSession;
            $visitor = $session?->visit?->user ?? $session?->eburol?->user;
            $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->middle_name} {$visitor->last_name}") : 'Unknown';
            
            $inmateName = $session?->visit
                ? trim("{$session->visit->inmate_first_name} {$session->visit->inmate_middle_name} {$session->visit->inmate_last_name}")
                : ($session?->eburol
                    ? trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_middle_name} {$session->eburol->inmate_last_name}")
                    : 'Unknown');

            return [
                'id' => $log->id,
                'session_id' => $log->visit_session_id,
                'sender' => $log->sender,
                'sender_name' => $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : $log->sender,
                'message' => $log->message,
                'sent_at' => $log->sent_at?->toIso8601String(),
                'flagged' => $log->flagged,
                'flag_reason' => $log->flag_reason,
                'visitor_name' => $visitorName,
                'inmate_name' => $inmateName,
                'session_type' => $session?->session_type ?? 'unknown',
            ];
        });

        // Calculate stats (use all chat logs, not just paginated ones)
        $allLogs = ChatLog::query();
        $stats = [
            'total_messages' => $allLogs->count(),
            'flagged_messages' => (clone $allLogs)->where('flagged', true)->count(),
            'visitor_messages' => (clone $allLogs)->where('sender', 'visitor')->count(),
            'inmate_messages' => (clone $allLogs)->where('sender', 'inmate')->count(),
            'monitor_messages' => (clone $allLogs)->where('sender', 'monitor')->count(),
            'today_messages' => (clone $allLogs)->whereDate('sent_at', today())->count(),
        ];

        // Chart data
        $chartData = [
            'messages_by_sender' => [
                ['sender' => 'Visitor', 'count' => $stats['visitor_messages']],
                ['sender' => 'Inmate', 'count' => $stats['inmate_messages']],
                ['sender' => 'Monitor', 'count' => $stats['monitor_messages']],
            ],
            'messages_by_day' => collect(range(6, 0))->map(function ($daysAgo) {
                $date = now()->subDays($daysAgo);
                $count = ChatLog::whereDate('sent_at', $date)->count();
                return [
                    'day' => $date->format('D'),
                    'count' => $count,
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('JailOfficer/ChatLogs', [
            'chatLogs' => $formattedLogs,
            'stats' => $stats,
            'chartData' => $chartData,
            'pagination' => [
                'current_page' => $chatLogs->currentPage(),
                'last_page' => $chatLogs->lastPage(),
                'per_page' => $chatLogs->perPage(),
                'total' => $chatLogs->total(),
            ],
            'filters' => [
                'session_id' => $request->input('session_id'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'sender' => $request->input('sender'),
                'flagged' => $request->input('flagged'),
            ],
        ]);
    }

    /**
     * Export chat logs to CSV.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $query = ChatLog::with(['visitSession.visit.user', 'visitSession.eburol.user', 'senderUser'])
            ->orderBy('sent_at', 'desc');

        // Apply same filters as index
        if ($request->filled('session_id')) {
            $query->where('visit_session_id', $request->input('session_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('sent_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sent_at', '<=', $request->input('date_to'));
        }
        if ($request->filled('sender')) {
            $query->where('sender', $request->input('sender'));
        }
        if ($request->filled('flagged')) {
            $query->where('flagged', $request->input('flagged') === 'true');
        }

        $chatLogs = $query->get();

        $filename = 'chat_logs_' . now()->format('Y-m-d_His') . '.csv';

        return response()->stream(function () use ($chatLogs) {
            $handle = fopen('php://output', 'w');
            
            // Headers
            fputcsv($handle, [
                'ID',
                'Session ID',
                'Session Type',
                'Visitor Name',
                'Inmate Name',
                'Sender',
                'Sender Name',
                'Message',
                'Sent At',
                'Flagged',
                'Flag Reason',
            ]);

            foreach ($chatLogs as $log) {
                $session = $log->visitSession;
                $visitor = $session?->visit?->user ?? $session?->eburol?->user;
                $visitorName = $visitor ? trim("{$visitor->first_name} {$visitor->middle_name} {$visitor->last_name}") : 'Unknown';
                
                $inmateName = $session?->visit
                    ? trim("{$session->visit->inmate_first_name} {$session->visit->inmate_middle_name} {$session->visit->inmate_last_name}")
                    : ($session?->eburol
                        ? trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_middle_name} {$session->eburol->inmate_last_name}")
                        : 'Unknown');

                fputcsv($handle, [
                    $log->id,
                    $log->visit_session_id,
                    $session?->session_type ?? 'unknown',
                    $visitorName,
                    $inmateName,
                    $log->sender,
                    $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : $log->sender,
                    $log->message,
                    $log->sent_at?->format('Y-m-d H:i:s'),
                    $log->flagged ? 'Yes' : 'No',
                    $log->flag_reason ?? '',
                ]);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * View chat logs for a specific session.
     */
    public function showSession(Request $request, VisitSession $session): Response
    {
        $messages = $session->chatLogs()
            ->with(['senderUser'])
            ->orderBy('sent_at')
            ->get()
            ->map(function (ChatLog $log) {
                return [
                    'id' => $log->id,
                    'sender' => $log->sender,
                    'sender_name' => $log->senderUser ? trim("{$log->senderUser->first_name} {$log->senderUser->last_name}") : $log->sender,
                    'message' => $log->message,
                    'sent_at' => $log->sent_at?->toIso8601String(),
                    'flagged' => $log->flagged,
                    'flag_reason' => $log->flag_reason,
                ];
            });

        $visitor = $session->visit?->user ?? $session->eburol?->user;
        $inmateName = $session->visit
            ? trim("{$session->visit->inmate_first_name} {$session->visit->inmate_middle_name} {$session->visit->inmate_last_name}")
            : trim("{$session->eburol->inmate_first_name} {$session->eburol->inmate_middle_name} {$session->eburol->inmate_last_name}");

        return Inertia::render('JailOfficer/ChatSession', [
            'session' => [
                'id' => $session->id,
                'type' => $session->session_type,
                'visitor_name' => $visitor ? trim("{$visitor->first_name} {$visitor->middle_name} {$visitor->last_name}") : 'Unknown',
                'inmate_name' => $inmateName,
                'started_at' => $session->started_at?->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String(),
            ],
            'messages' => $messages,
        ]);
    }
}
