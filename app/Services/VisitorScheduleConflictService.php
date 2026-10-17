<?php

namespace App\Services;

use App\EburolStatus;
use App\Models\Eburol;
use App\Models\Visit;
use App\VisitStatus;

class VisitorScheduleConflictService
{
    /**
     * Check if the visitor already has a virtual visit or e-burol in the same time range on the same date.
     * Used to prevent double-booking.
     *
     * @param  int  $userId  Visitor user id
     * @param  string  $date  Date Y-m-d
     * @param  string  $timeStart  Slot start time e.g. "08:00"
     * @param  int  $durationMinutes  Slot duration (e.g. 60 for e-burol, dynamic for visit)
     * @param  int|null  $ignoreVisitId  Visit ID to exclude (e.g. during reschedule)
     * @param  \App\Models\Inmate|null  $inmate  Optional inmate context
     */
    public function hasConflict(int $userId, string $date, string $timeStart, int $durationMinutes, ?int $ignoreVisitId = null, $inmate = null): bool
    {
        $newStart = $this->timeToMinutes($timeStart);
        $newEnd = $newStart + $durationMinutes;

        $visits = Visit::where('user_id', $userId)
            ->where('scheduled_date', $date)
            ->whereIn('status', [VisitStatus::Pending, VisitStatus::Approved])
            ->when($ignoreVisitId, function ($query, $id) {
                $query->where('id', '!=', $id);
            })
            ->get();

        foreach ($visits as $visit) {
            $slotStart = $this->timeToMinutes($visit->scheduled_time);
            
            // Calculate actual dynamic duration for existing visit
            $visitTypeVal = $visit->visit_type->value ?? 'virtual';
            $slotDuration = $visit->duration_minutes ?? null;
            if (!$slotDuration) {
                $capacity = \App\Models\TimeSlotCapacity::where('visit_type', $visitTypeVal)
                    ->where('time_slot', '<=', $visit->scheduled_time)
                    ->orderBy('time_slot', 'desc')
                    ->first();
                if (!$capacity) {
                    $capacity = \App\Models\TimeSlotCapacity::where('visit_type', $visitTypeVal)->first();
                }
                $slotDuration = $capacity?->duration_minutes ?? ($visitTypeVal === 'virtual' ? 20 : 30);
            }

            $slotEnd = $slotStart + $slotDuration;
            if ($this->rangesOverlap($newStart, $newEnd, $slotStart, $slotEnd)) {
                return true;
            }
        }

        $eburols = Eburol::where('user_id', $userId)
            ->where('wake_start_date', '<=', $date)
            ->where('wake_end_date', '>=', $date)
            ->whereIn('status', [EburolStatus::Pending, EburolStatus::Approved])
            ->get();

        foreach ($eburols as $eburol) {
            if (! $eburol->preferred_time) {
                continue;
            }
            $slotStart = $this->timeToMinutes($eburol->preferred_time);
            $slotEnd = $slotStart + 60;
            if ($this->rangesOverlap($newStart, $newEnd, $slotStart, $slotEnd)) {
                return true;
            }
        }

        return false;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', trim($time), 3);
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);

        return $h * 60 + $m;
    }

    private function rangesOverlap(int $start1, int $end1, int $start2, int $end2): bool
    {
        return $start1 < $end2 && $start2 < $end1;
    }
}
