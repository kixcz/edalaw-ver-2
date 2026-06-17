<?php

namespace App\Broadcasting;

use App\Models\User;

class JailOfficerChannel
{
    /**
     * Create a new channel instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, string $userId): bool
    {
        return $user->id === (int) $userId && $user->role?->slug === 'jail_officer';
    }
}
