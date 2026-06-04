<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class JailOfficerScope extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'jail_officer_id',
        'assigned_by',
        'scope_type',
        'annex_id',
        'dormitory_id',
        'cell_id',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the jail officer that owns this scope assignment.
     */
    public function jailOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'jail_officer_id');
    }

    /**
     * Get the assigned facility (annex, dormitory, or cell) for this scope.
     */
    public function scopeable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the jail warden who made this assignment.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Get the annex for this scope (if applicable).
     */
    public function annex(): BelongsTo
    {
        return $this->belongsTo(Annex::class);
    }

    /**
     * Get the dormitory for this scope (if applicable).
     */
    public function dormitory(): BelongsTo
    {
        return $this->belongsTo(Dormitory::class);
    }

    /**
     * Get the cell for this scope (if applicable).
     */
    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    /**
     * Get the effective scope description.
     */
    public function getScopeDescriptionAttribute(): string
    {
        return match($this->scope_type) {
            'annex' => "Annex Level: {$this->annex?->name}",
            'dormitory' => "Dormitory Level: {$this->dormitory?->name}",
            'cell' => "Cell Level: {$this->cell?->cell_number}",
            default => 'Unknown Scope',
        };
    }

    /**
     * Scope to only active assignments.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
