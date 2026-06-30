<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\UserSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    /**
     * Display the session management page.
     */
    public function index(): Response
    {
        $sessions = UserSession::where('user_id', auth()->id())
            ->orderBy('last_activity', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
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

        // Calculate stats (max 4 KPIs)
        $stats = [
            'total_sessions' => $sessions->count(),
            'active_sessions' => $sessions->where('is_active', true)->count(),
            'current_session' => $sessions->where('is_current', true)->count(),
            'other_sessions' => $sessions->where('is_current', false)->count(),
        ];

        return Inertia::render('Visitor/Sessions', [
            'sessions' => $sessions,
            'stats' => $stats,
        ]);
    }

    /**
     * Revoke a specific session (logout from that device).
     */
    public function revoke(UserSession $session): RedirectResponse
    {
        // Ensure the session belongs to the authenticated user
        if ($session->user_id !== auth()->id()) {
            abort(403);
        }

        // Don't allow revoking the current session
        if ($session->is_current) {
            return redirect()->back()->with('error', 'You cannot revoke your current session.');
        }

        // Delete the session from database
        $session->delete();

        // If using database sessions, also delete from sessions table
        if (config('session.driver') === 'database') {
            \Illuminate\Support\Facades\DB::table('sessions')
                ->where('id', $session->session_id)
                ->delete();
        }

        return redirect()->back()->with('success', 'Session revoked successfully.');
    }

    /**
     * Revoke all other sessions (keep only current).
     */
    public function revokeAll(): RedirectResponse
    {
        $currentSessionId = Session::getId();

        // Revoke all sessions except current
        UserSession::where('user_id', auth()->id())
            ->where('session_id', '!=', $currentSessionId)
            ->delete();

        // If using database sessions, also delete from sessions table
        if (config('session.driver') === 'database') {
            \Illuminate\Support\Facades\DB::table('sessions')
                ->where('user_id', auth()->id())
                ->where('id', '!=', $currentSessionId)
                ->delete();
        }

        return redirect()->back()->with('success', 'All other sessions have been revoked.');
    }
}
