<?php

namespace App\Services;

use App\Models\Annex;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\JailOfficerScope;
use App\Models\User;
use Illuminate\Support\Collection;

class JailOfficerScopeResolver
{
    /**
     * Resolve all cell IDs accessible by the JO based on their active scopes.
     *
     * Logic:
     * - Dormitory scope → all cells in all buildings within that dormitory
     * - Building scope → all cells within that building
     * - Cell scope → only that specific cell
     */
    public function getAuthorizedCellIds(User $jailOfficer): array
    {
        if (!$jailOfficer->isJailOfficer()) {
            return [];
        }

        $activeScopes = $jailOfficer->assignedScopes()->where('is_active', true)->get();
        $cellIds = [];

        foreach ($activeScopes as $scope) {
            $cellIds = array_merge($cellIds, $scope->getAuthorizedCellIds());
        }

        return array_unique($cellIds);
    }

    /**
     * Resolve all building IDs accessible by the JO based on their active scopes.
     *
     * Logic:
     * - Dormitory scope → all buildings within that dormitory
     * - Building scope → only that specific building
     * - Cell scope → the building containing that cell
     */
    public function getAuthorizedBuildingIds(User $jailOfficer): array
    {
        if (!$jailOfficer->isJailOfficer()) {
            return [];
        }

        $activeScopes = $jailOfficer->assignedScopes()->where('is_active', true)->get();
        $buildingIds = [];

        foreach ($activeScopes as $scope) {
            $buildingIds = array_merge($buildingIds, $scope->getAuthorizedBuildingIds());
        }

        return array_unique($buildingIds);
    }

    /**
     * Resolve all dormitory IDs accessible by the JO based on their active scopes.
     *
     * Logic:
     * - Dormitory scope → only that specific dormitory
     * - Building scope → the dormitory containing that building
     * - Cell scope → the dormitory containing the building that contains the cell
     */
    public function getAuthorizedDormitoryIds(User $jailOfficer): array
    {
        if (!$jailOfficer->isJailOfficer()) {
            return [];
        }

        $activeScopes = $jailOfficer->assignedScopes()->where('is_active', true)->get();
        $dormitoryIds = [];

        foreach ($activeScopes as $scope) {
            $dormitoryIds = array_merge($dormitoryIds, $scope->getAuthorizedDormitoryIds());
        }

        return array_unique($dormitoryIds);
    }

    /**
     * Resolve all inmate (PDL) IDs accessible by the JO based on their active scopes.
     */
    public function getAuthorizedInmateIds(User $jailOfficer): array
    {
        $cellIds = $this->getAuthorizedCellIds($jailOfficer);

        if (empty($cellIds)) {
            return [];
        }

        return Inmate::whereIn('cell_id', $cellIds)->pluck('id')->toArray();
    }

    /**
     * Get the JO's highest scope level (dormitory > building > cell).
     *
     * Priority: dormitory (highest) > building > cell (lowest)
     */
    public function getHighestScopeLevel(User $jailOfficer): ?string
    {
        if (!$jailOfficer->isJailOfficer()) {
            return null;
        }

        $activeScopes = $jailOfficer->assignedScopes()
            ->where('is_active', true)
            ->pluck('scope_type')
            ->toArray();

        if (empty($activeScopes)) {
            return null;
        }

        // Return highest level
        if (in_array('dormitory', $activeScopes)) {
            return 'dormitory';
        }

        if (in_array('building', $activeScopes) || in_array('annex', $activeScopes)) {
            return 'building';
        }

        if (in_array('cell', $activeScopes)) {
            return 'cell';
        }

        return null;
    }

