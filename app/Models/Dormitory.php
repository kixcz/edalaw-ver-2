<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasBranchScopeThroughRelation;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Dormitory extends Model
{
    use HasFactory, HasBranchScopeThroughRelation;

    /**
     * The relationship path to resolve branch.
     */
    protected string $branchRelationshipPath = 'annex';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'annex_id',
        'name',
        'type',
        'description',
        'status',
    ];

    /**
     * Get the annex that owns this dormitory.
     *
     * @return BelongsTo<Annex>
     */
    public function annex(): BelongsTo
    {
        return $this->belongsTo(Annex::class);
    }

    /**
     * Get the jail that owns this dormitory.
     *
     * @return BelongsTo<Jail>
     */
    public function jail(): BelongsTo
    {
        return $this->belongsTo(Jail::class);
    }

    /**
     * Get the branch through the annex.
     */
    public function branch(): HasOneThrough
    {
        return $this->hasOneThrough(Branch::class, Annex::class);
    }

    /**
     * Get the cells in this dormitory.
     */
    public function cells(): HasMany
    {
        return $this->hasMany(Cell::class);
    }

    /**
     * Scope a query to only include active dormitories.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the total number of inmates across all cells in this dormitory.
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
     * Get the total capacity across all cells in this dormitory.
     */
    public function getTotalCapacityAttribute(): int
    {
        return $this->cells()->sum('capacity');
    }
}
