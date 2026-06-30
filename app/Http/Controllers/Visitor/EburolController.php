<?php

namespace App\Http\Controllers\Visitor;

use App\AppealStatus;
use App\EburolStatus;
use App\Http\Controllers\Controller;
use App\Models\Appeal;
use App\Models\Eburol;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\VisitorScheduleConflictService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EburolController extends Controller
{
    /**
     * Display the e-burol management page.
     */
    public function index(): Response
    {
        $eburols = Eburol::with(['visitSessions' => fn ($q) => $q->orderBy('scheduled_start', 'desc')->limit(1)])
            ->where('user_id', auth()->id())
            ->orderBy('wake_start_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($eburol) {
                $canAppeal = false;
                $appealDeadline = null;
                if ($eburol->status === EburolStatus::Rejected) {
                    $deadline = $eburol->updated_at->copy()->addHours(48);
                    $canAppeal = now()->isBefore($deadline);
                    $appealDeadline = $deadline->format('Y-m-d H:i:s');

                    // Check if already has a pending or approved appeal
                    $hasActiveAppeal = Appeal::where('user_id', auth()->id())
                        ->where('appealable_type', Eburol::class)
                        ->where('appealable_id', $eburol->id)
                        ->where('status', '!=', AppealStatus::Rejected)
                        ->exists();

                    if ($hasActiveAppeal) {
                        $canAppeal = false;
                    }
                }

                $latestSession = $eburol->visitSessions->first();
                $visitSessionPayload = null;
                $joinUrl = null;
                if ($latestSession) {
                    $tz = config('app.timezone');
                    $now = now($tz);
                    $start = $latestSession->scheduled_start->setTimezone($tz);
                    $end = $latestSession->scheduled_end->setTimezone($tz);
                    $withinWindow = $now->between($start, $end);
                    $notCompleted = ! in_array($latestSession->status, ['completed', 'terminated'], true);
                    $canJoinVideo = $eburol->status === EburolStatus::Approved && $withinWindow && $notCompleted;
                    $joinDisabledReason = null;
                    if (! $canJoinVideo && $eburol->status === EburolStatus::Approved && $notCompleted) {
                        $joinDisabledReason = $now->lt($start) ? 'not_started' : 'ended';
                    } elseif (! $canJoinVideo && $notCompleted === false) {
                        $joinDisabledReason = 'ended';
                    }
                    $visitSessionPayload = [
                        'id' => $latestSession->id,
                        'scheduled_start' => $latestSession->scheduled_start->toIso8601String(),
                        'scheduled_end' => $latestSession->scheduled_end->toIso8601String(),
                        'status' => $latestSession->status,
                        'terms_accepted_at' => $latestSession->terms_accepted_at?->toIso8601String(),
                        'can_join_video' => $canJoinVideo,
                        'join_disabled_reason' => $joinDisabledReason,
                    ];
                    $joinUrl = route('visit-session.show', $latestSession);
                }

                return [
                    'id' => $eburol->id,
                    'inmate_first_name' => $eburol->inmate_first_name,
                    'inmate_middle_name' => $eburol->inmate_middle_name,
                    'inmate_last_name' => $eburol->inmate_last_name,
                    'deceased_first_name' => $eburol->deceased_first_name,
                    'deceased_middle_name' => $eburol->deceased_middle_name,
                    'deceased_last_name' => $eburol->deceased_last_name,
                    'deceased_date_of_death' => $eburol->deceased_date_of_death->format('Y-m-d'),
                    'relationship_to_inmate' => $eburol->relationship_to_inmate,
                    'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                    'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
                    'preferred_time' => $eburol->preferred_time,
                    'wake_location' => $eburol->wake_location,
                    'additional_details' => $eburol->additional_details,
                    'death_certificate_path' => $eburol->death_certificate_path ? route('visitor.eburol.document.death-certificate', $eburol) : null,
                    'relationship_proof_path' => $eburol->relationship_proof_path ? route('visitor.eburol.document.relationship-proof', $eburol) : null,
                    'status' => $eburol->status->value,
                    'admin_notes' => $eburol->admin_notes,
                    'rejection_reason' => $eburol->rejection_reason,
                    'created_at' => $eburol->created_at->format('Y-m-d H:i:s'),
                    'can_appeal' => $canAppeal,
                    'appeal_deadline' => $appealDeadline,
                    'visit_session' => $visitSessionPayload,
                    'join_url' => $joinUrl,
                ];
            });

        // Calculate stats (max 4 KPIs)
        $stats = [
            'total_eburols' => $eburols->count(),
            'pending_eburols' => $eburols->where('status', EburolStatus::Pending)->count(),
            'approved_eburols' => $eburols->where('status', EburolStatus::Approved)->count(),
            'rejected_eburols' => $eburols->where('status', EburolStatus::Rejected)->count(),
        ];

        return Inertia::render('Visitor/EburolManagement', [
            'eburols' => $eburols,
            'stats' => $stats,
        ]);
    }

    /**
     * Get 1-hour slot availability for a given date (for e-burol preferred time picker). Max 4 per slot.
     */
    public function slotAvailability(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['date' => ['required', 'date', 'after_or_equal:today']]);
        $date = $request->input('date');
        $slots = [];
        $maxPerSlot = 4;
        $tz = config('app.timezone');
        $isToday = $date === now($tz)->format('Y-m-d');
        $nowMinutes = $isToday ? (int) now($tz)->format('G') * 60 + (int) now($tz)->format('i') : 0;

        for ($hour = 7; $hour < 18; $hour++) {
            $slot = sprintf('%02d:00', $hour);
            $slotMinutes = $hour * 60;
            $isPast = $isToday && $slotMinutes < $nowMinutes;
            $current = Eburol::where('wake_start_date', $date)
                ->where('preferred_time', $slot)
                ->whereIn('status', [EburolStatus::Pending, EburolStatus::Approved])
                ->count();
            $slots[$slot] = [
                'current' => $current,
                'max' => $maxPerSlot,
                'isFull' => $current >= $maxPerSlot,
                'isPast' => $isPast,
            ];
        }

        return response()->json($slots);
    }

    /**
     * Store a new e-burol request.
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'inmate_first_name' => ['required', 'string', 'max:255'],
            'inmate_middle_name' => ['nullable', 'string', 'max:255'],
            'inmate_last_name' => ['required', 'string', 'max:255'],
            'deceased_first_name' => ['required', 'string', 'max:255'],
            'deceased_middle_name' => ['nullable', 'string', 'max:255'],
            'deceased_last_name' => ['required', 'string', 'max:255'],
            'deceased_date_of_death' => ['required', 'date', 'before_or_equal:today'],
            'relationship_to_inmate' => ['required', 'string', 'max:255'],
            'wake_start_date' => ['required', 'date', 'after_or_equal:today'],
            'wake_end_date' => ['nullable', 'date', 'after_or_equal:wake_start_date'],
            'preferred_time' => ['nullable', 'date_format:H:i'],
            'wake_location' => ['required', 'string', 'max:500'],
            'additional_details' => ['nullable', 'string', 'max:2000'],
            'death_certificate' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // 10MB max
            'relationship_proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'], // 10MB max
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        if ($request->filled('preferred_time')) {
            $conflictService = new VisitorScheduleConflictService;
            if ($conflictService->hasConflict(auth()->id(), $request->wake_start_date, $request->preferred_time, 60)) {
                return redirect()->back()
                    ->withErrors(['preferred_time' => 'You already have a virtual visit or e-burol scheduled in this time range. Please choose another slot.'])
                    ->withInput();
            }
        }

        // Store uploaded files
        $deathCertificatePath = null;
        $relationshipProofPath = null;

        if ($request->hasFile('death_certificate')) {
            $deathCertificatePath = $request->file('death_certificate')->store('eburols/death_certificates', 'public');
        }

        if ($request->hasFile('relationship_proof')) {
            $relationshipProofPath = $request->file('relationship_proof')->store('eburols/relationship_proofs', 'public');
        }

        $wakeEndDate = $request->filled('wake_end_date') ? $request->wake_end_date : $request->wake_start_date;

        $eburol = Eburol::create([
            'user_id' => auth()->id(),
            'inmate_first_name' => $request->inmate_first_name,
            'inmate_middle_name' => $request->inmate_middle_name,
            'inmate_last_name' => $request->inmate_last_name,
            'deceased_first_name' => $request->deceased_first_name,
            'deceased_middle_name' => $request->deceased_middle_name,
            'deceased_last_name' => $request->deceased_last_name,
            'deceased_date_of_death' => $request->deceased_date_of_death,
            'relationship_to_inmate' => $request->relationship_to_inmate,
            'wake_start_date' => $request->wake_start_date,
            'wake_end_date' => $wakeEndDate,
            'preferred_time' => $request->preferred_time,
            'wake_location' => $request->wake_location,
            'additional_details' => $request->additional_details,
            'death_certificate_path' => $deathCertificatePath,
            'relationship_proof_path' => $relationshipProofPath,
            'status' => EburolStatus::Pending,
        ]);

        // Create notification that application was received
        NotificationService::createEburolSubmittedNotification($eburol);
        NotificationService::notifySuperAdminsAboutEburol($eburol);

        // Log the action
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        $inmateName = trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}");
        AuditLogService::logAction(
            'eburol_submitted',
            $eburol,
            'E-Burol Management',
            "E-Burol application submitted for deceased {$deceasedName}, inmate {$inmateName}. Wake: {$eburol->wake_start_date->format('M d, Y')} {$eburol->preferred_time}",
            $request,
            [
                'deceased_name' => $deceasedName,
                'inmate_name' => $inmateName,
                'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
            ]
        );

        return redirect()->back()->with('success', 'E-burol application submitted successfully. Your application has been sent to the BJMP officer for review. Please wait for approval.');
    }

    /**
     * Show a specific e-burol request.
     */
    public function show(Eburol $eburol): Response
    {
        // Ensure the eburol belongs to the authenticated user
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }

        $eburolData = [
            'id' => $eburol->id,
            'inmate_first_name' => $eburol->inmate_first_name,
            'inmate_middle_name' => $eburol->inmate_middle_name,
            'inmate_last_name' => $eburol->inmate_last_name,
            'deceased_first_name' => $eburol->deceased_first_name,
            'deceased_middle_name' => $eburol->deceased_middle_name,
            'deceased_last_name' => $eburol->deceased_last_name,
            'deceased_date_of_death' => $eburol->deceased_date_of_death->format('Y-m-d'),
            'relationship_to_inmate' => $eburol->relationship_to_inmate,
            'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
            'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
            'preferred_time' => $eburol->preferred_time,
            'wake_location' => $eburol->wake_location,
            'additional_details' => $eburol->additional_details,
            'death_certificate_path' => $eburol->death_certificate_path ? route('visitor.eburol.document.death-certificate', $eburol) : null,
            'relationship_proof_path' => $eburol->relationship_proof_path ? route('visitor.eburol.document.relationship-proof', $eburol) : null,
            'status' => $eburol->status->value,
            'admin_notes' => $eburol->admin_notes,
            'created_at' => $eburol->created_at->format('Y-m-d H:i:s'),
        ];

        return Inertia::render('Visitor/EburolShow', [
            'eburol' => $eburolData,
        ]);
    }

    /**
     * Update an e-burol request (only if pending).
     */
    public function update(Request $request, Eburol $eburol): RedirectResponse
    {
        // Ensure the eburol belongs to the authenticated user
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }

        // Only allow updates for pending applications
        if ($eburol->status !== EburolStatus::Pending) {
            return redirect()->back()
                ->withErrors(['status' => 'You can only edit pending applications.'])
                ->withInput();
        }

        $validator = Validator::make($request->all(), [
            'inmate_first_name' => ['required', 'string', 'max:255'],
            'inmate_middle_name' => ['nullable', 'string', 'max:255'],
            'inmate_last_name' => ['required', 'string', 'max:255'],
            'deceased_first_name' => ['required', 'string', 'max:255'],
            'deceased_middle_name' => ['nullable', 'string', 'max:255'],
            'deceased_last_name' => ['required', 'string', 'max:255'],
            'deceased_date_of_death' => ['required', 'date', 'before_or_equal:today'],
            'relationship_to_inmate' => ['required', 'string', 'max:255'],
            'wake_start_date' => ['required', 'date', 'after_or_equal:today'],
            'wake_end_date' => ['required', 'date', 'after_or_equal:wake_start_date'],
            'preferred_time' => ['nullable', 'date_format:H:i'],
            'wake_location' => ['required', 'string', 'max:500'],
            'additional_details' => ['nullable', 'string', 'max:2000'],
            'death_certificate' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'relationship_proof' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $wakeEndDate = $request->filled('wake_end_date') ? $request->wake_end_date : $request->wake_start_date;

        $updateData = [
            'inmate_first_name' => $request->inmate_first_name,
            'inmate_middle_name' => $request->inmate_middle_name,
            'inmate_last_name' => $request->inmate_last_name,
            'deceased_first_name' => $request->deceased_first_name,
            'deceased_middle_name' => $request->deceased_middle_name,
            'deceased_last_name' => $request->deceased_last_name,
            'deceased_date_of_death' => $request->deceased_date_of_death,
            'relationship_to_inmate' => $request->relationship_to_inmate,
            'wake_start_date' => $request->wake_start_date,
            'wake_end_date' => $wakeEndDate,
            'preferred_time' => $request->preferred_time,
            'wake_location' => $request->wake_location,
            'additional_details' => $request->additional_details,
        ];

        // Update files only if new ones are provided
        if ($request->hasFile('death_certificate')) {
            // Delete old file if exists
            if ($eburol->death_certificate_path) {
                Storage::disk('public')->delete($eburol->death_certificate_path);
            }
            $updateData['death_certificate_path'] = $request->file('death_certificate')->store('eburols/death_certificates', 'public');
        }

        if ($request->hasFile('relationship_proof')) {
            // Delete old file if exists
            if ($eburol->relationship_proof_path) {
                Storage::disk('public')->delete($eburol->relationship_proof_path);
            }
            $updateData['relationship_proof_path'] = $request->file('relationship_proof')->store('eburols/relationship_proofs', 'public');
        }

        $eburol->update($updateData);

        // Log the action
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        AuditLogService::logAction(
            'eburol_updated',
            $eburol,
            'E-Burol Management',
            "E-Burol application #{$eburol->id} updated for deceased {$deceasedName}",
            $request
        );

        return redirect()->route('visitor.eburol.index')
            ->with('success', 'E-burol application updated successfully.');
    }

    /**
     * Reschedule an e-burol request (only if pending).
     */
    public function reschedule(Request $request, Eburol $eburol): RedirectResponse
    {
        // Ensure the eburol belongs to the authenticated user
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }

        // Only allow rescheduling for pending applications
        if ($eburol->status !== EburolStatus::Pending) {
            return redirect()->back()
                ->withErrors(['status' => 'You can only reschedule pending applications.'])
                ->withInput();
        }

        $validator = Validator::make($request->all(), [
            'wake_start_date' => ['required', 'date', 'after_or_equal:today'],
            'wake_end_date' => ['required', 'date', 'after_or_equal:wake_start_date'],
            'preferred_time' => ['nullable', 'date_format:H:i'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $oldStartDate = $eburol->wake_start_date->format('Y-m-d');
        $oldEndDate = $eburol->wake_end_date->format('Y-m-d');

        $eburol->update([
            'wake_start_date' => $request->wake_start_date,
            'wake_end_date' => $request->wake_end_date,
            'preferred_time' => $request->preferred_time,
        ]);

        // Log the action
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        AuditLogService::logAction(
            'eburol_rescheduled',
            $eburol,
            'E-Burol Management',
            "E-Burol application rescheduled for deceased {$deceasedName}. From: {$oldStartDate} - {$oldEndDate} to {$request->wake_start_date} - {$request->wake_end_date}",
            $request,
            [
                'deceased_name' => $deceasedName,
                'old_start_date' => $oldStartDate,
                'old_end_date' => $oldEndDate,
                'new_start_date' => $request->wake_start_date,
                'new_end_date' => $request->wake_end_date,
            ]
        );

        return redirect()->route('visitor.eburol.index')
            ->with('success', 'E-burol schedule rescheduled successfully.');
    }

    /**
     * Delete an e-burol request (only if pending).
     */
    public function destroy(Eburol $eburol): RedirectResponse
    {
        // Ensure the eburol belongs to the authenticated user
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }

        // Only allow deletion for pending applications
        if ($eburol->status !== EburolStatus::Pending) {
            return redirect()->back()
                ->withErrors(['status' => 'You can only delete pending applications.']);
        }

        // Delete associated files
        if ($eburol->death_certificate_path) {
            Storage::disk('public')->delete($eburol->death_certificate_path);
        }
        if ($eburol->relationship_proof_path) {
            Storage::disk('public')->delete($eburol->relationship_proof_path);
        }

        // Log the action before deletion
        $deceasedName = trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}");
        $eburolId = $eburol->id;
        $wakeStartDate = $eburol->wake_start_date->format('Y-m-d');

        $eburol->delete();

        // Create a log entry manually since the model is deleted
        \App\Models\AuditLog::create([
            'action' => 'eburol_deleted',
            'auditable_type' => Eburol::class,
            'auditable_id' => $eburolId,
            'user_id' => auth()->id(),
            'user_role' => auth()->user()->role?->slug,
            'description' => "E-Burol application #{$eburolId} deleted for deceased {$deceasedName}. Wake period: {$wakeStartDate}",
            'metadata' => [
                'user_email' => auth()->user()->email,
                'user_name' => trim(auth()->user()->first_name.' '.auth()->user()->middle_name.' '.auth()->user()->last_name),
                'module' => 'E-Burol Management',
                'deceased_name' => $deceasedName,
                'eburol_id' => $eburolId,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return redirect()->route('visitor.eburol.index')
            ->with('success', 'E-burol application deleted successfully.');
    }

    /**
     * Serve death certificate file for viewing (visitor's own eburol only).
     */
    public function deathCertificate(Eburol $eburol): BinaryFileResponse
    {
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }
        if (! $eburol->death_certificate_path || ! Storage::disk('public')->exists($eburol->death_certificate_path)) {
            abort(404, 'Document not found.');
        }

        return response()->file(Storage::disk('public')->path($eburol->death_certificate_path), [
            'Content-Disposition' => 'inline; filename="'.basename($eburol->death_certificate_path).'"',
        ]);
    }

    /**
     * Serve relationship proof file for viewing (visitor's own eburol only).
     */
    public function relationshipProof(Eburol $eburol): BinaryFileResponse
    {
        if ($eburol->user_id !== auth()->id()) {
            abort(403);
        }
        if (! $eburol->relationship_proof_path || ! Storage::disk('public')->exists($eburol->relationship_proof_path)) {
            abort(404, 'Document not found.');
        }

        return response()->file(Storage::disk('public')->path($eburol->relationship_proof_path), [
            'Content-Disposition' => 'inline; filename="'.basename($eburol->relationship_proof_path).'"',
        ]);
    }
}
