<?php

namespace App\Http\Middleware;

use App\Models\InmateTunnel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventDuplicateInmateSession
{
    /**
     * Handle an incoming request for inmate join.
     * Immediately blocks duplicate sessions trying to use the same tunnel token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only apply to inmate join routes
        if (!$request->routeIs('inmate.join')) {
            return $next($request);
        }

        $token = $request->route('token');
        
        if (!$token) {
            return $next($request);
        }

        // Lock and check tunnel
        $tunnel = InmateTunnel::where('tunnel_token', $token)->lockForUpdate()->first();
        
        if (!$tunnel) {
            abort(404, 'Invalid or expired link.');
        }

        // If tunnel is already marked as used, redirect immediately
        if ($tunnel->is_used) {
            // EXCEPTION: Allow re-entry if OTP was just verified (jail officer bypass)
            if ($request->session()->get('otp_verified')) {
                // Clear the flag and allow through
                $request->session()->forget('otp_verified');
                return $next($request);
            }
            
            return redirect()->route('inmate.tunnel-already-used', ['token' => $tunnel->tunnel_token]);
        }

        // Check if tunnel has expired
        if (!$tunnel->isValid()) {
            abort(404, 'This link has expired or has already been used.');
        }

        $session = $tunnel->visitSession;
        
        // Refresh session to get latest state
        $session->refresh();

        // CRITICAL: Check if session is already active (inmate joined)
        // This prevents duplicate entries even before the page loads
        if ($session->inmate_joined_at) {
            // Inmate is already in this session - mark tunnel as used and block
            $tunnel->update(['is_used' => true]);
            return redirect()->route('inmate.tunnel-already-used', ['token' => $tunnel->tunnel_token]);
        }

        // Use cache lock to prevent race conditions during page load
        $cacheKey = "inmate_session_check_{$session->id}";
        $lockAcquired = cache()->add($cacheKey, true, 30); // 30 second lock
        
        if (!$lockAcquired) {
            // Another request is processing this session - block it
            $tunnel->update(['is_used' => true]);
            return redirect()->route('inmate.tunnel-already-used', ['token' => $tunnel->tunnel_token]);
        }

        // Store lock info in request for cleanup later
        $request->attributes->set('session_lock_key', $cacheKey);
        $request->attributes->set('session_for_blocking', $session);

        return $next($request);
    }

    /**
     * Clean up cache lock after response sent.
     */
    public function terminate(Request $request, Response $response): void
    {
        $lockKey = $request->attributes->get('session_lock_key');
        if ($lockKey) {
            cache()->forget($lockKey);
        }
    }
}
