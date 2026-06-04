<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Branch extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'region_id',
        'name',
        'code',
        'description',
        'status',
    ];

    /**
     * Get the region that owns the branch.
     */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /**
     * Get the annexes for this branch.
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
     * Get all cells through annexes and dormitories.
     */
    public function cells()
    {
        // Get cells where the dormitory's annex belongs to this branch
        return Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('annexes.branch_id', $this->id)
            ->select('cells.*');
    }

    /**
     * Get the jail warden for this branch.
     */
    public function jailWarden()
    {
        $wardenRoleId = \App\Models\Role::where('slug', 'jail_warden')->value('id');
        return $this->hasOne(User::class)->where('role_id', $wardenRoleId);
    }

    /**
     * Get the users assigned to this branch.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scope a query to only include active branches.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the total number of inmates across all cells in this branch.
     */
    public function getTotalInmatesCountAttribute(): int
    {
        return $this->cells()
            ->withCount(['inmates' => function ($q) {
                $q->where('status', 'active');
            }])
            ->get()
            ->sum('inmates_count');
    }

    /**
     * Get the total capacity across all cells in this branch.
     */
    public function getTotalCapacityAttribute(): int
    {
        return $this->cells()->sum('capacity');
    }
}
