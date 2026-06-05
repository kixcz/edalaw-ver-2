<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Cell extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'annex_id',
        'cell_number',
        'capacity',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
        ];
    }

    /**
     * Get the annex that this cell belongs to.
     *
     * @return BelongsTo<Annex>
     */
    public function annex(): BelongsTo
    {
        return $this->belongsTo(Annex::class);
    }

    /**
     * Get the dormitory through the annex.
     */
    public function dormitory(): \Illuminate\Database\Eloquent\Relations\HasOneThrough
    {
        return $this->hasOneThrough(Dormitory::class, Annex::class, 'id', 'id', 'annex_id', 'dormitory_id');
    }

    /**
     * Get the branch through the dormitory and annex.
     */
    public function branch(): HasOneThrough
    {
        return $this->hasOneThrough(Branch::class, Annex::class, 'dormitory_id', 'id', 'dormitory_id', 'branch_id');
    }

    /**
     * Get the inmates in this cell.
     *
     * @return HasMany<Inmate>
     */
    public function inmates(): HasMany
    {
        return $this->hasMany(Inmate::class);
    }

    /**
     * Get the jail officer scopes for this cell.
     */
    public function jailOfficerScopes(): HasMany
    {
        return $this->hasMany(JailOfficerScope::class);
    }

    /**
     * Get the schedule templates for this cell.
     *
     * @return HasMany<CellScheduleTemplate>
     */
    public function scheduleTemplates(): HasMany
    {
        return $this->hasMany(CellScheduleTemplate::class);
    }

    /**
     * Scope a query to only include active cells.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the current number of active inmates in this cell.
     */
    public function getCurrentInmatesCountAttribute(): int
    {
        return $this->inmates()->where('status', 'active')->count();
    }

    /**
     * Check if the cell has available capacity.
     */
    public function hasAvailableCapacity(): bool
    {
        return $this->current_inmates_count < $this->capacity;
    }
}
