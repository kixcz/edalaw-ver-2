<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TimeSlotCapacity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimeSlotConfigurationController extends Controller
{
    /**
     * Display the time slot capacity configuration page.
     */
    public function index(): Response
    {
        // Get operating hours from database for each visit type
        $virtualCap = TimeSlotCapacity::where('visit_type', 'virtual')->first();
        $physicalCap = TimeSlotCapacity::where('visit_type', 'physical')->first();
        
        $virtualStartTime = $virtualCap?->start_time?->format('H:i') ?? '07:00';
        $virtualEndTime = $virtualCap?->end_time?->format('H:i') ?? '22:00';
        $physicalStartTime = $physicalCap?->start_time?->format('H:i') ?? '07:00';
        $physicalEndTime = $physicalCap?->end_time?->format('H:i') ?? '18:00';
        
        // Get duration and interval settings
        $virtualDuration = TimeSlotCapacity::where('visit_type', 'virtual')
            ->orderByDesc('updated_at')
            ->value('duration_minutes') ?? 20;
        $virtualInterval = TimeSlotCapacity::where('visit_type', 'virtual')
            ->orderByDesc('updated_at')
            ->value('interval_minutes') ?? 5;
        $physicalDuration = TimeSlotCapacity::where('visit_type', 'physical')
            ->orderByDesc('updated_at')
            ->value('duration_minutes') ?? 30;
        $physicalInterval = TimeSlotCapacity::where('visit_type', 'physical')
            ->orderByDesc('updated_at')
            ->value('interval_minutes') ?? 10;
        
        // Generate virtual time slots based on dynamic operating hours
        $virtualSlots = [];
        [$startHour, $startMinute] = explode(':', $virtualStartTime);
        [$endHour, $endMinute] = explode(':', $virtualEndTime);
        
        $currentMinutes = ((int)$startHour) * 60 + (int)$startMinute;
        $endMinutes = ((int)$endHour) * 60 + (int)$endMinute;
        $slotInterval = $virtualDuration + $virtualInterval;
        
        while ($currentMinutes < $endMinutes) {
            $hour = intdiv($currentMinutes, 60);
            $minute = $currentMinutes % 60;
            $virtualSlots[] = sprintf('%02d:%02d', $hour, $minute);
            $currentMinutes += $slotInterval;
        }
        
        // Generate physical time slots based on dynamic operating hours
        $physicalSlots = [];
        [$startHour, $startMinute] = explode(':', $physicalStartTime);
        [$endHour, $endMinute] = explode(':', $physicalEndTime);
        
        $currentMinutes = ((int)$startHour) * 60 + (int)$startMinute;
        $endMinutes = ((int)$endHour) * 60 + (int)$endMinute;
        $slotInterval = $physicalDuration + $physicalInterval;
        
        while ($currentMinutes < $endMinutes) {
            $hour = intdiv($currentMinutes, 60);
            $minute = $currentMinutes % 60;
            $physicalSlots[] = sprintf('%02d:%02d', $hour, $minute);
            $currentMinutes += $slotInterval;
        }

        $capacities = TimeSlotCapacity::all()->keyBy(function ($capacity) {
            return $capacity->time_slot.'_'.$capacity->visit_type;
        });

        $capacityData = [];
        foreach ($virtualSlots as $timeSlot) {
            $key = $timeSlot.'_virtual';
            $capacity = $capacities->get($key);
            $capacityData[] = [
                'id' => $capacity?->id,
                'time_slot' => $timeSlot,
                'visit_type' => 'virtual',
                'max_capacity' => $capacity?->max_capacity ?? 4,
                'duration_minutes' => $virtualDuration,
                'interval_minutes' => $virtualInterval,
                'start_time' => $virtualStartTime,
                'end_time' => $virtualEndTime,
            ];
        }
        foreach ($physicalSlots as $timeSlot) {
            $key = $timeSlot.'_physical';
            $capacity = $capacities->get($key);
            $capacityData[] = [
                'id' => $capacity?->id,
                'time_slot' => $timeSlot,
                'visit_type' => 'physical',
                'max_capacity' => $capacity?->max_capacity ?? 4,
                'duration_minutes' => $physicalDuration,
                'interval_minutes' => $physicalInterval,
                'start_time' => $physicalStartTime,
                'end_time' => $physicalEndTime,
            ];
        }

        // Check if request is from settings route
        $isSettingsRoute = request()->routeIs('settings.time-slot-capacity');

        if ($isSettingsRoute) {
            return Inertia::render('settings/time-slot-capacity', [
                'capacities' => $capacityData,
            ]);
        }

        return Inertia::render('Admin/TimeSlotConfiguration', [
            'capacities' => $capacityData,
        ]);
    }

    /**
     * Update the capacity for a time slot.
     */
    public function update(Request $request, TimeSlotCapacity $timeSlotCapacity): RedirectResponse
    {
        $request->validate([
            'max_capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:180'],
            'interval_minutes' => ['required', 'integer', 'min:0', 'max:60'],
        ]);

        $timeSlotCapacity->update([
            'max_capacity' => $request->max_capacity,
            'duration_minutes' => $request->duration_minutes,
            'interval_minutes' => $request->interval_minutes,
        ]);

        return redirect()->back()
            ->with('success', 'Time slot capacity updated successfully.');
    }

    /**
     * Update or create capacity for a time slot (handles cases where capacity doesn't exist).
     */
    public function updateCapacity(Request $request): RedirectResponse
    {
        $request->validate([
            'time_slot' => ['required', 'string', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
            'visit_type' => ['required', 'string', 'in:physical,virtual'],
            'max_capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:180'],
            'interval_minutes' => ['required', 'integer', 'min:0', 'max:60'],
        ]);

        TimeSlotCapacity::updateOrCreate(
            [
                'time_slot' => $request->time_slot,
                'visit_type' => $request->visit_type,
            ],
            [
                'max_capacity' => $request->max_capacity,
                'duration_minutes' => $request->duration_minutes,
                'interval_minutes' => $request->interval_minutes,
            ]
        );

        return redirect()->back()
            ->with('success', 'Time slot capacity updated successfully.');
    }

    /**
     * Update duration and interval settings for all time slots of a visit type.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $request->validate([
            'visit_type' => ['required', 'string', 'in:physical,virtual'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:180'],
            'interval_minutes' => ['required', 'integer', 'min:0', 'max:60'],
        ]);

        $visitType = $request->visit_type;
        $durationMinutes = $request->duration_minutes;
        $intervalMinutes = $request->interval_minutes;

        // Update all existing time slots for this visit type
        TimeSlotCapacity::where('visit_type', $visitType)->update([
            'duration_minutes' => $durationMinutes,
            'interval_minutes' => $intervalMinutes,
        ]);

        return redirect()->back()
            ->with('success', ucfirst($visitType).' visit settings updated successfully.');
    }

    /**
     * Update operating hours (start_time and end_time) for a visit type.
     */
    public function updateOperatingHours(Request $request): RedirectResponse
    {
        $request->validate([
            'visit_type' => ['required', 'string', 'in:physical,virtual'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        // Update all records of this visit type with the new start/end times
        TimeSlotCapacity::where('visit_type', $request->visit_type)
            ->update([
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
            ]);

        return redirect()->back()
            ->with('success', 'Operating hours updated successfully.');
    }
}
