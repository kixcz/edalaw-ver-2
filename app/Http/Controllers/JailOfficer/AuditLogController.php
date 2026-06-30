<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display the audit log history page.
     */
    public function index(): Response
    {
        $auditLogs = AuditLog::where('user_id', auth()->id())
            ->with('auditable')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                $auditableType = class_basename($log->auditable_type);
                $module = $log->metadata['module'] ?? $auditableType;

                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'module' => $module,
                    'description' => $log->description,
                    'auditable_type' => $auditableType,
                    'auditable_id' => $log->auditable_id,
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                    'created_at_human' => $log->created_at->diffForHumans(),
                ];
            });

        $stats = [
            'total' => $auditLogs->count(),
            'by_module' => $auditLogs->groupBy('module')->map(fn ($group) => $group->count())->toArray(),
            'by_action' => $auditLogs->groupBy('action')->map(fn ($group) => $group->count())->toArray(),
        ];

        // Chart data
        $chartData = [
            'logs_by_module' => collect($stats['by_module'])->map(function ($count, $module) {
                return ['module' => $module, 'count' => $count];
            })->values()->toArray(),
            'logs_by_action' => collect($stats['by_action'])->map(function ($count, $action) {
                return [
                    'action' => str_replace('_', ' ', $action),
                    'count' => $count,
                ];
            })->sortByDesc('count')->take(10)->values()->toArray(),
        ];

        return Inertia::render('JailOfficer/AuditLogs', [
            'audit_logs' => $auditLogs,
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }
}
