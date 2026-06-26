<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasBranchScope;

class Jail extends Model
{
    use HasFactory, HasBranchScope;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'location',
        'description',
        'status',
    ];

    /**
     * Get the branch that owns this jail.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the region through the branch.
     */
    public function region(): HasOneThrough
    {
        return $this->hasOneThrough(Region::class, Branch::class);
    }

    /**
     * Get the annexes for this jail.
     *
     * @return HasMany<Annex>
     */
    public function annexes(): HasMany
    {
        return $this->hasMany(Annex::class);
    }

    /**
     * Get all dormitories through annexes.
     */
    public function dormitories(): HasManyThrough
    {
        return $this->hasManyThrough(Dormitory::class, Annex::class);
    }

    /**
     * Get all inmates through annexes, dormitories, and cells.
     */
    public function inmates()
    {
        return Inmate::query()
            ->join('cells', 'inmates.cell_id', '=', 'cells.id')
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('annexes.jail_id', $this->id);
    }

    /**
     * Get all visits for this jail.
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * Get all cells through annexes and dormitories.
     */
    public function cells(): HasManyThrough
    {
        return $this->hasManyThrough(Cell::class, Dormitory::class, 'annex_id', 'dormitory_id');
    }

    /**
     * Scope a query to only include active jails.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the total number of inmates across all cells in this jail.
     */
    public function getTotalInmatesCountAttribute(): int
    {
        return $this->dormitories()
            ->with(['annexes.cells.inmates' => function ($q) {
                $q->where('status', 'active');
            }])
            ->get()
            ->sum(function ($dormitory) {
                return $dormitory->annexes->sum(function ($annex) {
                    return $annex->cells->sum('current_inmates_count');
                });
            });
    }

    /**
     * Get the total capacity across all cells in this jail.
     */
    public function getTotalCapacityAttribute(): int
    {
        return $this->dormitories()
            ->with(['annexes.cells'])
            ->get()
            ->sum(function ($dormitory) {
                return $dormitory->annexes->sum(function ($annex) {
                    return $annex->cells->sum('capacity');
                });
            });
    }
}
