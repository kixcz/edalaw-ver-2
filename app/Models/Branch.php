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
     * Get the jails for this branch.
     */
    public function jails(): HasMany
    {
        return $this->hasMany(Jail::class);
    }

    /**
     * Get all dormitories through jails.
     */
    public function dormitories(): HasManyThrough
    {
        return $this->hasManyThrough(Dormitory::class, Jail::class);
    }

    /**
     * Get all annexes through jails and dormitories.
     */
    public function annexes(): HasManyThrough
    {
        return $this->hasManyThrough(Annex::class, Dormitory::class, 'jail_id', 'dormitory_id');
    }

    /**
     * Get all cells through jails, dormitories, and annexes.
     * Note: This uses a query builder approach since HasManyThrough
     * doesn't support more than 2 levels directly.
     */
    public function cells()
    {
        return Cell::query()
            ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $this->id)
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
     * Get all visits through jails.
     */
    public function visits(): HasManyThrough
    {
        return $this->hasManyThrough(Visit::class, Jail::class);
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
