<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Inmate extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'inmate_number',
        'cell_id',
        'date_of_birth',
        'status',
    ];

    /**
     * Get the full name of the inmate.
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
    }

    /**
     * Get the visits for this inmate.
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * Get the cell that this inmate is assigned to.
     */
    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    /**
     * Get the annex through the cell.
     */
    public function annex(): HasOneThrough
    {
        return $this->hasOneThrough(Annex::class, Cell::class);
    }

    /**
     * Get the dormitory through the cell and annex.
     */
    public function dormitory(): HasOneThrough
    {
        return $this->hasOneThrough(Dormitory::class, Cell::class, 'annex_id', 'id', 'cell_id', 'dormitory_id');
    }

    /**
     * Get the jail through the cell, annex, and dormitory.
     */
    public function jail(): HasOneThrough
    {
        return $this->hasOneThrough(Jail::class, Cell::class, 'annex_id', 'id', 'cell_id', 'jail_id');
    }
}
