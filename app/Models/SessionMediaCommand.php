<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionMediaCommand extends Model
{
    protected $fillable = [
        'room_id',
        'command',
        'issued_by',
        'executed',
        'executed_at',
    ];

    protected $casts = [
        'executed' => 'boolean',
        'executed_at' => 'datetime',
    ];

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function markAsExecuted(): void
    {
        $this->update([
            'executed' => true,
            'executed_at' => now(),
        ]);
    }

    public function scopePending($query)
    {
        return $query->where('executed', false);
    }

    public function scopeForRoom($query, string $roomId)
    {
        return $query->where('room_id', $roomId);
    }
}
