<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ResolveJailOfficerScope
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isJailOfficer()) {
            $scopeResolver = $user->scopeResolver();

            // Load scopes with relationships for frontend sidebar
            $userScopes = $user->assignedScopes()
                ->with(['building', 'dormitory', 'cell'])
                ->get()
                ->map(function ($scope) {
                    return [
                        'id' => $scope->id,
                        'scope_type' => $scope->scope_type,
                        'building_id' => $scope->building_id,
                        'dormitory_id' => $scope->dormitory_id,
                        'cell_id' => $scope->cell_id,
                        'is_active' => $scope->is_active,
                        'building' => $scope->building ? [
                            'id' => $scope->building->id,
                            'name' => $scope->building->name,
                        ] : null,
                        'dormitory' => $scope->dormitory ? [
                            'id' => $scope->dormitory->id,
                            'name' => $scope->dormitory->name,
                        ] : null,
                        'cell' => $scope->cell ? [
                            'id' => $scope->cell->id,
                            'cell_number' => $scope->cell->cell_number,
                        ] : null,
                    ];
                });

            // Build scope data for frontend
            $scopeData = [
                'has_scope' => $scopeResolver->hasActiveScope($user),
                'highest_level' => $scopeResolver->getHighestScopeLevel($user),
                'authorized_cells' => $scopeResolver->getAuthorizedCellIds($user),
                'authorized_buildings' => $scopeResolver->getAuthorizedBuildingIds($user),
                'authorized_dormitories' => $scopeResolver->getAuthorizedDormitoryIds($user),
                'authorized_inmates' => $scopeResolver->getAuthorizedInmateIds($user),
                'scope_summary' => $scopeResolver->getScopeSummary($user),
                'assigned_scopes' => $userScopes, // Add this for sidebar
            ];

            // Share with Inertia responses
            Inertia::share('jail_officer_scope', $scopeData);

            // Also share via auth.user for sidebar compatibility
            Inertia::share('auth.user.assigned_scopes', $userScopes);

            // Also attach to request for controller access
            $request->merge(['jail_officer_scope' => $scopeData]);
        }

        return $next($request);
    }
}
