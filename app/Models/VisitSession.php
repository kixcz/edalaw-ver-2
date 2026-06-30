<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class VisitSession extends Model
{
    // Removed HasBranchScope trait - scoping is done through visit relationship
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'visit_id',
        'eburol_id',
        'jail_id',
        'room_id',
        'session_id',
        'monitor_id',
        'scheduled_start',
        'scheduled_end',
        'status',
        'recording_status',
        'recording_url',
        'duration_seconds',
        'end_reason',
        'started_at',
        'ended_at',
        'terms_accepted_at',
        'session_consent_accepted',
        'session_consent_timestamp',
        'join_reminder_sent_at',
        'chat_locked',
        'visitor_joined_at',
        'inmate_joined_at',
        'visitor_participant_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'session_consent_accepted' => 'boolean',
            'session_consent_timestamp' => 'datetime',
            'join_reminder_sent_at' => 'datetime',
            'chat_locked' => 'boolean',
            'visitor_joined_at' => 'datetime',
            'inmate_joined_at' => 'datetime',
            'session_id' => 'string',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    /**
     * Get the jail that this session is associated with.
     *
     * @return BelongsTo<Jail, VisitSession>
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

    public function eburol(): BelongsTo
    {
        return $this->belongsTo(Eburol::class);
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'monitor_id');
    }

    /**
     * @return HasMany<InmateTunnel>
     */
    public function inmateTunnels(): HasMany
    {
        return $this->hasMany(InmateTunnel::class);
    }

    /**
     * @return HasMany<SystemLog>
     */
    public function systemLogs(): HasMany
    {
        return $this->hasMany(SystemLog::class);
    }

    public function isWithinSchedule(): bool
    {
        $tz = config('app.timezone');
        $now = now($tz);
        $start = $this->scheduled_start->copy()->setTimezone($tz);
        $end = $this->scheduled_end->copy()->setTimezone($tz);

        return $now->between($start, $end);
    }

    /**
     * Whether we are within the window where generating an inmate tunnel is allowed.
     * Allows from the start of the scheduled date until scheduled_end so the officer can generate the link in advance.
     */
    public function isWithinScheduleForTunnel(): bool
    {
        $tz = config('app.timezone');
        $now = now($tz);
        $start = $this->scheduled_start->copy()->setTimezone($tz);
        $end = $this->scheduled_end->copy()->setTimezone($tz);
        $windowStart = $start->copy()->startOfDay();

        return $now->between($windowStart, $end);
    }

    public function isCompleted(): bool
    {
        return in_array($this->status, ['completed', 'terminated', 'locked', 'no_show', 'unsuccessful'], true);
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }

    /**
     * @return HasMany<VideoRecording>
     */
    public function videoRecordings(): HasMany
    {
        return $this->hasMany(VideoRecording::class);
    }

    /**
     * @return HasMany<ChatLog>
     */
    public function chatLogs(): HasMany
    {
        return $this->hasMany(ChatLog::class);
    }

    /**
     * @return HasMany<CallLog>
     */
    public function callLogs(): HasMany
    {
        return $this->hasMany(CallLog::class);
    }

    /**
     * @return HasMany<ChatExport>
     */
    public function chatExports(): HasMany
    {
        return $this->hasMany(ChatExport::class);
    }

    public function getVisitorAttribute(): ?User
    {
        if ($this->visit_id) {
            return $this->visit?->user;
        }
        if ($this->eburol_id) {
            return $this->eburol?->user;
        }

        return null;
    }

    public function getSessionTypeAttribute(): string
    {
        return $this->visit_id ? 'visit' : 'eburol';
    }
}
