<?php

namespace App\Broadcasting;

use App\Models\MonitoringSession;
use App\Models\User;

class ChatChannel
{
    

    public function join(User $user, string $sessionToken): array|bool
    {
        $session = MonitoringSession::where('session_token', $sessionToken)->first();

        if (! $session) {
            return false;
        }

        $isVisitor = $session->visitor_id === $user->id;
        $isMonitor = $user->role?->slug === 'jail_officer';
        $isSuperAdmin = $user->role?->slug === 'super_admin';

        return $isVisitor || $isMonitor || $isSuperAdmin;
    }
}
