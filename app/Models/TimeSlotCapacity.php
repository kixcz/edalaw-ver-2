<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeSlotCapacity extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'branch_id',
        'time_slot',
        'visit_type',
        'max_capacity',
        'duration_minutes',
        'interval_minutes',
        'start_time',
        'end_time',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'branch_id' => 'integer',
            'max_capacity' => 'integer',
            'duration_minutes' => 'integer',
            'interval_minutes' => 'integer',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
        ];
    }

    /**
     * Get the branch this time slot belongs to.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get time configuration for a branch and visit type.
     * Prioritizes branch-specific config, falls back to global (null branch_id).
     */
    public static function getTimeConfig(?int $branchId, string $visitType): ?self
    {
        return self::where('visit_type', $visitType)
            ->where(function ($query) use ($branchId) {
                if ($branchId) {
                    $query->where('branch_id', $branchId)
                        ->orWhereNull('branch_id');
                } else {
                    $query->whereNull('branch_id');
                }
            })
            ->orderByRaw('CASE WHEN branch_id IS NULL THEN 1 ELSE 0 END')
            ->first();
    }

    /**
     * Get the default start time for a visit type.
     */
    public static function getStartTime(string $visitType, ?int $branchId = null): string
    {
        $config = self::getTimeConfig($branchId, $visitType);
        return $config?->start_time?->format('H:i') ?? '07:00';
    }

    /**
     * Get the default end time for a visit type.
     */
    public static function getEndTime(string $visitType, ?int $branchId = null): string
    {
        $config = self::getTimeConfig($branchId, $visitType);
        $defaultEndTime = $visitType === 'virtual' ? '22:00' : '18:00';
        return $config?->end_time?->format('H:i') ?? $defaultEndTime;
    }

    /**
     * Get the default capacity for a time slot if not configured.
     */
    public static function getCapacity(string $timeSlot, string $visitType, ?int $branchId = null, int $default = 4): int
    {
        $query = self::where('time_slot', $timeSlot)
            ->where('visit_type', $visitType);
        
        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                    ->orWhereNull('branch_id');
            });
        } else {
            $query->whereNull('branch_id');
        }
        
        $capacity = $query->orderByRaw('CASE WHEN branch_id IS NULL THEN 1 ELSE 0 END')
            ->first();

        return $capacity ? $capacity->max_capacity : $default;
    }

    /**
     * Get the current booking count for a time slot on a specific date.
     * Matches scheduled_time in H:i format (DB may store as HH:MM:SS).
     */
    public static function getCurrentBookings(string $date, string $timeSlot, string $visitType): int
    {
        return \App\Models\Visit::where('scheduled_date', $date)
            ->whereRaw('(scheduled_time = ? OR TIME_FORMAT(scheduled_time, \'%H:%i\') = ?)', [$timeSlot, $timeSlot])
            ->where('visit_type', $visitType)
            ->whereIn('status', [\App\VisitStatus::Pending, \App\VisitStatus::Approved])
            ->count();
    }

    /**
     * Check if a time slot is available.
     */
    public static function isAvailable(string $date, string $timeSlot, string $visitType, ?int $branchId = null, ?int $excludeVisitId = null): bool
    {
        $capacity = self::getCapacity($timeSlot, $visitType, $branchId);
        $currentBookings = self::getCurrentBookings($date, $timeSlot, $visitType);

        // Exclude the current visit if rescheduling
        if ($excludeVisitId) {
            $excludeVisit = \App\Models\Visit::find($excludeVisitId);
            if ($excludeVisit &&
                $excludeVisit->scheduled_date->format('Y-m-d') === $date &&
                $excludeVisit->scheduled_time === $timeSlot &&
                $excludeVisit->visit_type->value === $visitType) {
                $currentBookings--;
            }
        }

        return $currentBookings < $capacity;
    }
}
