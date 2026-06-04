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
     * Get the dormitories for this jail.
     *
     * @return HasMany<Dormitory>
     */
    public function dormitories(): HasMany
    {
        return $this->hasMany(Dormitory::class);
    }

    /**
     * Get all inmates through cells.
     */
    public function inmates(): HasManyThrough
    {
        return $this->hasManyThrough(Inmate::class, Cell::class, 'annex_id', 'cell_id')
            ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->where('dormitories.jail_id', $this->id);
    }

    /**
     * Get all visits for this jail.
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * Get all annexes through dormitories.
     */
    public function annexes(): HasManyThrough
    {
        return $this->hasManyThrough(Annex::class, Dormitory::class);
    }

    /**
     * Get all cells through dormitories and annexes.
     */
    public function cells(): HasManyThrough
    {
        return $this->hasManyThrough(Cell::class, Dormitory::class, 'annex_id');
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
