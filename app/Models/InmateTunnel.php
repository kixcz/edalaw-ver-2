<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class InmateTunnel extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'visit_session_id',
        'tunnel_token',
        'short_code',
        'expires_at',
        'is_used',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'is_used' => 'boolean',
        ];
    }

    public function visitSession(): BelongsTo
    {
        return $this->belongsTo(VisitSession::class);
    }

    /**
     * Get the inmate associated with this tunnel through the visit session.
     * For visits: gets inmate from visit record
     * For eburol: gets inmate from eburol record
     */
    public function getInmateAttribute(): ?object
    {
        $session = $this->visitSession;
        if (!$session) {
            return null;
        }

        // Try to get inmate from visit
        if ($session->visit_id && $session->visit) {
            $visit = $session->visit;
            return (object) [
                'id' => null, // Visit doesn't have direct inmate ID
                'full_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                'first_name' => $visit->inmate_first_name,
                'middle_name' => $visit->inmate_middle_name,
                'last_name' => $visit->inmate_last_name,
            ];
        }

        // Try to get inmate from eburol
        if ($session->eburol_id && $session->eburol) {
            $eburol = $session->eburol;
            return (object) [
                'id' => null, // Eburol doesn't have direct inmate ID
                'full_name' => trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}"),
                'first_name' => $eburol->inmate_first_name,
                'middle_name' => $eburol->inmate_middle_name,
                'last_name' => $eburol->inmate_last_name,
            ];
        }

        return null;
    }

    public function isValid(): bool
    {
        return ! $this->is_used && $this->expires_at->isFuture();
    }

    public static function generateToken(): string
    {
        return Str::uuid()->toString();
    }

    /**
     * Generate a short 8-character alphanumeric code for inmate tunnel (easy to type).
     */
    public static function generateShortCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0/O, 1/I
        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (self::where('short_code', $code)->exists());

        return $code;
    }
}
