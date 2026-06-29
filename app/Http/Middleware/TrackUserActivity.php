<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lightweight middleware that updates `users.last_seen_at` whenever an
 * authenticated user makes a request. Writes are throttled to once per
 * minute per user via the cache so that high-traffic endpoints do not
 * hammer the database.
 *
 * The `last_seen_at` timestamp feeds the "online vs offline" analytic in
 * the regional supervisor's jail warden / jail officer reports.
 */
class TrackUserActivity
{
    /**
     * How recent a `last_seen_at` must be (in seconds) for a user to be
     * considered "online" in analytics.
     */
    public const ONLINE_WINDOW_SECONDS = 300; // 5 minutes

    /**
     * Minimum interval between two `last_seen_at` writes for the same user.
     */
    public const WRITE_THROTTLE_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->id) {
            $cacheKey = "user:last_seen:{$user->id}";

            // Skip the DB write if we already updated this user in the last minute.
            if (! Cache::has($cacheKey)) {
                Cache::put($cacheKey, true, self::WRITE_THROTTLE_SECONDS);

                // Use an inline update to avoid firing Eloquent model events
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['last_seen_at' => now()]);
            }
        }

        return $next($request);
    }
}
