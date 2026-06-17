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
            'dormitory' => Dormitory::join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('dormitories.id', $facilityId)
                ->exists(),
            
            'building' => Building::join('dormitories', 'buildings.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branchId)
                ->where('buildings.id', $facilityId)
                ->exists(),
            
            'cell' => Cell::join('buildings', 'cells.building_id', '=', 'buildings.id')
                ->join('dormitories', 'buildings.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
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
            'building' => $buildingId !== null && $dormitoryId === null && $cellId === null,
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
        // If existing is dormitory, new cannot be building or cell in that dormitory
        if ($existingScope->scope_type === 'dormitory') {
            if ($newScopeType === 'building' && $newBuildingId) {
                $building = Building::find($newBuildingId);
                return $building && $building->dormitory_id === $existingScope->dormitory_id;
            }
            
            if ($newScopeType === 'cell' && $newCellId) {
                $cell = Cell::with('building')->find($newCellId);
                return $cell && $cell->building && $cell->building->dormitory_id === $existingScope->dormitory_id;
            }
        }

        // If existing is building, new cannot be cell in that building
        if ($existingScope->scope_type === 'building') {
            if ($newScopeType === 'cell' && $newCellId) {
                $cell = Cell::find($newCellId);
                return $cell && $cell->building_id === $existingScope->building_id;
            }
        }

        return false;
    }

    /**
     * Check if the new scope is a parent of an existing scope.
     */
    protected static function isNewScopeParentOfExisting(string $newScopeType, ?int $newBuildingId, ?int $newDormitoryId, ?int $newCellId, JailOfficerScope $existingScope): bool
    {
        // If new is dormitory, existing cannot be building or cell in that dormitory
        if ($newScopeType === 'dormitory') {
            if ($existingScope->scope_type === 'building' && $existingScope->building_id) {
                $building = Building::find($existingScope->building_id);
                return $building && $building->dormitory_id === $newDormitoryId;
            }
            
            if ($existingScope->scope_type === 'cell' && $existingScope->cell_id) {
                $cell = Cell::with('building')->find($existingScope->cell_id);
                return $cell && $cell->building && $cell->building->dormitory_id === $newDormitoryId;
            }
        }

        // If new is building, existing cannot be cell in that building
        if ($newScopeType === 'building') {
            if ($existingScope->scope_type === 'cell' && $existingScope->cell_id) {
                $cell = Cell::find($existingScope->cell_id);
                return $cell && $cell->building_id === $newBuildingId;
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
            'building' => Building::where('id', $facilityId)->where('status', 'active')->exists(),
            'cell' => Cell::where('id', $facilityId)->where('status', 'active')->exists(),
            default => false,
        };
    }
}
