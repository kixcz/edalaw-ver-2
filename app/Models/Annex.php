<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use App\Traits\HasBranchScopeThroughRelation;

class Annex extends Model
{
    use HasFactory, HasBranchScopeThroughRelation;

    /**
     * The relationship path to resolve branch.
     */
    protected string $branchRelationshipPath = 'branch';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'branch_id',
        'name',
        'description',
        'status',
    ];

    /**
     * Get the dormitory that owns this annex.
     *
     * @return BelongsTo<Dormitory>
     */
    public function dormitory(): BelongsTo
    {
        return $this->belongsTo(Dormitory::class);
    }

    /**
     * Get the branch that owns this annex.
     *
     * @return BelongsTo<Branch>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the dormitories in this annex.
     */
    public function dormitories(): HasMany
    {
        return $this->hasMany(Dormitory::class);
    }

    /**
     * Get all cells through dormitories.
     */
    public function cells(): HasManyThrough
    {
        return $this->hasManyThrough(Cell::class, Dormitory::class);
    }

    /**
     * Scope a query to only include active annexes.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the total number of inmates across all cells in this annex.
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
     * Get the total capacity across all cells in this annex.
     */
    public function getTotalCapacityAttribute(): int
    {
        return $this->cells()->sum('capacity');
    }
}
