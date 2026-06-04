<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

class SessionManagementController extends Controller
{
   
    public function index(): Response
    {
        $sessions = UserSession::with('user.role')
            ->orderBy('last_activity', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'user_id' => $session->user_id,
                    'user_name' => trim("{$session->user->first_name} {$session->user->middle_name} {$session->user->last_name}"),
                    'user_email' => $session->user->email,
                    'user_role' => $session->user->role?->name ?? 'Unknown',
                    'session_id' => $session->session_id,
                    'ip_address' => $session->ip_address,
                    'device_type' => $session->device_type,
                    'device_name' => $session->device_name,
                    'browser' => $session->browser,
                    'platform' => $session->platform,
                    'location' => $session->location,
                    'is_current' => $session->is_current,
                    'last_activity' => $session->last_activity?->format('Y-m-d H:i:s'),
                    'created_at' => $session->created_at->format('Y-m-d H:i:s'),
                    'is_active' => $session->isActive(),
                ];
            });

        $stats = [
            'total' => UserSession::count(),
            'active' => UserSession::where('last_activity', '>=', now()->subHours(2))->count(),
            'current' => UserSession::where('is_current', true)->count(),
            'by_device' => [
                'mobile' => UserSession::where('device_type', 'mobile')->count(),
                'tablet' => UserSession::where('device_type', 'tablet')->count(),
                'desktop' => UserSession::where('device_type', 'desktop')->count(),
            ],
        ];

        $currentSessionId = Session::getId();
        $myOtherSessionsCount = UserSession::where('user_id', auth()->id())
            ->where('session_id', '!=', $currentSessionId)
            ->count();

        return Inertia::render('Admin/SessionManagement', [
            'sessions' => $sessions,
            'stats' => $stats,
            'my_other_sessions_count' => $myOtherSessionsCount,
        ]);
    }

    public function revoke(UserSession $session): RedirectResponse
    {
        $session->delete();

        if (config('session.driver') === 'database') {
            DB::table('sessions')
                ->where('id', $session->session_id)
                ->delete();
        }

        return redirect()->back()->with('success', 'Session revoked successfully.');
    }

    public function revokeUserSessions(int $user): RedirectResponse
    {
        $sessions = UserSession::where('user_id', $user)->get();

        foreach ($sessions as $session) {
            if (config('session.driver') === 'database') {
                DB::table('sessions')
                    ->where('id', $session->session_id)
                    ->delete();
            }
            $session->delete();
        }

        return redirect()->back()->with('success', 'All sessions for this user have been revoked.');
    }

    public function revokeMyOtherSessions(): RedirectResponse
    {
        $currentSessionId = Session::getId();

        $otherSessions = UserSession::where('user_id', auth()->id())
            ->where('session_id', '!=', $currentSessionId)
            ->get();

        foreach ($otherSessions as $session) {
            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))
                    ->where('id', $session->session_id)
                    ->delete();
            }
            $session->delete();
        }

        return redirect()->back()->with('success', 'All other sessions have been ended. You are now logged in only on this device.');
    }
}