    /**
     * Check if JO has any active scope assignments.
     */
    public function hasActiveScope(User $jailOfficer): bool
    {
        if (!$jailOfficer->isJailOfficer()) {
            return false;
        }

        return $jailOfficer->assignedScopes()
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Get a summary of all active scopes with facility details.
     */
    public function getScopeSummary(User $jailOfficer): array
    {
        if (!$jailOfficer->isJailOfficer()) {
            return [];
        }

        $activeScopes = $jailOfficer->assignedScopes()
            ->where('is_active', true)
            ->with(['annex', 'dormitory', 'cell'])
            ->get();

        return $activeScopes->map(function ($scope) {
            $isBuildingScope = in_array($scope->scope_type, ['building', 'annex']);
            return [
                'id' => $scope->id,
                'scope_type' => $scope->scope_type,
                'facility_id' => $scope->annex_id ?? $scope->dormitory_id ?? $scope->cell_id,
                'facility_name' => $isBuildingScope
                    ? $scope->building?->name
                    : ($scope->scope_type === 'dormitory'
                        ? $scope->dormitory?->name
                        : 'Cell ' . ($scope->cell?->cell_number ?? 'Unknown')),
                'hierarchy' => $this->getFacilityHierarchy($scope),
            ];
        })->toArray();
    }

    /**
     * Get the facility hierarchy string for a scope.
     * Example: "Cell 101 → Annex A → Male Dormitory"
     */
    protected function getFacilityHierarchy(JailOfficerScope $scope): string
    {
        if ($scope->scope_type === 'dormitory') {
            return $scope->dormitory?->name ?? 'Unknown Dormitory';
        }

        if (in_array($scope->scope_type, ['building', 'annex'])) {
            $building = $scope->building;
            $dormitory = $building?->dormitories?->first();
            return ($building?->name ?? 'Unknown Building') .
                ($dormitory ? ' → ' . $dormitory->name : '');
        }

        if ($scope->scope_type === 'cell') {
            $cell = $scope->cell;
            $building = $cell?->building;
            $dormitory = $cell?->dormitory;

            return 'Cell ' . ($cell?->cell_number ?? 'Unknown') .
                ($building ? ' → ' . ($building->name ?? 'Unknown Building') : '') .
                ($dormitory ? ' → ' . ($dormitory->name ?? 'Unknown Dormitory') : '');
        }

        return 'Unknown';
    }

    /**
     * Get all authorized cells as a collection with relationships.
     */
    public function getAuthorizedCells(User $jailOfficer): Collection
    {
        $cellIds = $this->getAuthorizedCellIds($jailOfficer);

        if (empty($cellIds)) {
            return collect();
        }

        return Cell::with(['building.dormitory', 'inmates'])
            ->whereIn('id', $cellIds)
            ->get();
    }

    /**
     * Get all authorized buildings as a collection with relationships.
     * Note: Uses Annex model (building is alias for annex in database)
     */
    public function getAuthorizedBuildings(User $jailOfficer): Collection
    {
        $buildingIds = $this->getAuthorizedBuildingIds($jailOfficer);

        if (empty($buildingIds)) {
            return collect();
        }

        return Annex::with(['dormitories', 'cells'])
            ->whereIn('id', $buildingIds)
            ->get();
    }

    /**
     * Alias for getAuthorizedBuildings() - uses "annex" terminology.
     */
    public function getAuthorizedAnnexes(User $jailOfficer): Collection
    {
        return $this->getAuthorizedBuildings($jailOfficer);
    }

    /**
     * Get all authorized dormitories as a collection with relationships.
     */
    public function getAuthorizedDormitories(User $jailOfficer): Collection
    {
        $dormitoryIds = $this->getAuthorizedDormitoryIds($jailOfficer);

        if (empty($dormitoryIds)) {
            return collect();
        }

        return Dormitory::with(['annex', 'cells'])
            ->whereIn('id', $dormitoryIds)
            ->get();
    }

    /**
     * Get all authorized inmates as a collection with relationships.
     */
    public function getAuthorizedInmates(User $jailOfficer): Collection
    {
        $cellIds = $this->getAuthorizedCellIds($jailOfficer);

        if (empty($cellIds)) {
            return collect();
        }

        return Inmate::with(['cell.building.dormitory'])
            ->whereIn('cell_id', $cellIds)
            ->get();
    }
}
