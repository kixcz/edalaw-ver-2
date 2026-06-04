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
     * Get all dormitories through branches and jails.
     */
    public function dormitories(): HasManyThrough
    {
        return $this->hasManyThrough(Dormitory::class, Branch::class, 'id', 'jail_id', 'id', 'branch_id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id');
    }

    /**
     * Get all cells through branches, jails, and dormitories/annexes.
     */
    public function cells(): HasManyThrough
    {
        return $this->hasManyThrough(Cell::class, Branch::class, 'id', 'branch_id', 'id', 'annex_id')
            ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id');
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
