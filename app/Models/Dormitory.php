<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Dormitory extends Model
{
    use HasFactory;

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
     * Alias for annex() - uses "building" terminology.
     *
     * @return BelongsTo<Annex>
     */
    public function building(): BelongsTo
    {
        return $this->annex();
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
