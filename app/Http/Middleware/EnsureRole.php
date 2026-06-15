<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roleSlugs): Response
    {
        if (! $request->user()) {
            abort(403);
        }

        // Ensure role is loaded
        $request->user()->loadMissing('role');
        $userRole = $request->user()->role;

        $allowedSlugs = [];
        foreach ($roleSlugs as $slug) {
            if (str_contains($slug, ',')) {
                $allowedSlugs = array_merge($allowedSlugs, array_map('trim', explode(',', $slug)));
            } else {
                $allowedSlugs[] = $slug;
            }
        }

        if (! $userRole || ! in_array($userRole->slug, $allowedSlugs, true)) {
            abort(403);
        }

        return $next($request);
    }
}
