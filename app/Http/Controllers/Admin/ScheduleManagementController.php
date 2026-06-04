<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Visit;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\VisitStatus;
use App\VisitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleManagementController extends Controller
{
    
    public function index(Request $request): Response
    {
        $visits = Visit::with(['user', 'jailOfficer', 'visitSessions' => fn ($q) => $q->orderBy('scheduled_start', 'desc')->limit(1)])
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($visit) {
                $latestSession = $visit->visitSessions->first();
                $now = now();
                if ($latestSession) {
                    $scheduleStarted = $now->gte($latestSession->scheduled_start);
                    $scheduleEnded = $now->isAfter($latestSession->scheduled_end);
                } else {
                    $scheduleStarted = $visit->isScheduleStarted();
                    $scheduleEnded = $visit->isScheduleInPast();
                }

                return [
                    'id' => $visit->id,
                    'user_id' => $visit->user_id,
                    'visitor_name' => trim("{$visit->user->first_name} {$visit->user->middle_name} {$visit->user->last_name}"),
                    'visitor_email' => $visit->user->email,
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                    'scheduled_time' => $visit->scheduled_time,
                    'visit_type' => $visit->visit_type->value,
                    'inmate_first_name' => $visit->inmate_first_name,
                    'inmate_middle_name' => $visit->inmate_middle_name,
                    'inmate_last_name' => $visit->inmate_last_name,
                    'status' => $visit->status->value,
                    'notes' => $visit->notes,
                    'meeting_link' => $visit->meeting_link ?? $visit->daily_co_room_url,
                    'access_key' => $visit->access_key,
                    'access_key_expires_at' => $visit->access_key_expires_at?->format('Y-m-d H:i:s'),
                    'rejection_reason' => $visit->rejection_reason,
                    'jail_officer_id' => $visit->jail_officer_id,
                    'jail_officer_name' => $visit->jailOfficer ? trim("{$visit->jailOfficer->first_name} {$visit->jailOfficer->middle_name} {$visit->jailOfficer->last_name}") : null,
                    'created_at' => $visit->created_at->format('Y-m-d H:i:s'),
                    'schedule_started' => $scheduleStarted,
                    'schedule_ended' => $scheduleEnded,
                    'visit_session_id' => $latestSession?->id,
                ];
            });

        $visitors = User::whereHas('role', function ($query) {
            $query->where('slug', 'visitor');
        })
            ->where('approval_status', 'approved')
            ->orderBy('first_name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                    'email' => $user->email,
                ];
            });

        $jailOfficers = User::whereHas('role', function ($query) {
            $query->where('slug', 'jail_officer');
        })
            ->where('approval_status', 'approved')
            ->orderBy('first_name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => trim("{$user->first_name} {$user->middle_name} {$user->last_name}"),
                    'email' => $user->email,
                ];
            });

        return Inertia::render('Admin/ScheduleManagement', [
            'visits' => $visits,
            'visitors' => $visitors,
            'monitoringOfficers' => $jailOfficers,
            'today_unavailable' => now()->format('H:i') >= '21:50',
        ]);
    }

    public function getBookedTimeSlots(Request $request): JsonResponse
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
        $dayCutoff = '21:50';
        $latestSlotEnd = $isPhysical ? '17:00' : '17:50';
        $isDayUnavailable = $dateCarbon->isToday() && (
            $nowTime >= $dayCutoff || $nowTime > $latestSlotEnd
        );

        $allTimeSlots = [];
        if ($isPhysical) {
            for ($hour = 7; $hour < 18; $hour++) {
                $allTimeSlots[] = sprintf('%02d:00', $hour);
            }
        } else {
            for ($hour = 7; $hour < 18; $hour++) {
                for ($minute = 0; $minute < 60; $minute += 10) {
                    $allTimeSlots[] = sprintf('%02d:%02d', $hour, $minute);
                }
            }
        }

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

        return response()->json([
            'slotCapacities' => $slotCapacities,
            'isDayUnavailable' => $isDayUnavailable,
        ]);
    }

    public function approve(Request $request, Visit $visit): RedirectResponse
    {
        if ($visit->isScheduleInPast()) {
            $visit->update([
                'status' => VisitStatus::Rejected,
                'rejection_reason' => 'This scheduled time has passed. Please submit a new visit schedule.',
            ]);

            return redirect()->back()
                ->withErrors(['approve' => 'This schedule has passed and could not be approved. The application has been marked as not reviewed. Please ask the visitor to submit a new schedule.']);
        }

        $rules = [
            'jail_officer_id' => ['nullable', 'exists:users,id'],
        ];
        if ($visit->visit_type === \App\VisitType::Virtual) {
            $rules['jail_officer_id'] = ['required', 'exists:users,id'];
        }
        $request->validate($rules);

        $oldJailOfficerId = $visit->jail_officer_id;

        $updateData = [
            'status' => VisitStatus::Approved,
            'jail_officer_id' => $request->jail_officer_id,
        ];

        $roomId = null;
        if ($visit->visit_type === \App\VisitType::Virtual) {
            $videoSdkService = new \App\Services\VideoSdkService;
            $roomName = "visit-{$visit->id}-".uniqid();
            $roomResult = $videoSdkService->createRoom($roomName);

            if ($roomResult['success']) {
                $roomId = $roomResult['room_id'] ?? null;
                $updateData['meeting_link'] = $roomResult['room_url'] ?? null;
                $updateData['daily_co_room_id'] = $roomId;
                $updateData['daily_co_room_name'] = $roomResult['room_name'] ?? $roomName;
                $updateData['daily_co_room_url'] = $roomResult['room_url'] ?? null;
                $updateData['room_created_at'] = now();

                \App\Models\MonitoringSession::create([
                    'visit_id' => $visit->id,
                    'visitor_id' => $visit->user_id,
                    'session_type' => 'visit',
                    'session_token' => $roomId ?? $roomName,
                    'status' => 'pending',
                    'started_at' => now(),
                ]);
            } else {
                \Illuminate\Support\Facades\Log::error('VideoSDK room creation failed during approval', [
                    'visit_id' => $visit->id,
                    'error' => $roomResult['error'] ?? 'Unknown error',
                ]);

                return redirect()->back()
                    ->withInput($request->only('jail_officer_id', 'access_key'))
                    ->withErrors([
                        'meeting_link' => 'Video room creation failed: '.($roomResult['error'] ?? 'Unknown error').'. A meeting link is required for virtual visits. Please check VideoSDK configuration and try again.',
                    ]);
            }
        }

        if ($visit->visit_type === \App\VisitType::Physical) {
            $qrCodeData = Visit::generateQRCodeData($visit);
            $updateData['qr_code_data'] = $qrCodeData;

            $scheduledDateTime = $visit->scheduled_date->copy();
            if ($visit->scheduled_time) {
                [$hours, $minutes] = explode(':', $visit->scheduled_time);
                $scheduledDateTime->setTime((int) $hours, (int) $minutes);
            }
            $updateData['access_key_expires_at'] = $scheduledDateTime;
        }

        $visit->update($updateData);

        $visit = $visit->fresh();

        if ($roomId && $visit->visit_type === \App\VisitType::Virtual) {
            app(\App\Services\VisitSessionService::class)->createForVisit($visit, $roomId);
        }

        if ($visit->jail_officer_id && $oldJailOfficerId !== $visit->jail_officer_id) {
            \App\Services\NotificationService::notifyMonitoringOfficerAboutVisit($visit);
        }

        NotificationService::createVisitNotification($visit, 'approved');

        AuditLogService::logAction(
            'visit_approved',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visit->id} approved by admin",
            $request
        );

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule approved successfully.');
    }

    public function reject(Request $request, Visit $visit): RedirectResponse
    {
        $request->validate([
            'rejection_reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $visit->update([
            'status' => VisitStatus::Rejected,
            'rejection_reason' => $request->rejection_reason,
        ]);

        AuditLogService::logAction(
            'visit_rejected',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visit->id} rejected by admin. Reason: ".substr($request->rejection_reason, 0, 100),
            $request,
            ['rejection_reason' => $request->rejection_reason]
        );

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule rejected successfully.');
    }

    public function updateStatus(Request $request, Visit $visit): RedirectResponse
    {
        $joId = $request->input('jail_officer_id');
        if ($joId === '' || $joId === null || (is_string($joId) && trim($joId) === '')) {
            $request->merge(['jail_officer_id' => null]);
        }

        $rules = [
            'status' => 'required|in:pending,approved,rejected,completed,missed,cancelled',
            'rejection_reason' => ['required_if:status,rejected', 'string', 'min:10', 'max:1000'],
            'jail_officer_id' => ['nullable', 'exists:users,id'],
        ];
        if ($request->status === 'approved' && $visit->visit_type === \App\VisitType::Virtual) {
            $rules['jail_officer_id'] = ['required', 'exists:users,id'];
        }
        $request->validate($rules);

        $oldJailOfficerId = $visit->jail_officer_id;
        $updateData = ['status' => \App\VisitStatus::from($request->status)];

        if ($request->status === 'rejected') {
            $updateData['rejection_reason'] = $request->rejection_reason;
        } else {
            $updateData['rejection_reason'] = null;
        }

        if ($request->status === 'approved' && $request->filled('jail_officer_id')) {
            $updateData['jail_officer_id'] = $request->jail_officer_id;
        } elseif (in_array($request->status, ['rejected', 'pending'], true)) {
            $updateData['jail_officer_id'] = null; // Clear when rejected or set back to pending
        }

        if ($request->status === 'approved' && $visit->visit_type === \App\VisitType::Virtual) {
            if (! $visit->meeting_link) {
                $videoSdkService = new \App\Services\VideoSdkService;
                $roomName = "visit-{$visit->id}-".uniqid();
                $roomResult = $videoSdkService->createRoom($roomName);
                if ($roomResult['success']) {
                    $roomId = $roomResult['room_id'] ?? null;
                    $updateData['meeting_link'] = $roomResult['room_url'] ?? null;
                    $updateData['daily_co_room_id'] = $roomId;
                    $updateData['daily_co_room_name'] = $roomResult['room_name'] ?? $roomName;
                    $updateData['daily_co_room_url'] = $roomResult['room_url'] ?? null;
                    $updateData['room_created_at'] = now();
                    \App\Models\MonitoringSession::create([
                        'visit_id' => $visit->id,
                        'visitor_id' => $visit->user_id,
                        'session_type' => 'visit',
                        'session_token' => $roomId ?? $roomName,
                        'status' => 'pending',
                        'started_at' => now(),
                    ]);
                } else {
                    \Illuminate\Support\Facades\Log::error('VideoSDK room creation failed during status update', [
                        'visit_id' => $visit->id,
                        'error' => $roomResult['error'] ?? 'Unknown error',
                    ]);

                    return redirect()->back()
                        ->withErrors([
                            'meeting_link' => 'Video room creation failed: '.($roomResult['error'] ?? 'Unknown error').'. A meeting link is required for virtual visits.',
                        ]);
                }
            }
        }

        if ($request->status === 'approved' && $visit->visit_type === \App\VisitType::Physical && ! $visit->access_key) {
            $updateData['access_key'] = Visit::generateAccessKey();
            $scheduledDateTime = $visit->scheduled_date->copy();
            if ($visit->scheduled_time) {
                [$hours, $minutes] = explode(':', $visit->scheduled_time);
                $scheduledDateTime->setTime((int) $hours, (int) $minutes);
            }
            $updateData['access_key_expires_at'] = $scheduledDateTime->addHours(24);
        }

        $visit->update($updateData);
        $visit = $visit->fresh();

        if ($request->status === 'approved' && $visit->visit_type === \App\VisitType::Virtual && $visit->daily_co_room_id) {
            if (! $visit->visitSessions()->exists()) {
                app(\App\Services\VisitSessionService::class)->createForVisit($visit, $visit->daily_co_room_id);
            }
        }

        if ($visit->jail_officer_id && $oldJailOfficerId !== $visit->jail_officer_id && in_array($request->status, ['approved', 'pending'])) {
            \App\Services\NotificationService::notifyMonitoringOfficerAboutVisit($visit);
        }

        AuditLogService::logAction(
            'visit_status_updated',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visit->id} status updated to {$request->status} by admin",
            $request,
            ['new_status' => $request->status]
        );

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule status updated successfully.');
    }

    public function generateAccessKey(Visit $visit): RedirectResponse
    {
        if ($visit->visit_type !== \App\VisitType::Physical) {
            return redirect()->back()
                ->withErrors(['error' => 'Access keys can only be generated for physical visits.']);
        }

        $accessKey = Visit::generateAccessKey();
        $scheduledDateTime = $visit->scheduled_date->copy();
        if ($visit->scheduled_time) {
            [$hours, $minutes] = explode(':', $visit->scheduled_time);
            $scheduledDateTime->setTime((int) $hours, (int) $minutes);
        }
        $expiresAt = $scheduledDateTime->addHours(24);

        $visit->update([
            'access_key' => $accessKey,
            'access_key_expires_at' => $expiresAt,
        ]);

        return redirect()->route('admin.schedules.index')
            ->with('success', "Access key generated successfully: {$accessKey}");
    }

    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => ['required', 'exists:users,id'],
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
            'visit_type' => ['required', 'in:virtual,physical'],
            'inmate_first_name' => ['required', 'string', 'max:255'],
            'inmate_middle_name' => ['nullable', 'string', 'max:255'],
            'inmate_last_name' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'jail_officer_id' => ['nullable', 'exists:users,id', 'required_if:visit_type,virtual'],
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

        $user = User::findOrFail($request->user_id);
        if ($user->role?->slug !== 'visitor') {
            return redirect()->back()
                ->withErrors(['user_id' => 'Selected user must be a visitor.'])
                ->withInput();
        }

        $conflictingVisit = Visit::where('scheduled_date', $request->scheduled_date)
            ->where('scheduled_time', $request->scheduled_time)
            ->whereIn('status', [VisitStatus::Pending, VisitStatus::Approved])
            ->first();

        if ($conflictingVisit) {
            return redirect()->back()
                ->withErrors(['scheduled_time' => 'This time slot is already booked.'])
                ->withInput();
        }

        $visit = Visit::create([
            'user_id' => $request->user_id,
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'visit_type' => VisitType::from($request->visit_type),
            'inmate_first_name' => $request->inmate_first_name,
            'inmate_middle_name' => $request->inmate_middle_name,
            'inmate_last_name' => $request->inmate_last_name,
            'status' => VisitStatus::Approved,
            'notes' => $request->notes,
            'jail_officer_id' => $request->visit_type === 'virtual' ? $request->jail_officer_id : null,
        ]);

        $roomId = null;

        if ($visit->visit_type === VisitType::Virtual) {
            $videoSdkService = new \App\Services\VideoSdkService;
            $roomName = "visit-{$visit->id}-".uniqid();
            $roomResult = $videoSdkService->createRoom($roomName);

            if ($roomResult['success']) {
                $roomId = $roomResult['room_id'] ?? null;
                $visit->update([
                    'meeting_link' => $roomResult['room_url'] ?? null,
                    'daily_co_room_id' => $roomId,
                    'daily_co_room_name' => $roomResult['room_name'] ?? $roomName,
                    'daily_co_room_url' => $roomResult['room_url'] ?? null,
                    'room_created_at' => now(),
                ]);

                \App\Models\MonitoringSession::create([
                    'visit_id' => $visit->id,
                    'visitor_id' => $visit->user_id,
                    'session_type' => 'visit',
                    'session_token' => $roomId ?? $roomName,
                    'status' => 'pending',
                    'started_at' => now(),
                ]);
            } else {
                \Illuminate\Support\Facades\Log::error('VideoSDK room creation failed during admin schedule create', [
                    'visit_id' => $visit->id,
                    'error' => $roomResult['error'] ?? 'Unknown error',
                ]);

                return redirect()->back()
                    ->withErrors(['meeting_link' => 'Video room creation failed: '.($roomResult['error'] ?? 'Unknown error').'. Please check VideoSDK configuration and try again.'])
                    ->withInput();
            }
        }

        if ($visit->visit_type === VisitType::Physical) {
            $visit->update([
                'access_key' => Visit::generateAccessKey(),
                'access_key_expires_at' => $visit->scheduled_date->copy()->setTime(
                    (int) explode(':', $visit->scheduled_time ?? '08:00')[0],
                    (int) explode(':', $visit->scheduled_time ?? '08:00')[1]
                ),
            ]);
        }

        if ($roomId && $visit->visit_type === VisitType::Virtual) {
            $visit->refresh();
            app(\App\Services\VisitSessionService::class)->createForVisit($visit, $roomId);
        }

        if ($request->visit_type === 'virtual' && $request->jail_officer_id) {
            \App\Services\NotificationService::notifyMonitoringOfficerAboutVisit($visit->fresh());
        }

        NotificationService::createVisitNotification($visit->fresh(), 'approved');

        AuditLogService::logAction(
            'visit_created',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visit->id} created and approved by admin for visitor",
            $request
        );

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule created and approved successfully.');
    }

    public function update(Request $request, Visit $visit): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
            'visit_type' => ['required', 'in:virtual,physical'],
            'inmate_first_name' => ['required', 'string', 'max:255'],
            'inmate_middle_name' => ['nullable', 'string', 'max:255'],
            'inmate_last_name' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'meeting_link' => ['nullable', 'url'],
            'jail_officer_id' => ['nullable', 'exists:users,id'],
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

        $conflictingVisit = Visit::where('scheduled_date', $request->scheduled_date)
            ->where('scheduled_time', $request->scheduled_time)
            ->whereIn('status', [VisitStatus::Pending, VisitStatus::Approved])
            ->where('id', '!=', $visit->id)
            ->first();

        if ($conflictingVisit) {
            return redirect()->back()
                ->withErrors(['scheduled_time' => 'This time slot is already booked.'])
                ->withInput();
        }

        $updateData = [
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'visit_type' => VisitType::from($request->visit_type),
            'inmate_first_name' => $request->inmate_first_name,
            'inmate_middle_name' => $request->inmate_middle_name,
            'inmate_last_name' => $request->inmate_last_name,
            'notes' => $request->notes,
        ];
        if ($request->has('meeting_link')) {
            $updateData['meeting_link'] = $request->meeting_link;
        }
        if ($request->has('jail_officer_id')) {
            $updateData['jail_officer_id'] = $request->jail_officer_id ?: null;
        }
        $visit->update($updateData);

        AuditLogService::logAction(
            'visit_updated',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visit->id} updated by admin",
            $request
        );

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule updated successfully.');
    }

    public function destroy(Request $request, Visit $visit): RedirectResponse
    {
        $visitId = $visit->id;

        AuditLogService::logAction(
            'visit_deleted',
            $visit,
            'Visit Schedule',
            "Visit schedule #{$visitId} deleted by admin",
            $request
        );

        $visit->delete();

        return redirect()->route('admin.schedules.index')
            ->with('success', 'Schedule deleted successfully.');
    }
}
