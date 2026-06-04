<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

/**
 * Trait HasBranchScope
 * 
 * Automatically scopes queries to the authenticated user's branch.
 * National office users have unrestricted access.
 */
trait HasBranchScope
{
    /**
     * Check if the model's table has a specific column.
     */
    public function hasColumn(string $column): bool
    {
        return Schema::hasColumn($this->getTable(), $column);
    }
    /**
     * Boot the trait and add global scope.
     */
    public static function bootHasBranchScope(): void
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
                // Check if model has direct branch_id column
                $model = new static();
                if ($model->hasColumn('branch_id')) {
                    $query->where('branch_id', $user->branch_id);
                } elseif ($model->hasColumn('jail_id')) {
                    // For models with jail_id, filter through jails table
                    $query->whereHas('jail', function ($q) use ($user) {
                        $q->where('branch_id', $user->branch_id);
                    });
                }
            }
        });
    }

    /**
     * Scope a query to records within a specific branch.
     */
    public function scopeWithinBranch(Builder $query, int $branchId): Builder
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope a query to records within multiple branches.
     */
    public function scopeWithinBranches(Builder $query, array $branchIds): Builder
    {
        return $query->whereIn('branch_id', $branchIds);
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
