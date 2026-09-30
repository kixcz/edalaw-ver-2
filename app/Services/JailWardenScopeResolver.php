<?php

namespace App\Services;

use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\JailWardenScope;
use App\Models\User;

class JailWardenScopeResolver
{
    /**
     * Cache for resolved IDs to prevent redundant queries
     */
    protected array $resolvedCache = [];

    /**
     * Determine if a warden has any active facility scopes.
     */
    public function hasActiveScope(User $warden): bool
    {
        if (!$warden->isJailWarden()) {
            return false;
        }
        
        return JailWardenScope::where('jail_warden_id', $warden->id)
            ->active()
            ->exists();
    }

    /**
     * Get all cell IDs authorized for this warden.
     */
    public function getAuthorizedCellIds(User $warden): array
    {
        $cacheKey = "warden_{$warden->id}_cells";
        
        if (isset($this->resolvedCache[$cacheKey])) {
            return $this->resolvedCache[$cacheKey];
        }

        // If not a warden, or has no scopes, they don't have access to specific scopes
        if (!$warden->isJailWarden()) {
            return [];
        }
        
        // If they have no explicit scopes, maybe default to their assigned branch? 
        // We will only return scoped cells if they have scopes, otherwise empty array
        // (The consumer should handle the fallback if they have no scopes but are assigned a branch)
        
        $scopes = JailWardenScope::where('jail_warden_id', $warden->id)
            ->active()
            ->get();
            
        if ($scopes->isEmpty()) {
            return [];
        }

        $cellIds = collect();

        foreach ($scopes as $scope) {
            $cellIds = $cellIds->merge($scope->getAuthorizedCellIds());
        }

        $result = $cellIds->unique()->values()->toArray();
        $this->resolvedCache[$cacheKey] = $result;
        
        return $result;
    }

    /**
     * Get all dormitory IDs authorized for this warden.
     */
    public function getAuthorizedDormitoryIds(User $warden): array
    {
        $cacheKey = "warden_{$warden->id}_dorms";
        
        if (isset($this->resolvedCache[$cacheKey])) {
            return $this->resolvedCache[$cacheKey];
        }

        if (!$warden->isJailWarden()) {
            return [];
        }

        $scopes = JailWardenScope::where('jail_warden_id', $warden->id)
            ->active()
            ->get();

        if ($scopes->isEmpty()) {
            return [];
        }

        $dormIds = collect();

        foreach ($scopes as $scope) {
            $dormIds = $dormIds->merge($scope->getAuthorizedDormitoryIds());
        }

        $result = $dormIds->unique()->values()->toArray();
        $this->resolvedCache[$cacheKey] = $result;
        
        return $result;
    }

    /**
     * Get all building/annex IDs authorized for this warden.
     */
    public function getAuthorizedBuildingIds(User $warden): array
    {
        $cacheKey = "warden_{$warden->id}_buildings";
        
        if (isset($this->resolvedCache[$cacheKey])) {
            return $this->resolvedCache[$cacheKey];
        }

        if (!$warden->isJailWarden()) {
            return [];
        }

        $scopes = JailWardenScope::where('jail_warden_id', $warden->id)
            ->active()
            ->get();

        if ($scopes->isEmpty()) {
            return [];
        }

        $buildingIds = collect();

        foreach ($scopes as $scope) {
            $buildingIds = $buildingIds->merge($scope->getAuthorizedBuildingIds());
        }

        $result = $buildingIds->unique()->values()->toArray();
        $this->resolvedCache[$cacheKey] = $result;
        
        return $result;
    }

    /**
     * Get all inmate IDs authorized for this warden (inmates assigned to authorized cells).
     */
    public function getAuthorizedInmateIds(User $warden): array
    {
        $cacheKey = "warden_{$warden->id}_inmates";
        
        if (isset($this->resolvedCache[$cacheKey])) {
            return $this->resolvedCache[$cacheKey];
        }

        $authorizedCellIds = $this->getAuthorizedCellIds($warden);

        if (empty($authorizedCellIds)) {
            return [];
        }

        // Assuming Inmate model has a cell_id or there's a pivot table
        // We'll need to know how inmates are linked to cells.
        // Assuming there is a relation or Inmate has cell_id
        $result = \App\Models\Inmate::whereIn('cell_id', $authorizedCellIds)
            ->pluck('id')
            ->toArray();
            
        $this->resolvedCache[$cacheKey] = $result;
        
        return $result;
    }
}
