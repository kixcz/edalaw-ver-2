<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
   
    public function index(Request $request): Response
    {
        $query = AuditLog::with(['user.role', 'auditable']);

        if ($request->filled('role')) {
            $role = Role::where('slug', $request->role)->first();
            if ($role) {
                $query->whereHas('user', function ($q) use ($role) {
                    $q->where('role_id', $role->id);
                });
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('user_agent', 'like', "%{$search}%")
                    ->orWhereRaw("JSON_EXTRACT(metadata, '$.module') LIKE ?", ["%{$search}%"])
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(COALESCE(first_name, ''), ' ', COALESCE(middle_name, ''), ' ', COALESCE(last_name, '')) LIKE ?", ["%{$search}%"]);
                    })
                    ->orWhereHas('user.role', function ($roleQuery) use ($search) {
                        $roleQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('slug', 'like', "%{$search}%");
                    });
            });
        }

        $auditLogs = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                $auditableType = class_basename($log->auditable_type);
                $module = $log->metadata['module'] ?? $auditableType;
                $userName = $log->user
                    ? trim("{$log->user->first_name} {$log->user->middle_name} {$log->user->last_name}")
                    : 'Unknown User';

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
                    'user_id' => $log->user_id,
                    'user_name' => $userName,
                    'user_email' => $log->user?->email,
                    'user_role' => $log->user_role,
                    'user_role_name' => $log->user?->role?->name,
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                    'created_at_human' => $log->created_at->diffForHumans(),
                ];
            });

        $stats = [
            'total' => $auditLogs->count(),
            'by_module' => $auditLogs->groupBy('module')->map(fn ($group) => $group->count())->toArray(),
            'by_action' => $auditLogs->groupBy('action')->map(fn ($group) => $group->count())->toArray(),
            'by_role' => $auditLogs->groupBy('user_role')->map(fn ($group) => $group->count())->toArray(),
        ];

        $roles = Role::orderBy('name')->get(['id', 'name', 'slug']);

        return Inertia::render('Admin/AuditLogs', [
            'audit_logs' => $auditLogs,
            'stats' => $stats,
            'roles' => $roles,
            'filters' => [
                'search' => $request->search,
                'role' => $request->role,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $query = AuditLog::with(['user.role', 'auditable']);

        if ($request->filled('role')) {
            $role = Role::where('slug', $request->role)->first();
            if ($role) {
                $query->whereHas('user', function ($q) use ($role) {
                    $q->where('role_id', $role->id);
                });
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('user_agent', 'like', "%{$search}%")
                    ->orWhereRaw("JSON_EXTRACT(metadata, '$.module') LIKE ?", ["%{$search}%"])
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(COALESCE(first_name, ''), ' ', COALESCE(middle_name, ''), ' ', COALESCE(last_name, '')) LIKE ?", ["%{$search}%"]);
                    })
                    ->orWhereHas('user.role', function ($roleQuery) use ($search) {
                        $roleQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('slug', 'like', "%{$search}%");
                    });
            });
        }

        $auditLogs = $query->orderBy('created_at', 'desc')->get();

        $filename = 'audit_logs_'.now()->format('Y-m-d_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($auditLogs) {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'ID',
                'Date & Time',
                'User Name',
                'User Email',
                'User Role',
                'Action',
                'Module',
                'Description',
                'Related Item Type',
                'Related Item ID',
                'IP Address',
                'User Agent',
            ]);

            foreach ($auditLogs as $log) {
                $userName = $log->user
                    ? trim("{$log->user->first_name} {$log->user->middle_name} {$log->user->last_name}")
                    : 'Unknown User';
                $module = $log->metadata['module'] ?? class_basename($log->auditable_type);

                fputcsv($file, [
                    $log->id,
                    $log->created_at->format('Y-m-d H:i:s'),
                    $userName,
                    $log->user?->email ?? 'N/A',
                    $log->user?->role?->name ?? $log->user_role ?? 'N/A',
                    $log->action,
                    $module,
                    $log->description,
                    class_basename($log->auditable_type),
                    $log->auditable_id,
                    $log->ip_address ?? 'N/A',
                    $log->user_agent ?? 'N/A',
                ]);
            }

            fclose($file);
        };

        return ResponseFacade::stream($callback, 200, $headers);
    }
}
