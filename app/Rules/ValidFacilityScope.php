<?php

namespace App\Rules;

use App\Models\Building;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\JailOfficerScope;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidFacilityScope implements ValidationRule
{
    protected User $warden;
    protected int $jailOfficerId;

    public function __construct(User $warden, int $jailOfficerId)
    {
        $this->warden = $warden;
        $this->jailOfficerId = $jailOfficerId;
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Validation is done at the array level, so we check the entire request
        // This rule is a placeholder for complex cross-field validation
    }

    /**
     * Validate that the facility belongs to the warden's branch.
     */
    public static function validateFacilityBranch(string $scopeType, ?int $facilityId, int $branchId): bool
    {
        if (!$facilityId) {
            return true; // Nullable fields are validated separately
        }

        return match ($scopeType) {
            'dormitory' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('dormitories.id', $facilityId)
                ->exists(),
            
            'annex' => \App\Models\Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('annexes.id', $facilityId)
                ->exists(),
            
            'building' => \App\Models\Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('annexes.id', $facilityId)
                ->exists(),
            
            'cell' => Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('cells.id', $facilityId)
                ->exists(),
            
            default => false,
        };
    }

    /**
     * Validate that scope_type matches the provided facility ID.
     */
    public static function validateScopeTypeMatch(string $scopeType, ?int $buildingId, ?int $dormitoryId, ?int $cellId): bool
    {
        return match ($scopeType) {
            'annex', 'building' => $buildingId !== null && $dormitoryId === null && $cellId === null,
            'dormitory' => $dormitoryId !== null && $buildingId === null && $cellId === null,
            'cell' => $cellId !== null && $buildingId === null && $dormitoryId === null,
            default => false,
        };
    }

    /**
     * Check for conflicting scope assignments (parent and child).
     *
     * Returns array of conflict messages, empty if no conflicts.
     */
    public static function checkConflictingScopes(int $jailOfficerId, string $newScopeType, ?int $newBuildingId, ?int $newDormitoryId, ?int $newCellId): array
    {
        $conflicts = [];
        
        // Get all active scopes for this officer
        $existingScopes = JailOfficerScope::where('jail_officer_id', $jailOfficerId)
            ->where('is_active', true)
            ->get();

        foreach ($existingScopes as $existingScope) {
            // Check if new scope is a child of existing scope
            if (self::isNewScopeChildOfExisting($newScopeType, $newBuildingId, $newDormitoryId, $newCellId, $existingScope)) {
                $conflicts[] = "Cannot assign to {$newScopeType} because officer already has access to parent facility ({$existingScope->scope_type}).";
            }

            // Check if new scope is a parent of existing scope
            if (self::isNewScopeParentOfExisting($newScopeType, $newBuildingId, $newDormitoryId, $newCellId, $existingScope)) {
                $conflicts[] = "Cannot assign to {$newScopeType} because officer already has access to child facility ({$existingScope->scope_type}).";
            }
        }

        return $conflicts;
    }

    /**
     * Check if the new scope is a child of an existing scope.
     */
    protected static function isNewScopeChildOfExisting(string $newScopeType, ?int $newBuildingId, ?int $newDormitoryId, ?int $newCellId, JailOfficerScope $existingScope): bool
    {
        // New scope: cell
        if ($newScopeType === 'cell' && $newCellId) {
            $cell = Cell::find($newCellId);
            if (!$cell) return false;

            // Existing: building/annex (parent of cell)
            if (($existingScope->scope_type === 'building' || $existingScope->scope_type === 'annex') && $existingScope->building_id) {
                // Cell -> Dormitory -> Annex/Building
                return $cell->dormitory && $cell->dormitory->annex_id === $existingScope->building_id;
            }

            // Existing: dormitory (parent of cell)
            if ($existingScope->scope_type === 'dormitory' && $existingScope->dormitory_id) {
                // Cell -> Dormitory
                return $cell->dormitory_id === $existingScope->dormitory_id;
            }
        }

        // New scope: dormitory
        if ($newScopeType === 'dormitory' && $newDormitoryId) {
            $dormitory = Dormitory::find($newDormitoryId);
            if (!$dormitory) return false;

            // Existing: building/annex (parent of dormitory)
            if (($existingScope->scope_type === 'building' || $existingScope->scope_type === 'annex') && $existingScope->building_id) {
                // Dormitory -> Annex/Building
                return $dormitory->annex_id === $existingScope->building_id;
            }
        }

        return false;
    }

    /**
     * Check if the new scope is a parent of an existing scope.
     */
    protected static function isNewScopeParentOfExisting(string $newScopeType, ?int $newBuildingId, ?int $newDormitoryId, ?int $newCellId, JailOfficerScope $existingScope): bool
    {
        // Existing scope: cell
        if ($existingScope->scope_type === 'cell' && $existingScope->cell_id) {
            $cell = Cell::find($existingScope->cell_id);
            if (!$cell) return false;

            // New: building/annex (parent of cell)
            if (($newScopeType === 'building' || $newScopeType === 'annex') && $newBuildingId) {
                // Cell -> Dormitory -> Annex/Building
                return $cell->dormitory && $cell->dormitory->annex_id === $newBuildingId;
            }

            // New: dormitory (parent of cell)
            if ($newScopeType === 'dormitory' && $newDormitoryId) {
                // Cell -> Dormitory
                return $cell->dormitory_id === $newDormitoryId;
            }
        }

        // Existing scope: dormitory
        if ($existingScope->scope_type === 'dormitory' && $existingScope->dormitory_id) {
            $dormitory = Dormitory::find($existingScope->dormitory_id);
            if (!$dormitory) return false;

            // New: building/annex (parent of dormitory)
            if (($newScopeType === 'building' || $newScopeType === 'annex') && $newBuildingId) {
                // Dormitory -> Annex/Building
                return $dormitory->annex_id === $newBuildingId;
            }
        }

        return false;
    }

    /**
     * Validate that the facility is active.
     */
    public static function validateFacilityActive(string $scopeType, ?int $facilityId): bool
    {
        if (!$facilityId) {
            return true;
        }

        return match ($scopeType) {
            'dormitory' => Dormitory::where('id', $facilityId)->where('status', 'active')->exists(),
            'annex' => \App\Models\Annex::where('id', $facilityId)->where('status', 'active')->exists(),
            'building' => \App\Models\Annex::where('id', $facilityId)->where('status', 'active')->exists(),
            'cell' => Cell::where('id', $facilityId)->where('status', 'active')->exists(),
            default => false,
        };
    }
}
