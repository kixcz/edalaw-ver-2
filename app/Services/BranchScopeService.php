<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Class BranchScopeService
 * 
 * Provides utility methods for working with branch-scoped data.
 */
class BranchScopeService
{
    /**
     * Apply branch scoping to a query builder instance.
     * 
     * @param  Builder  $query  The query builder instance
     * @param  User|null  $user  The authenticated user
     * @param  string  $branchColumn  The column name for branch_id (default: 'branch_id')
     * @return Builder
     */
    public function applyScope(Builder $query, ?User $user, string $branchColumn = 'branch_id'): Builder
    {
        if (!$user) {
            return $query;
        }

        // National office users have unrestricted access
        if ($user->isNationalOffice()) {
            return $query;
        }

        // Branch-level users can only see their own branch's data
        if ($user->hasBranchAccess() && $user->branch_id) {
            return $query->where($branchColumn, $user->branch_id);
        }

        // Users without branch access cannot see any data
        return $query->whereRaw('1 = 0');
    }

    /**
     * Apply branch scoping through a relationship chain.
     * 
     * @param  Builder  $query  The query builder instance
     * @param  User|null  $user  The authenticated user
     * @param  string  $relationshipPath  The relationship path (e.g., 'jail.branch')
     * @return Builder
     */
    public function applyScopeThroughRelation(Builder $query, ?User $user, string $relationshipPath): Builder
    {
        if (!$user) {
            return $query;
        }

        // National office users have unrestricted access
        if ($user->isNationalOffice()) {
            return $query;
        }

        // Branch-level users can only see their own branch's data
        if ($user->hasBranchAccess() && $user->branch_id) {
            return $query->whereHas($relationshipPath, function ($q) use ($user) {
                $q->where('branch_id', $user->branch_id);
            });
        }

        // Users without branch access cannot see any data
        return $query->whereRaw('1 = 0');
    }

    /**
     * Get all branches accessible by a user.
     * 
     * @param  User  $user  The authenticated user
     * @return array<int> Array of branch IDs
     */
    public function getAccessibleBranches(User $user): array
    {
        // National office users can access all branches
        if ($user->isNationalOffice()) {
            return Branch::pluck('id')->toArray();
        }

        // Branch-level users can only access their assigned branch
        if ($user->hasBranchAccess() && $user->branch_id) {
            return [$user->branch_id];
        }

        // Users without branch access cannot access any branches
        return [];
    }

    /**
     * Check if a user can access a specific branch's data.
     * 
     * @param  User  $user  The authenticated user
     * @param  int  $branchId  The branch ID to check
     * @return bool
     */
    public function canAccessBranch(User $user, int $branchId): bool
    {
        // National office users can access all branches
        if ($user->isNationalOffice()) {
            return true;
        }

        // Branch-level users can only access their assigned branch
        if ($user->hasBranchAccess()) {
            return $user->branch_id === $branchId;
        }

        // Users without branch access cannot access any branches
        return false;
    }

    /**
     * Validate that a record belongs to the user's branch.
     * 
     * @param  mixed  $record  The model instance to validate
     * @param  User|null  $user  The authenticated user
     * @return bool
     */
    public function validateRecordOwnership($record, ?User $user): bool
    {
        if (!$user || !$record) {
            return false;
        }

        // National office users can access all records
        if ($user->isNationalOffice()) {
            return true;
        }

        // For models with direct branch_id
        if (isset($record->branch_id)) {
            return $user->hasBranchAccess() && $record->branch_id === $user->branch_id;
        }

        // For models with jail_id, resolve through jail
        if (isset($record->jail_id) && method_exists($record, 'jail')) {
            $jail = $record->jail;
            if ($jail) {
                return $user->hasBranchAccess() && $jail->branch_id === $user->branch_id;
            }
        }

        return false;
    }

    /**
     * Create a new subquery to get branch_id through relationships.
     * Useful for complex queries where you need to join multiple tables.
     * 
     * @param  string  $fromTable  The table to start from
     * @param  array<string>  $joins  Array of join specifications
     * @return \Illuminate\Database\Query\Builder
     */
    public function createBranchIdSubquery(string $fromTable, array $joins): \Illuminate\Database\Query\Builder
    {
        $query = DB::table($fromTable);
        
        foreach ($joins as $join) {
            $query->join($join['table'], $join['first'], '=', $join['second']);
        }
        
        return $query->select('branch_id');
    }
}
