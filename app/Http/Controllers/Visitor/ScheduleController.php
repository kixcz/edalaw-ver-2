<?php

namespace App\Http\Controllers\Visitor;

use App\AppealStatus;
use App\Http\Controllers\Controller;
use App\Models\Appeal;
use App\Models\CellScheduleTemplate;
use App\Models\Inmate;
use App\Models\Visit;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\VisitorScheduleConflictService;
use App\VisitStatus;
use App\VisitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    /**
     * Display the schedule management page.
     */
    public function index(Request $request): Response
    {
        $visits = Visit::with(['jailOfficer', 'visitSessions' => fn ($q) => $q->orderBy('scheduled_start', 'desc')->limit(1)])
            ->where('user_id', auth()->id())
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('scheduled_time', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($visit) {
                $canAppeal = false;
                $appealDeadline = null;
                if ($visit->status === VisitStatus::Rejected) {
                    $deadline = $visit->updated_at->copy()->addHours(48);
                    $canAppeal = now()->isBefore($deadline);
                    $appealDeadline = $deadline->format('Y-m-d H:i:s');

                    // Check if already has a pending or approved appeal
                    $hasActiveAppeal = Appeal::where('user_id', auth()->id())
                        ->where('appealable_type', Visit::class)
                        ->where('appealable_id', $visit->id)
                        ->where('status', '!=', AppealStatus::Rejected)
                        ->exists();

                    if ($hasActiveAppeal) {
                        $canAppeal = false;
                    }
                }

                $latestSession = $visit->visitSessions->first();
                $sessionPayload = null;
                if ($latestSession) {
                    $tz = config('app.timezone');
                    $now = now($tz);
                    $start = $latestSession->scheduled_start->setTimezone($tz);
                    $end = $latestSession->scheduled_end->setTimezone($tz);
                    $withinWindow = $now->between($start, $end);
                    $notCompleted = ! in_array($latestSession->status, ['completed', 'terminated'], true);
                    $canJoin = $visit->status === VisitStatus::Approved && $withinWindow && $notCompleted;
                    $joinDisabledReason = null;
                    if (! $canJoin && $visit->status === VisitStatus::Approved && $notCompleted) {
                        $joinDisabledReason = $now->lt($start) ? 'not_started' : 'ended';
                    } elseif (! $canJoin && $notCompleted === false) {
                        $joinDisabledReason = 'ended';
                    }
                    $sessionPayload = [
                        'id' => $latestSession->id,
                        'scheduled_start' => $latestSession->scheduled_start->toIso8601String(),
                        'scheduled_end' => $latestSession->scheduled_end->toIso8601String(),
                        'status' => $latestSession->status,
                        'terms_accepted_at' => $latestSession->terms_accepted_at?->toIso8601String(),
                        'can_join_video' => $canJoin,
                        'join_disabled_reason' => $joinDisabledReason,
                    ];
                }

                $joinUrl = $latestSession && $visit->visit_type === VisitType::Virtual
                    ? route('visit-session.show', $latestSession)
                    : null;

                return [
                    'id' => $visit->id,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                    'scheduled_time' => $visit->scheduled_time,
                    'visit_type' => $visit->visit_type->value,
                    'inmate_first_name' => $visit->inmate_first_name,
                    'inmate_middle_name' => $visit->inmate_middle_name,
                    'inmate_last_name' => $visit->inmate_last_name,
                    'status' => $visit->status->value,
                    'notes' => $visit->notes,
                    'meeting_link' => $visit->meeting_link ?? $visit->daily_co_room_url,
                    'join_url' => $joinUrl,
                    'access_key' => $visit->access_key,
                    'access_key_expires_at' => $visit->access_key_expires_at?->format('Y-m-d H:i:s'),
                    'jail_officer_id' => $visit->jail_officer_id,
                    'jail_officer_name' => $visit->jailOfficer ? trim("{$visit->jailOfficer->first_name} {$visit->jailOfficer->middle_name} {$visit->jailOfficer->last_name}") : null,
                    'rejection_reason' => $visit->rejection_reason,
                    'created_at' => $visit->created_at->format('Y-m-d H:i:s'),
                    'can_appeal' => $canAppeal,
                    'appeal_deadline' => $appealDeadline,
                    'visit_session' => $sessionPayload,
                ];
            });

        // Get booked time slots for the requested date (if provided)
        $bookedTimeSlots = [];
        if ($request->has('date')) {
            $bookedTimeSlots = Visit::where('scheduled_date', $request->date)
                ->whereIn('status', ['pending', 'approved'])
                ->whereNotNull('scheduled_time')
                ->get()
                ->map(function ($visit) {
                    // Convert time to HH:MM format
                    $time = $visit->scheduled_time;
                    if ($time instanceof \Carbon\Carbon) {
                        return $time->format('H:i');
                    }
                    if (is_string($time)) {
                        // If it's already in H:i format, return as is
                        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
                            return $time;
                        }
                        // Try to parse and format
                        try {
                            return \Carbon\Carbon::createFromFormat('H:i:s', $time)->format('H:i');
                        } catch (\Exception $e) {
                            return $time;
                        }
                    }

                    return (string) $time;
                })
                ->filter()
                ->unique()
                ->values()
                ->toArray();
        }

        // Check if today is unavailable based on virtual visit operating hours
        $virtualSettings = \App\Models\TimeSlotCapacity::where('visit_type', 'virtual')->first();
        $virtualEndTime = $virtualSettings?->end_time?->format('H:i') ?? '22:00';
        
        // Calculate cutoff time (when last slot starts for virtual visits)
        [$endHour, $endMinute] = explode(':', $virtualEndTime);
        $durationMinutes = $virtualSettings?->duration_minutes ?? 20;
        $endMinutesTotal = ((int)$endHour) * 60 + (int)$endMinute;
        $lastSlotStartMinutes = $endMinutesTotal - $durationMinutes;
        $lastSlotHour = intdiv($lastSlotStartMinutes, 60);
        $lastSlotMinute = $lastSlotStartMinutes % 60;
        $dayCutoff = sprintf('%02d:%02d', $lastSlotHour, $lastSlotMinute);
        
        $todayUnavailable = now()->format('H:i') > $dayCutoff;
        
        return Inertia::render('Visitor/ScheduleManagement', [
            'visits' => $visits,
            'bookedTimeSlots' => $bookedTimeSlots,
            'today_unavailable' => $todayUnavailable,
        ]);
    }

    /**
     * Get booked time slots for a specific date with capacity information.
     */
    public function getBookedTimeSlots(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date'],
            'visit_type' => ['nullable', 'string', 'in:physical,virtual'],
        ]);

        $visitType = $request->visit_type ?? 'physical';
        $date = $request->date;
        $isPhysical = $visitType === 'physical';

        $dateCarbon = \Carbon\Carbon::parse($date)->startOfDay();
        $nowTime = now()->format('H:i');

        // Get duration and interval settings from database
        $settings = \App\Models\TimeSlotCapacity::where('visit_type', $visitType)->first();
        $durationMinutes = $settings?->duration_minutes ?? ($isPhysical ? 30 : 20);
        $intervalMinutes = $settings?->interval_minutes ?? ($isPhysical ? 10 : 5);
        $startTime = $settings?->start_time?->format('H:i') ?? '07:00';
        $endTime = $settings?->end_time?->format('H:i') ?? ($isPhysical ? '18:00' : '22:00');
        
        // Calculate cutoff time (when last slot starts)
        [$endHour, $endMinute] = explode(':', $endTime);
        $endMinutesTotal = ((int)$endHour) * 60 + (int)$endMinute;
        $lastSlotStartMinutes = $endMinutesTotal - $durationMinutes;
        $lastSlotHour = intdiv($lastSlotStartMinutes, 60);
        $lastSlotMinute = $lastSlotStartMinutes % 60;
        $dayCutoff = sprintf('%02d:%02d', $lastSlotHour, $lastSlotMinute);
        
        $isDayUnavailable = $dateCarbon->isToday() && $nowTime > $dayCutoff;
        $slotInterval = $durationMinutes + $intervalMinutes;

        // Generate time slots based on dynamic start/end times
        $allTimeSlots = [];
        [$startHour, $startMinute] = explode(':', $startTime);
        [$endHour, $endMinute] = explode(':', $endTime);
        
        $currentMinutes = ((int)$startHour) * 60 + (int)$startMinute;
        $endMinutes = ((int)$endHour) * 60 + (int)$endMinute;

        while ($currentMinutes < $endMinutes) {
            $hour = intdiv($currentMinutes, 60);
            $minute = $currentMinutes % 60;
            $allTimeSlots[] = sprintf('%02d:%02d', $hour, $minute);
            $currentMinutes += $slotInterval;
        }

        // Get capacity information for each slot (when day is unavailable, treat all as full)
        $slotCapacities = [];
        foreach ($allTimeSlots as $timeSlot) {
            if ($isDayUnavailable) {
                $slotCapacities[$timeSlot] = [
                    'current' => 999,
                    'max' => 1,
                    'isFull' => true,
                ];
            } else {
                $capacity = \App\Models\TimeSlotCapacity::getCapacity($timeSlot, $visitType);
                $currentBookings = \App\Models\TimeSlotCapacity::getCurrentBookings($date, $timeSlot, $visitType);
                $isFull = $currentBookings >= $capacity;

                $slotCapacities[$timeSlot] = [
                    'current' => $currentBookings,
                    'max' => $capacity,
                    'isFull' => $isFull,
                ];
            }
        }

        // Slots where the current user already has a visit on this date (so they cannot book again)
        $userBookedSlots = Visit::where('user_id', auth()->id())
            ->where('scheduled_date', $date)
            ->where('visit_type', VisitType::from($visitType))
            ->whereIn('status', [VisitStatus::Pending, VisitStatus::Approved])
            ->whereNotNull('scheduled_time')
            ->get()
            ->map(function ($visit) {
                $t = $visit->scheduled_time;
                if ($t instanceof \Carbon\Carbon) {
                    return $t->format('H:i');
                }
                if (is_string($t) && preg_match('/^\d{2}:\d{2}/', $t)) {
                    return substr($t, 0, 5);
                }

                return (string) $t;
            })
            ->filter()
            ->unique()
            ->values()
            ->all();

        // Inmate-specific booked slots (if inmate_id is provided)
        $inmateBookedSlots = [];
        if ($request->has('inmate_id')) {
            $inmateBookedSlots = Visit::where('inmate_id', $request->inmate_id)
                ->where('scheduled_date', $date)
                ->where('visit_type', VisitType::from($visitType))
                ->whereIn('status', [VisitStatus::Pending, VisitStatus::Approved])
                ->whereNotNull('scheduled_time')
                ->get()
                ->map(function ($visit) {
                    $t = $visit->scheduled_time;
                    if ($t instanceof \Carbon\Carbon) {
                        return $t->format('H:i');
                    }
                    if (is_string($t) && preg_match('/^\d{2}:\d{2}/', $t)) {
                        return substr($t, 0, 5);
                    }

                    return (string) $t;
                })
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        return response()->json([
            'slotCapacities' => $slotCapacities,
            'isDayUnavailable' => $isDayUnavailable,
            'userBookedSlots' => $userBookedSlots,
            'inmateBookedSlots' => $inmateBookedSlots,
            'durationMinutes' => $durationMinutes,
            'intervalMinutes' => $intervalMinutes,
            'startTime' => $startTime,
            'endTime' => $endTime,
        ]);
    }

    /**
     * Store a new visit schedule.
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
            'visit_type' => ['required', 'string', 'in:virtual,physical'],
            'inmate_first_name' => ['required', 'string', 'max:255'],
            'inmate_middle_name' => ['nullable', 'string', 'max:255'],
            'inmate_last_name' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'relationship_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // 10MB max
            'additional_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // 10MB max
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $scheduledDate = \Carbon\Carbon::parse($request->scheduled_date)->startOfDay();
        
        // Get operating hours from database
        $settings = \App\Models\TimeSlotCapacity::where('visit_type', $request->visit_type)->first();
        $endTime = $settings?->end_time?->format('H:i') ?? ($request->visit_type === 'physical' ? '18:00' : '22:00');
        $durationMinutes = $settings?->duration_minutes ?? ($request->visit_type === 'physical' ? 30 : 20);
        
        // Calculate cutoff time (when last slot starts)
        [$endHour, $endMinute] = explode(':', $endTime);
        $endMinutesTotal = ((int)$endHour) * 60 + (int)$endMinute;
        $lastSlotStartMinutes = $endMinutesTotal - $durationMinutes;
        $lastSlotHour = intdiv($lastSlotStartMinutes, 60);
        $lastSlotMinute = $lastSlotStartMinutes % 60;
        $dayCutoff = sprintf('%02d:%02d', $lastSlotHour, $lastSlotMinute);
        
        if ($scheduledDate->isToday() && now()->format('H:i') > $dayCutoff) {
            // Format end time for display
            $displayHour = (int)$endHour;
            $period = $displayHour >= 12 ? 'PM' : 'AM';
            $displayHour = $displayHour > 12 ? $displayHour - 12 : ($displayHour === 0 ? 12 : $displayHour);
            $formattedEndTime = "{$displayHour}:{$endMinute} {$period}";
            
            return redirect()->back()
                ->withErrors(['scheduled_date' => "Schedule times for today end at {$formattedEndTime}. Please select another date."])
                ->withInput();
        }
        
        $isPhysical = $request->visit_type === 'physical';
        if ($scheduledDate->isToday() && $request->scheduled_time > $dayCutoff) {
            // Format end time for display
            $displayHour = (int)$endHour;
            $period = $displayHour >= 12 ? 'PM' : 'AM';
            $displayHour = $displayHour > 12 ? $displayHour - 12 : ($displayHour === 0 ? 12 : $displayHour);
            $formattedEndTime = "{$displayHour}:{$endMinute} {$period}";
            
            return redirect()->back()
                ->withErrors(['scheduled_time' => "Schedule times for today end at {$formattedEndTime}. Please select another date or time."])
                ->withInput();
        }

        // Physical visits use hourly slots: normalize to HH:00 for capacity and storage
        $scheduledTime = $request->scheduled_time;
        if ($isPhysical && preg_match('/^(\d{2}):\d{2}$/', $scheduledTime, $m)) {
            $scheduledTime = $m[1].':00';
        }

        $isAvailable = \App\Models\TimeSlotCapacity::isAvailable(
            $request->scheduled_date,
            $scheduledTime,
            $request->visit_type
        );

        if (! $isAvailable) {
            $capacity = \App\Models\TimeSlotCapacity::getCapacity($scheduledTime, $request->visit_type);

            return redirect()->back()
                ->withErrors(['scheduled_time' => "This time slot is full (maximum capacity: {$capacity} visitors). Please select another time."])
                ->withInput();
        }

        $durationMinutes = $isPhysical ? 60 : 10;
        $conflictService = new VisitorScheduleConflictService;
        if ($conflictService->hasConflict(auth()->id(), $request->scheduled_date, $scheduledTime, $durationMinutes)) {
            return redirect()->back()
                ->withErrors(['scheduled_time' => 'You already have a virtual visit or e-burol scheduled in this time range. Please choose another slot.'])
                ->withInput();
        }

        // Store uploaded files
        $relationshipProofPath = null;
        $additionalProofPath = null;

        if ($request->hasFile('relationship_proof')) {
            $relationshipProofPath = $request->file('relationship_proof')->store('visits/relationship_proofs', 'public');
        }

        if ($request->hasFile('additional_proof')) {
            $additionalProofPath = $request->file('additional_proof')->store('visits/additional_proofs', 'public');
        }

        // Auto-assign jail officer based on inmate's cell and jail_officer_scopes
        $assignedJailOfficerId = $this->assignJailOfficerToInmate($inmate->id);

        $visit = Visit::create([
            'user_id' => auth()->id(),
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $scheduledTime,
            'visit_type' => VisitType::from($request->visit_type),
            'inmate_first_name' => $request->inmate_first_name,
            'inmate_middle_name' => $request->inmate_middle_name,
            'inmate_last_name' => $request->inmate_last_name,
            'inmate_id' => $inmate->id,
            'jail_officer_id' => $assignedJailOfficerId,
            'status' => VisitStatus::Pending,
            'notes' => $request->notes,
            'relationship_proof_path' => $relationshipProofPath,
            'additional_proof_path' => $additionalProofPath,
        ]);

        // Create notification that application was received
        NotificationService::createVisitSubmittedNotification($visit);
        NotificationService::notifySuperAdminsAboutVisit($visit);

        // Log the action
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        AuditLogService::logAction(
            'visit_submitted',
            $visit,
            'Schedule Management',
            "Visit schedule submitted for {$inmateName}. Type: {$visit->visit_type->value}. Scheduled: {$visit->scheduled_date->format('M d, Y')} at {$visit->scheduled_time}",
            $request,
            [
                'inmate_name' => $inmateName,
                'visit_type' => $visit->visit_type->value,
                'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                'scheduled_time' => $visit->scheduled_time,
            ]
        );

        return redirect()->back()->with('success', 'Visit schedule submitted successfully. Your application has been sent to the BJMP officer for review. Please wait for approval.');
    }

    /**
     * Cancel a visit schedule.
     */
    public function cancel(Request $request, Visit $visit): RedirectResponse
    {
        // Ensure the visit belongs to the authenticated user
        if ($visit->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        // Only allow cancellation of pending or approved visits
        if (! in_array($visit->status, [VisitStatus::Pending, VisitStatus::Approved])) {
            return redirect()->back()
                ->withErrors(['visit' => 'You can only cancel pending or approved visits.']);
        }

        $visit->update([
            'status' => VisitStatus::Cancelled,
        ]);

        // Create notification
        NotificationService::createVisitNotification($visit, 'cancelled');

        // Log the action
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        AuditLogService::logAction(
            'visit_cancelled',
            $visit,
            'Schedule Management',
            "Visit schedule cancelled for {$inmateName}. Was scheduled for: {$visit->scheduled_date->format('M d, Y')} at {$visit->scheduled_time}",
            $request,
            [
                'inmate_name' => $inmateName,
                'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                'scheduled_time' => $visit->scheduled_time,
            ]
        );

        return redirect()->back()->with('success', 'Visit schedule cancelled successfully.');
    }

    /**
     * Reschedule a visit.
     */
    public function reschedule(Request $request, Visit $visit): RedirectResponse
    {
        // Ensure the visit belongs to the authenticated user
        if ($visit->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        // Only allow rescheduling of pending or approved visits
        if (! in_array($visit->status, [VisitStatus::Pending, VisitStatus::Approved])) {
            return redirect()->back()
                ->withErrors(['visit' => 'You can only reschedule pending or approved visits.']);
        }

        $validator = Validator::make($request->all(), [
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        if (\Carbon\Carbon::parse($request->scheduled_date)->isToday() && now()->format('H:i') >= '21:50') {
            return redirect()->back()
                ->withErrors(['scheduled_date' => 'This day is no longer available for scheduling (cutoff 9:50 PM). Please select another date.'])
                ->withInput();
        }

        // Check if the new time slot has capacity (excluding the current visit)
        $isAvailable = \App\Models\TimeSlotCapacity::isAvailable(
            $request->scheduled_date,
            $request->scheduled_time,
            $visit->visit_type->value,
            $visit->id
        );

        if (! $isAvailable) {
            $capacity = \App\Models\TimeSlotCapacity::getCapacity($request->scheduled_time, $visit->visit_type->value);

            return redirect()->back()
                ->withErrors(['scheduled_time' => "This time slot is full (maximum capacity: {$capacity} visitors). Please select another time."])
                ->withInput();
        }

        $oldDate = $visit->scheduled_date->format('Y-m-d');
        $oldTime = $visit->scheduled_time;

        // Update the visit status to pending after rescheduling
        $visit->update([
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'status' => VisitStatus::Pending,
            'meeting_link' => null, // Clear meeting link as it needs to be re-approved
        ]);

        // Create notification
        NotificationService::createVisitSubmittedNotification($visit);

        // Log the action
        $inmateName = trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}");
        AuditLogService::logAction(
            'visit_rescheduled',
            $visit,
            'Schedule Management',
            "Visit schedule rescheduled for {$inmateName}. From: {$oldDate} {$oldTime} to {$request->scheduled_date} {$request->scheduled_time}",
            $request,
            [
                'inmate_name' => $inmateName,
                'old_date' => $oldDate,
                'old_time' => $oldTime,
                'new_date' => $request->scheduled_date,
                'new_time' => $request->scheduled_time,
            ]
        );

        return redirect()->back()->with('success', 'Visit schedule rescheduled successfully. Your rescheduled request has been sent to the BJMP officer for review.');
    }

    /**
     * Search for an inmate by name and return their details including cell information.
     */
    public function searchInmate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'first_name' => ['required', 'string', 'max:100'],
                'middle_name' => ['nullable', 'string', 'max:100'],
                'last_name' => ['required', 'string', 'max:100'],
            ]);

            // Use case-insensitive search
            $firstName = strtolower($request->first_name);
            $lastName = strtolower($request->last_name);
            $middleName = $request->middle_name ? strtolower($request->middle_name) : null;

            \Log::info('Searching for inmate:', [
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'last_name' => $lastName,
            ]);

            $query = Inmate::with('cell.scheduleTemplates')
                ->whereRaw('LOWER(first_name) LIKE ?', ['%' . $firstName . '%'])
                ->whereRaw('LOWER(last_name) LIKE ?', ['%' . $lastName . '%'])
                ->where('status', 'active');

            if ($request->filled('middle_name')) {
                $query->whereRaw('LOWER(middle_name) LIKE ?', ['%' . $middleName . '%']);
            }

            $inmate = $query->first();

            \Log::info('Search result:', ['found' => $inmate !== null, 'inmate_id' => $inmate?->id]);

            if (! $inmate) {
                return response()->json([
                    'found' => false,
                    'message' => 'No inmate found with the provided name. Please check the spelling and try again.',
                ], 404);
            }

            // Check if inmate has a cell assigned
            if (! $inmate->cell) {
                \Log::warning('Inmate without cell:', ['inmate_id' => $inmate->id]);
                
                return response()->json([
                    'found' => true,
                    'inmate' => [
                        'id' => $inmate->id,
                        'first_name' => $inmate->first_name,
                        'middle_name' => $inmate->middle_name,
                        'last_name' => $inmate->last_name,
                        'inmate_number' => $inmate->inmate_number,
                        'cell' => null,
                        'available_days' => [],
                    ],
                    'warning' => 'This inmate does not have a cell assigned. Please contact support.',
                ]);
            }

            // Get cell schedule templates
            $availableDays = [];
            foreach ($inmate->cell->scheduleTemplates as $template) {
                $availableDays[$template->day_of_week] = [
                    'virtual' => $template->virtual_available,
                    'physical' => $template->physical_available,
                ];
            }

            \Log::info('Returning inmate data successfully', [
                'inmate_id' => $inmate->id,
                'cell_id' => $inmate->cell->id,
                'schedule_templates_count' => count($availableDays),
            ]);

            $responseData = [
                'found' => true,
                'inmate' => [
                    'id' => $inmate->id,
                    'first_name' => $inmate->first_name,
                    'middle_name' => $inmate->middle_name ?? null,
                    'last_name' => $inmate->last_name,
                    'inmate_number' => $inmate->inmate_number,
                    'cell' => [
                        'id' => $inmate->cell->id,
                        'cell_number' => $inmate->cell->cell_number,
                    ],
                    'available_days' => $availableDays,
                ],
            ];

            \Log::info('Response data prepared', ['response' => json_encode($responseData)]);

            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('Inmate search error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'found' => false,
                'message' => 'An error occurred while searching for the inmate. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Check if an inmate is tagged to the authenticated visitor.
     */
    public function checkInmateTagged(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'inmate_id' => ['required', 'integer', 'exists:inmates,id'],
            ]);

            $userId = auth()->id();
            
            // Check if there's an approved visit for this inmate and user
            $isTagged = Visit::where('user_id', $userId)
                ->where('inmate_id', $request->inmate_id)
                ->where('status', 'approved')
                ->exists();

            return response()->json([
                'is_tagged' => $isTagged,
                'message' => $isTagged ? 'Inmate is already tagged to your account' : 'Inmate is not tagged to your account',
            ]);
        } catch (\Exception $e) {
            \Log::error('Check inmate tagged error: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'An error occurred while checking inmate tag status.',
            ], 500);
        }
    }

    /**
     * Check if a specific date is available for an inmate's cell based on schedule template.
     */
    public function checkCellAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'inmate_id' => ['required', 'integer', 'exists:inmates,id'],
            'date' => ['required', 'date'],
            'visit_type' => ['required', 'string', 'in:virtual,physical'],
        ]);

        $inmate = Inmate::with('cell.scheduleTemplates')->findOrFail($request->inmate_id);
        $date = \Carbon\Carbon::parse($request->date);
        $dayOfWeek = (int) $date->format('w'); // 0 = Sunday, 6 = Saturday
        $visitType = $request->visit_type;

        // Find the schedule template for this day
        $scheduleTemplate = $inmate->cell->scheduleTemplates
            ->where('day_of_week', $dayOfWeek)
            ->first();

        $isAvailable = false;
        if ($scheduleTemplate) {
            $isAvailable = $visitType === 'virtual'
                ? $scheduleTemplate->virtual_available
                : $scheduleTemplate->physical_available;
        }

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return response()->json([
            'available' => $isAvailable,
            'cell_number' => $inmate->cell->cell_number,
            'day_name' => $dayNames[$dayOfWeek],
            'message' => $isAvailable
                ? null
                : "This cell ({$inmate->cell->cell_number}) is not available for {$visitType} visits on {$dayNames[$dayOfWeek]}s. Please select a different date.",
        ]);
    }

    /**
     * Auto-assign a jail officer to an inmate based on jail_officer_scopes.
     * Finds an active jail officer whose scope matches the inmate's cell.
     */
    private function assignJailOfficerToInmate(int $inmateId): ?int
    {
        $inmate = \App\Models\Inmate::with('cell')->find($inmateId);
        
        if (!$inmate || !$inmate->cell) {
            return null;
        }

        $cell = $inmate->cell;
        
        // Find active jail officer scopes that match this cell
        $matchingScope = \App\Models\JailOfficerScope::where('is_active', true)
            ->where(function($query) use ($cell) {
                // Direct cell assignment
                $query->where('scope_type', 'cell')
                      ->where('cell_id', $cell->id)
                      // Dormitory assignment
                      ->orWhere(function($q) use ($cell) {
                          $q->where('scope_type', 'dormitory')
                            ->where('dormitory_id', $cell->dormitory_id);
                      })
                      // Annex assignment
                      ->orWhere(function($q) use ($cell) {
                          $q->where('scope_type', 'annex')
                            ->where('annex_id', $cell->annex_id);
                      });
            })
            ->first();

        return $matchingScope ? $matchingScope->jail_officer_id : null;
    }
}
