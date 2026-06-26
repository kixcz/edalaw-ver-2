<?php

namespace App\Http\Middleware;

use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            $user->load('role');
        }

        $unreadNotificationCount = 0;
        $unreadAdminNotificationCount = 0;
        $recentNotifications = [];

        if ($user) {
            $unreadNotificationCount = Notification::where('user_id', $user->id)
                ->whereNull('read_at')
                ->count();

            // Get admin notification count for super admins
            if ($user->role?->slug === 'super_admin') {
                $unreadAdminNotificationCount = Notification::where('user_id', $user->id)
                    ->where('type', 'admin_notification')
                    ->whereNull('read_at')
                    ->count();
            }

            // Get recent unread notifications (last 10) for toast notifications
            $recentNotifications = Notification::where('user_id', $user->id)
                ->whereNull('read_at')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'type' => $notification->type,
                        'title' => $notification->title,
                        'message' => $notification->message,
                        'created_at' => $notification->created_at->format('Y-m-d H:i:s'),
                    ];
                })
                ->toArray();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'name' => $user->name ?? trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                    'email' => $user->email,
                    'branch_id' => $user->branch_id,
                    'approval_status' => $user->approval_status?->value ?? $user->approval_status,
                    'role' => $user->role?->slug,
                    'assigned_scopes' => $user->role?->slug === 'jail_officer'
                        ? $user->assignedScopes()
                            ->active()
                            ->select(['id', 'jail_officer_id', 'scope_type', 'building_id', 'dormitory_id', 'cell_id'])
                            ->limit(20)
                            ->get()
                        : [],
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadNotificationCount' => $unreadNotificationCount,
            'unreadAdminNotificationCount' => $unreadAdminNotificationCount,
            'recentNotifications' => $recentNotifications,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
            ],
        ];
    }
}
