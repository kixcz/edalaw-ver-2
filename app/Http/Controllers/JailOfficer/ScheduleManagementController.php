<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\MonitoringSession;
use App\Models\Visit;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\VideoSdkService;
use App\VisitStatus;
use App\VisitType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleManagementController extends Controller
{
    /**
     * Display the schedule management page.
     */
    public function index(): Response
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
                    'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                    'status' => $visit->status->value,
                    'notes' => $visit->notes,
                    'meeting_link' => $visit->meeting_link ?? $visit->daily_co_room_url,
                    'access_key' => $visit->access_key,
                    'access_key_expires_at' => $visit->access_key_expires_at?->format('Y-m-d H:i:s'),
                    'jail_officer_id' => $visit->jail_officer_id,
                    'jail_officer_name' => $visit->jailOfficer ? trim("{$visit->jailOfficer->first_name} {$visit->jailOfficer->middle_name} {$visit->jailOfficer->last_name}") : null,
                    'rejection_reason' => $visit->rejection_reason,
                    'created_at' => $visit->created_at->format('Y-m-d H:i:s'),
                    'schedule_started' => $scheduleStarted,
                    'schedule_ended' => $scheduleEnded,
                    'visit_session_id' => $latestSession?->id,
                    'scheduled_start' => $latestSession?->scheduled_start?->toIso8601String(),
                    'relationship_proof_path' => $visit->relationship_proof_path,
                    'additional_proof_path' => $visit->additional_proof_path,
                ];
            });

        $stats = [
            'total' => $visits->count(),
            'pending' => $visits->where('status', 'pending')->count(),
            'approved' => $visits->where('status', 'approved')->count(),
            'rejected' => $visits->where('status', 'rejected')->count(),
            'completed' => $visits->where('status', 'completed')->count(),
            'missed' => $visits->where('status', 'missed')->count(),
        ];

        // Get all jail officers
        $monitoringOfficers = \App\Models\User::whereHas('role', function ($query) {
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

        return Inertia::render('JailOfficer/ScheduleManagement', [
            'visits' => $visits,
            'stats' => $stats,
            'monitoringOfficers' => $monitoringOfficers,
        ]);
    }

    /**
     * Approve a visit schedule.
     */
    public function approve(Request $request, Visit $visit): RedirectResponse
    {
        // Debug logging
        \Illuminate\Support\Facades\Log::debug('Jail Officer approve - request data', [
            'visit_id' => $visit->id,
            'visit_type' => $visit->visit_type->value,
            'all_request_data' => $request->all(),
        ]);

        if ($visit->isScheduleInPast()) {
            $visit->update([
                'status' => VisitStatus::Rejected,
                'rejection_reason' => 'This scheduled time has passed. Please submit a new visit schedule.',
            ]);

            return redirect()->back()
                ->withErrors(['approve' => 'This schedule has passed and could not be approved. The application has been marked as not reviewed. Please ask the visitor to submit a new schedule.']);
        }

        // Auto-assign the logged-in jail officer as the monitor
        $jailOfficerId = auth()->id();

        \Illuminate\Support\Facades\Log::debug('Jail Officer approve - validation passed', [
            'assigned_jail_officer_id' => $jailOfficerId,
        ]);

        $oldJailOfficerId = $visit->jail_officer_id;
        $updateData = [
            'status' => VisitStatus::Approved,
            'jail_officer_id' => $jailOfficerId,
        ];

        $roomId = null;
        // If virtual visit, create VideoSDK room (required for approval)
        if ($visit->visit_type === VisitType::Virtual) {
            $videoSdkService = new VideoSdkService;
            $roomName = "visit-{$visit->id}-".uniqid();
            $roomResult = $videoSdkService->createRoom($roomName);

            if ($roomResult['success']) {
                $roomId = $roomResult['room_id'] ?? null;
                $updateData['meeting_link'] = $roomResult['room_url'] ?? null;
                $updateData['daily_co_room_id'] = $roomId;
                $updateData['daily_co_room_name'] = $roomResult['room_name'] ?? $roomName;
                $updateData['daily_co_room_url'] = $roomResult['room_url'] ?? null;
                $updateData['room_created_at'] = now();

                MonitoringSession::create([
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
                    ->withInput($request->only('jail_officer_id'))
                    ->withErrors([
                        'meeting_link' => 'Video room creation failed: '.($roomResult['error'] ?? 'Unknown error').'. A meeting link is required for virtual visits. Please check VideoSDK configuration and try again.',
                    ]);
            }
        }

        // Generate QR code for physical visits
        if ($visit->visit_type === VisitType::Physical && ! $visit->qr_code_data) {
            $updateData['qr_code_data'] = Visit::generateQRCodeData($visit);
            // Access key expires at the scheduled visit time
            $scheduledDateTime = $visit->scheduled_date->copy();
            if ($visit->scheduled_time) {
                [$hours, $minutes] = explode(':', $visit->scheduled_time);
                $scheduledDateTime->setTime((int) $hours, (int) $minutes);
            }
            $updateData['access_key_expires_at'] = $scheduledDateTime;
        }

        $visit->update($updateData);

        \Illuminate\Support\Facades\Log::debug('Jail Officer approve - visit updated', [
            'visit_id' => $visit->id,
            'update_data' => $updateData,
            'new_jail_officer_id' => $visit->jail_officer_id,
        ]);

        // Refresh visit to get updated meeting_link and jail officer data
        $visit = $visit->fresh();

        if ($roomId && $visit->visit_type === VisitType::Virtual) {
            app(\App\Services\VisitSessionService::class)->createForVisit($visit, $roomId);
        }

        // Notify jail officer if assigned and it's a new assignment
        if ($visit->jail_officer_id && $oldJailOfficerId !== $visit->jail_officer_id) {
            NotificationService::notifyMonitoringOfficerAboutVisit($visit);
        }

        NotificationService::createVisitNotification($visit, 'approved');

        AuditLogService::logAction(
            'visit_approved',
            $visit,
            'Visit Schedule Management',
            "Visit schedule #{$visit->id} approved for visitor {$visit->user->first_name} {$visit->user->last_name}",
            $request
        );

        return redirect()->route('jail-officer.schedules.index')
            ->with('success', 'Schedule approved successfully.');
    }

    /**
     * Reject a visit schedule.
     */
    public function reject(Request $request, Visit $visit): RedirectResponse
    {
        $request->validate([
            'rejection_reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $visit->update([
            'status' => VisitStatus::Rejected,
            'rejection_reason' => $request->rejection_reason,
        ]);

        NotificationService::createVisitNotification($visit, 'rejected');

        AuditLogService::logAction(
            'visit_rejected',
            $visit,
            'Visit Schedule Management',
            "Visit schedule #{$visit->id} rejected for visitor {$visit->user->first_name} {$visit->user->last_name}. Reason: ".substr($request->rejection_reason, 0, 100),
            $request,
            ['rejection_reason' => $request->rejection_reason]
        );

        return redirect()->route('jail-officer.schedules.index')
            ->with('success', 'Schedule rejected successfully.');
    }

    /**
     * Update visit status.
     */
    public function updateStatus(Request $request, Visit $visit): RedirectResponse
    {
        $rules = [
            'status' => 'required|in:pending,approved,rejected,completed,missed,cancelled',
            'rejection_reason' => ['required_if:status,rejected', 'string', 'min:10', 'max:1000'],
        ];
        $request->validate($rules);

        $oldJailOfficerId = $visit->jail_officer_id;
        $updateData = ['status' => VisitStatus::from($request->status)];

        if ($request->status === 'rejected') {
            $updateData['rejection_reason'] = $request->rejection_reason;
        } else {
            $updateData['rejection_reason'] = null;
        }

        // Auto-assign the logged-in jail officer when approving
        if ($request->status === 'approved') {
            $updateData['jail_officer_id'] = auth()->id();
        } elseif (in_array($request->status, ['rejected', 'pending'], true)) {
            $updateData['jail_officer_id'] = null;
        }

        // When approving virtual visit, auto-generate meeting link if not already set (required)
        if ($request->status === 'approved' && $visit->visit_type === VisitType::Virtual && ! $visit->meeting_link) {
            $videoSdkService = new VideoSdkService;
            $roomName = "visit-{$visit->id}-".uniqid();
            $roomResult = $videoSdkService->createRoom($roomName);
            if ($roomResult['success']) {
                $roomId = $roomResult['room_id'] ?? null;
                $updateData['meeting_link'] = $roomResult['room_url'] ?? null;
                $updateData['daily_co_room_id'] = $roomId;
                $updateData['daily_co_room_name'] = $roomResult['room_name'] ?? $roomName;
                $updateData['daily_co_room_url'] = $roomResult['room_url'] ?? null;
                $updateData['room_created_at'] = now();
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

        // Generate QR code for physical visits when approved
        if ($request->status === 'approved' && $visit->visit_type === VisitType::Physical && ! $visit->qr_code_data) {
            $updateData['qr_code_data'] = Visit::generateQRCodeData($visit);
            // Access key expires at the scheduled visit time
            $scheduledDateTime = $visit->scheduled_date->copy();
            if ($visit->scheduled_time) {
                [$hours, $minutes] = explode(':', $visit->scheduled_time);
                $scheduledDateTime->setTime((int) $hours, (int) $minutes);
            }
            $updateData['access_key_expires_at'] = $scheduledDateTime;
        }

        $oldStatus = $visit->status->value;
        $visit->update($updateData);

        $visit = $visit->fresh();
        if ($request->status === 'approved' && $visit->visit_type === VisitType::Virtual && $visit->daily_co_room_id && ! $visit->visitSessions()->exists()) {
            app(\App\Services\VisitSessionService::class)->createForVisit($visit, $visit->daily_co_room_id);
        }

        if ($visit->jail_officer_id && $oldJailOfficerId !== $visit->jail_officer_id && in_array($request->status, ['approved', 'pending'])) {
            NotificationService::notifyMonitoringOfficerAboutVisit($visit);
        }

        if ($request->status !== 'pending') {
            NotificationService::createVisitNotification($visit, $request->status);
        }

        $metadata = [
            'old_status' => $oldStatus,
            'new_status' => $request->status,
        ];
        if ($request->status === 'rejected' && $request->rejection_reason) {
            $metadata['rejection_reason'] = $request->rejection_reason;
        }

        AuditLogService::logAction(
            'visit_status_updated',
            $visit,
            'Visit Schedule Management',
            "Visit schedule #{$visit->id} status updated from {$oldStatus} to {$request->status}",
            $request,
            $metadata
        );

        return redirect()->route('jail-officer.schedules.index')
            ->with('success', 'Schedule status updated successfully.');
    }

    /**
     * Generate or regenerate access key for a physical visit.
     */
    public function generateAccessKey(Visit $visit): RedirectResponse
    {
        if ($visit->visit_type !== VisitType::Physical) {
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

        return redirect()->route('jail-officer.schedules.index')
            ->with('success', "Access key generated successfully: {$accessKey}");
    }

    /**
     * Reschedule a visit.
     */
    public function reschedule(Request $request, Visit $visit): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // Check for time slot conflicts
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

        $oldDate = $visit->scheduled_date->format('Y-m-d');
        $oldTime = $visit->scheduled_time;

        $visit->update([
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
        ]);

        AuditLogService::logAction(
            'visit_rescheduled',
            $visit,
            'Visit Schedule Management',
            "Visit schedule #{$visit->id} rescheduled from {$oldDate} {$oldTime} to {$request->scheduled_date} {$request->scheduled_time}",
            $request,
            [
                'old_date' => $oldDate,
                'old_time' => $oldTime,
                'new_date' => $request->scheduled_date,
                'new_time' => $request->scheduled_time,
            ]
        );

        return redirect()->route('jail-officer.schedules.index')
            ->with('success', 'Schedule rescheduled successfully.');
    }
}
