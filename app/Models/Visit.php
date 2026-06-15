<?php

namespace App\Models;

use App\Services\NotificationService;
use App\VisitStatus;
use App\VisitType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Visit extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'jail_officer_id',
        'inmate_id',
        'jail_id',
        'scheduled_date',
        'scheduled_time',
        'visit_type',
        'inmate_first_name',
        'inmate_middle_name',
        'inmate_last_name',
        'relationship_to_inmate',
        'status',
        'notes',
        'relationship_proof_file_id',
        'additional_proof_file_id',
        'relationship_proof_path',
        'additional_proof_path',
        'meeting_link',
        'access_key',
        'access_key_expires_at',
        'qr_code_data',
        'rejection_reason',
        'daily_co_room_id',
        'daily_co_room_name',
        'daily_co_room_url',
        'daily_co_config',
        'inmate_token',
        'room_created_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'visit_type' => VisitType::class,
            'status' => VisitStatus::class,
            'access_key_expires_at' => 'datetime',
            'daily_co_config' => 'array',
            'room_created_at' => 'datetime',
        ];
    }

    /**
     * Generate a unique access key for physical visits.
     * Returns a random 8-12 character alphanumeric key.
     */
    public static function generateAccessKey(): string
    {
        do {
            // Generate random length between 8-12 characters
            $length = random_int(8, 12);
            $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $key = '';
            for ($i = 0; $i < $length; $i++) {
                $key .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (self::where('access_key', $key)->exists());

        return $key;
    }

    /**
     * Generate QR code data for physical visits.
     * The QR code contains visit information in JSON format.
     */
    public static function generateQRCodeData(Visit $visit): string
    {
        $qrData = [
            'visit_id' => $visit->id,
            'visitor_email' => $visit->user->email,
            'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
            'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
            'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
            'scheduled_time' => $visit->scheduled_time,
            'unique_token' => bin2hex(random_bytes(16)),
        ];

        return json_encode($qrData);
    }

    /**
     * Build slot start datetime in application timezone (avoids timezone/parsing issues).
     */
    private function getSlotStart(): Carbon
    {
        $dateStr = $this->scheduled_date->format('Y-m-d');
        $timeStr = $this->scheduled_time;
        if (! $timeStr) {
            return Carbon::parse($dateStr, config('app.timezone'))->startOfDay();
        }
        $parts = explode(':', trim($timeStr), 2);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) (isset($parts[1]) ? explode(' ', $parts[1])[0] : 0);
        $timeNormalized = sprintf('%02d:%02d', $h, $m);

        return Carbon::parse($dateStr.' '.$timeNormalized, config('app.timezone'));
    }

    /**
     * Whether the scheduled slot has started (current time is at or after scheduled start).
     */
    public function isScheduleStarted(): bool
    {
        $start = $this->getSlotStart();

        return now()->gte($start);
    }

    /**
     * Whether the scheduled date and time have passed (no longer valid for approval or joining).
     * Virtual visits: 10-minute slot. Physical visits: 1-hour slot.
     */
    public function isScheduleInPast(): bool
    {
        if (! $this->scheduled_time) {
            return now()->isAfter($this->scheduled_date->copy()->endOfDay());
        }

        $slotStart = $this->getSlotStart();
        $slotEnd = $slotStart->copy()->addHour();

        return now()->isAfter($slotEnd);
    }

    /**
     * Check if the access key is valid (exists and not expired).
     */
    public function isAccessKeyValid(): bool
    {
        if (! $this->access_key || ! $this->access_key_expires_at) {
            return false;
        }

        return now()->isBefore($this->access_key_expires_at);
    }

    /**
     * Get the user that owns the visit.
     *
     * @return BelongsTo<User, Visit>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the inmate for this visit.
     *
     * @return BelongsTo<Inmate, Visit>
     */
    public function inmate(): BelongsTo
    {
        return $this->belongsTo(Inmate::class);
    }

    /**
     * Get the jail that this visit is associated with.
     *
     * @return BelongsTo<Jail, Visit>
     */
    public function jail(): BelongsTo
    {
        return $this->belongsTo(Jail::class);
    }

    /**
     * Get the branch through the jail.
     */
    public function branch(): HasOneThrough
    {
        return $this->hasOneThrough(Branch::class, Jail::class);
    }

    /**
     * Get the relationship proof file for this visit.
     *
     * @return BelongsTo<UploadedFile, Visit>
     */
    public function relationshipProofFile(): BelongsTo
    {
        return $this->belongsTo(UploadedFile::class, 'relationship_proof_file_id');
    }

    /**
     * Get the additional proof file for this visit.
     *
     * @return BelongsTo<UploadedFile, Visit>
     */
    public function additionalProofFile(): BelongsTo
    {
        return $this->belongsTo(UploadedFile::class, 'additional_proof_file_id');
    }

    /**
     * Get the jail officer assigned to the visit.
     *
     * @return BelongsTo<User, Visit>
     */
    public function jailOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'jail_officer_id');
    }

    /**
     * Get the visit sessions for this visit.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<VisitSession>
     */
    public function visitSessions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(VisitSession::class);
    }

    /**
     * Get the appeals for the visit.
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphMany<Appeal>
     */
    public function appeals(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Appeal::class, 'appealable');
    }

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::updated(function ($visit) {
            // Check if status has changed
            if ($visit->wasChanged('status') && $visit->status !== VisitStatus::Pending) {
                NotificationService::createVisitNotification($visit, $visit->status->value);
            }
        });
    }
}
