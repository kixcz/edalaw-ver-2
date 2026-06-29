<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class JailOfficerScope extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'jail_officer_id',
        'assigned_by',
        'scope_type',
        'building_id',
        'dormitory_id',
        'cell_id',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the jail officer that owns this scope assignment.
     */
    public function jailOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'jail_officer_id');
    }

    /**
     * Get the assigned facility (annex, dormitory, or cell) for this scope.
     */
    public function scopeable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the jail warden who made this assignment.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Get the annex for this scope (if applicable).
     * Alias: building()
     */
    public function annex(): BelongsTo
    {
        return $this->belongsTo(Annex::class, 'building_id');
    }

    /**
     * Alias for annex() - uses "building" terminology.
     */
    public function building(): BelongsTo
    {
        return $this->annex();
    }

    /**
     * Get the dormitory for this scope (if applicable).
     */
    public function dormitory(): BelongsTo
    {
        return $this->belongsTo(Dormitory::class);
    }

    /**
     * Get the cell for this scope (if applicable).
     */
    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    /**
     * Get the effective scope description.
     */
    public function getScopeDescriptionAttribute(): string
    {
        return match($this->scope_type) {
            'building', 'annex' => "Building Level: {$this->building?->name}",
            'dormitory' => "Dormitory Level: {$this->dormitory?->name}",
            'cell' => "Cell Level: {$this->cell?->cell_number}",
            default => 'Unknown Scope',
        };
    }

    /**
     * Scope to only active assignments.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the effective facility entity (polymorphic resolution).
     * Note: Building is an alias for Annex
     */
    public function getScopeableEntity(): Annex|Dormitory|Cell|null
    {
        return match($this->scope_type) {
            'building', 'annex' => $this->building,
            'dormitory' => $this->dormitory,
            'cell' => $this->cell,
            default => null,
        };
    }

    /**
     * Get all child cell IDs for this scope.
     *
     * Logic:
     * - Dormitory scope → all cells in all buildings within that dormitory
     * - Building scope → all cells within that building
     * - Cell scope → only that specific cell
     */
    public function getAuthorizedCellIds(): array
    {
        return match($this->scope_type) {
            'dormitory' => $this->getCellsFromDormitory(),
            'building', 'annex' => $this->getCellsFromBuilding(),
            'cell' => $this->cell_id ? [$this->cell_id] : [],
            default => [],
        };
    }

    /**
     * Get all child building IDs for this scope.
     *
     * Logic:
     * - Dormitory scope → all buildings within that dormitory
     * - Building scope → only that specific building
     * - Cell scope → the building containing that cell
     */
    public function getAuthorizedBuildingIds(): array
    {
        return match($this->scope_type) {
            'dormitory' => $this->getBuildingsFromDormitory(),
            'building', 'annex' => $this->building_id ? [$this->building_id] : [],
            'cell' => $this->getBuildingFromCell(),
            default => [],
        };
    }

    /**
     * Alias for getAuthorizedBuildingIds() - uses "annex" terminology.
     */
    public function getAuthorizedAnnexIds(): array
    {
        return $this->getAuthorizedBuildingIds();
    }

    /**
     * Get all child dormitory IDs for this scope.
     *
     * Logic:
     * - Dormitory scope → only that specific dormitory
     * - Building scope → the dormitory containing that building
     * - Cell scope → the dormitory containing the building that contains the cell
     */
    public function getAuthorizedDormitoryIds(): array
    {
        return match($this->scope_type) {
            'dormitory' => $this->dormitory_id ? [$this->dormitory_id] : [],
            'building', 'annex' => $this->getDormitoryFromBuilding(),
            'cell' => $this->getDormitoryFromCell(),
            default => [],
        };
    }

    /**
     * Helper: Get all cells from a dormitory scope.
     * Note: cells have dormitory_id, dormitories have annex_id
     */
    protected function getCellsFromDormitory(): array
    {
        if (!$this->dormitory_id) {
            return [];
        }

        return Cell::where('dormitory_id', $this->dormitory_id)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Helper: Get all cells from a building scope.
     * Note: dormitories have annex_id, cells have dormitory_id
     */
    protected function getCellsFromBuilding(): array
    {
        if (!$this->building_id) {
            return [];
        }

        // Get all dormitories in this annex/building, then get all cells in those dormitories
        $dormitoryIds = Dormitory::where('annex_id', $this->building_id)->pluck('id')->toArray();
        
        return Cell::whereIn('dormitory_id', $dormitoryIds)->pluck('id')->toArray();
    }

    /**
     * Helper: Get all buildings from a dormitory scope.
     * Note: Uses Annex model (building is alias), dormitories have annex_id
     */
    protected function getBuildingsFromDormitory(): array
    {
        if (!$this->dormitory_id) {
            return [];
        }

        $dormitory = Dormitory::find($this->dormitory_id);
        return $dormitory && $dormitory->annex_id ? [$dormitory->annex_id] : [];
    }

    /**
     * Helper: Get the building containing a cell.
     * Note: cells have dormitory_id, dormitories have annex_id
     */
    protected function getBuildingFromCell(): array
    {
        if (!$this->cell_id) {
            return [];
        }

        $cell = Cell::with('dormitory.annex')->find($this->cell_id);
        return $cell && $cell->dormitory && $cell->dormitory->annex 
            ? [$cell->dormitory->annex->id] 
            : [];
    }

    /**
     * Helper: Get the dormitory containing a building.
     * Note: Uses Dormitory model, dormitories have annex_id
     */
    protected function getDormitoryFromBuilding(): array
    {
        if (!$this->building_id) {
            return [];
        }

        // Find dormitories that belong to this annex/building
        $dormitoryIds = Dormitory::where('annex_id', $this->building_id)->pluck('id')->toArray();
        return $dormitoryIds;
    }

    /**
     * Helper: Get the dormitory containing a cell (through cell's dormitory_id).
     */
    protected function getDormitoryFromCell(): array
    {
        if (!$this->cell_id) {
            return [];
        }

        $cell = Cell::find($this->cell_id);
        return $cell && $cell->dormitory_id
            ? [$cell->dormitory_id]
            : [];
    }
}
