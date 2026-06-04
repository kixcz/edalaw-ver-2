<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Class EnforceBranchScope
 * 
 * Middleware to enforce branch-level data scoping on API requests.
 * This provides an additional layer of security beyond the global query scopes.
 */
class EnforceBranchScope
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        // If no user is authenticated, let the auth middleware handle it
        if (!$user) {
            return $next($request);
        }

        // National office users have unrestricted access
        if ($user->isNationalOffice()) {
            return $next($request);
        }

        // Branch-level users must have a branch_id assigned
        if ($user->hasBranchAccess() && !$user->branch_id) {
            abort(403, 'User must be assigned to a branch.');
        }

        // Store the branch scope in the request for controllers to use
        if ($user->hasBranchAccess()) {
            $request->merge(['branch_scope' => $user->branch_id]);
        }

        return $next($request);
    }
}
