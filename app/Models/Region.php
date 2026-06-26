<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Region extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'status',
    ];

    /**
     * Get the branches for the region.
     */
    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Get all jails through branches.
     */
    public function jails(): HasManyThrough
    {
        return $this->hasManyThrough(Jail::class, Branch::class);
    }

    /**
     * Get all dormitories through branches, jails, and annexes.
     */
    public function dormitories()
    {
        return Dormitory::query()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $this->id);
    }

    /**
     * Get all cells through branches, jails, annexes, and dormitories.
     */
    public function cells()
    {
        return Cell::query()
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $this->id);
    }

    /**
     * Scope a query to only include active regions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get all jails across all branches in this region.
     */
    public function getAllJailsCountAttribute(): int
    {
        return $this->branches()
            ->withCount('jails')
            ->get()
            ->sum('jails_count');
    }
}
