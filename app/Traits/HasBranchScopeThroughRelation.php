<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Trait HasBranchScopeThroughRelation
 * 
 * For models that don't have a direct branch_id column but inherit it through relationships.
 * Automatically scopes queries based on the authenticated user's branch through parent relationships.
 * 
 * Usage in model:
 *   protected string $branchRelationshipPath = 'jail'; // or 'annex.dormitory.jail'
 */
trait HasBranchScopeThroughRelation
{
    /**
     * Boot the trait and add global scope.
     */
    public static function bootHasBranchScopeThroughRelation(): void
    {
        static::addGlobalScope('branch', function (Builder $query) {
            $user = auth()->user();
            
            if (!$user) {
                return;
            }

            // National office users have access to all records
            if ($user->isNationalOffice()) {
                return;
            }

            // Branch-level users can only see records in their branch
            if ($user->hasBranchAccess() && $user->branch_id) {
                $model = new static();
                $relationshipPath = $model->getBranchRelationshipPath();
                
                if (!empty($relationshipPath)) {
                    $query->whereHas($relationshipPath, function ($q) use ($user) {
                        $q->where('branch_id', $user->branch_id);
                    });
                }
            }
        });
    }

    /**
     * Get the relationship path to branch.
     */
    public function getBranchRelationshipPath(): string
    {
        // This method should be overridden by the using model
        // If not overridden, return empty string (no scoping)
        return property_exists($this, 'branchRelationshipPath') ? $this->branchRelationshipPath : '';
    }

    /**
     * Scope a query to records within a specific branch through relationship.
     */
    public function scopeWithinBranch(Builder $query, int $branchId): Builder
    {
        $relationshipPath = $this->getBranchRelationshipPath();
        
        if (empty($relationshipPath)) {
            return $query;
        }

        return $query->whereHas($relationshipPath, function ($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        });
    }

    /**
     * Scope a query to records within multiple branches through relationship.
     */
    public function scopeWithinBranches(Builder $query, array $branchIds): Builder
    {
        $relationshipPath = $this->getBranchRelationshipPath();
        
        if (empty($relationshipPath)) {
            return $query;
        }

        return $query->whereHas($relationshipPath, function ($q) use ($branchIds) {
            $q->whereIn('branch_id', $branchIds);
        });
    }

    /**
     * Scope a query to only show records accessible by the current user.
     */
    public function scopeAccessibleByCurrentUser(Builder $query): Builder
    {
        $user = auth()->user();
        
        if (!$user) {
            return $query;
        }

        // National office users can access all records
        if ($user->isNationalOffice()) {
            return $query;
        }

        // Branch-level users can only access their branch's records
        if ($user->hasBranchAccess() && $user->branch_id) {
            return $query->withinBranch($user->branch_id);
        }

        // Default: no records accessible
        return $query->whereRaw('1 = 0');
    }
}
