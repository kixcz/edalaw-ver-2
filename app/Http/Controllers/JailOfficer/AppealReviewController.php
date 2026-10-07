<?php

namespace App\Http\Controllers\JailOfficer;

use App\AppealStatus;
use App\Http\Controllers\Controller;
use App\Models\Appeal;
use App\Models\Eburol;
use App\Models\Visit;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class AppealReviewController extends Controller
{
    /**
     * Display the appeal review page.
     */
    public function index(): Response
    {
        // Auto-reject expired appeals
        $this->autoRejectExpiredAppeals();
        $appeals = Appeal::with(['user', 'appealable', 'reviewer', 'documents'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($appeal) {
                $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';
                $appealableData = null;

                if ($appeal->appealable === null) {
                    return [
                        'id' => $appeal->id,
                        'user_name' => $appeal->user ? trim("{$appeal->user->first_name} {$appeal->user->middle_name} {$appeal->user->last_name}") : '—',
                        'user_email' => $appeal->user?->email ?? '—',
                        'appealable_type' => $appealableType,
                        'appealable_data' => ['type' => 'visit', 'id' => 0, 'status' => 'deleted', 'inmate_name' => '—'],
                        'reason' => $appeal->reason,
                        'status' => $appeal->status->value,
                        'reviewed_by' => $appeal->reviewer ? trim("{$appeal->reviewer->first_name} {$appeal->reviewer->last_name}") : null,
                        'reviewed_at' => $appeal->reviewed_at?->format('Y-m-d H:i:s'),
                        'decision_notes' => $appeal->decision_notes,
                        'submitted_at' => $appeal->submitted_at?->format('Y-m-d H:i:s'),
                        'deadline' => $appeal->deadline?->format('Y-m-d H:i:s'),
                        'documents' => $appeal->documents->map(fn ($doc) => [
                            'id' => $doc->id,
                            'file_name' => $doc->file_name,
                            'file_path' => Storage::url($doc->file_path),
                            'file_size' => $doc->file_size,
                        ]),
                        'created_at' => $appeal->created_at->format('Y-m-d H:i:s'),
                    ];
                }

                if ($appeal->appealable_type === Visit::class) {
                    $visit = $appeal->appealable;
                    $appealableData = [
                        'type' => 'visit',
                        'id' => $visit->id,
                        'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                        'scheduled_time' => $visit->scheduled_time,
                        'visit_type' => $visit->visit_type->value,
                        'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                        'status' => $visit->status->value,
                        'notes' => $visit->notes,
                    ];
                } else {
                    $eburol = $appeal->appealable;
                    $appealableData = [
                        'type' => 'eburol',
                        'id' => $eburol->id,
                        'deceased_name' => trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}"),
                        'inmate_name' => trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}"),
                        'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                        'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
                        'status' => $eburol->status->value,
                        'admin_notes' => $eburol->admin_notes,
                    ];
                }

                return [
                    'id' => $appeal->id,
                    'user_name' => trim("{$appeal->user->first_name} {$appeal->user->middle_name} {$appeal->user->last_name}"),
                    'user_email' => $appeal->user->email,
                    'appealable_type' => $appealableType,
                    'appealable_data' => $appealableData,
                    'reason' => $appeal->reason,
                    'status' => $appeal->status->value,
                    'reviewed_by' => $appeal->reviewer ? trim("{$appeal->reviewer->first_name} {$appeal->reviewer->last_name}") : null,
                    'reviewed_at' => $appeal->reviewed_at?->format('Y-m-d H:i:s'),
                    'decision_notes' => $appeal->decision_notes,
                    'submitted_at' => $appeal->submitted_at?->format('Y-m-d H:i:s'),
                    'deadline' => $appeal->deadline?->format('Y-m-d H:i:s'),
                    'documents' => $appeal->documents->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'file_name' => $doc->file_name,
                            'file_path' => Storage::url($doc->file_path),
                            'file_size' => $doc->file_size,
                        ];
                    }),
                    'created_at' => $appeal->created_at->format('Y-m-d H:i:s'),
                ];
            });

        $stats = [
            'total' => Appeal::count(),
            'pending' => Appeal::where('status', AppealStatus::Pending)->count(),
            'approved' => Appeal::where('status', AppealStatus::Approved)->count(),
            'rejected' => Appeal::where('status', AppealStatus::Rejected)->count(),
        ];

        return Inertia::render('JailOfficer/AppealReview', [
            'appeals' => $appeals,
            'stats' => $stats,
        ]);
    }

    /**
     * Review an appeal (approve or reject).
     */
    public function review(Request $request, Appeal $appeal): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string', 'in:approved,rejected'],
            'decision_notes' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $appeal->update([
            'status' => AppealStatus::from($request->status),
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'decision_notes' => $request->decision_notes,
        ]);

        // If approved, reverse the original decision
        if ($request->status === 'approved') {
            $appealable = $appeal->appealable;
            if ($appealable instanceof Visit) {
                $appealable->update(['status' => \App\VisitStatus::Approved]);
            } elseif ($appealable instanceof Eburol) {
                $appealable->update(['status' => \App\EburolStatus::Approved]);
            }
        }

        // Notification is sent via model boot method
        NotificationService::createAppealStatusNotification($appeal);

        // Log appeal review for audit
        AuditLogService::logAction(
            'appeal_reviewed',
            $appeal,
            'Appeal Processing',
            "Appeal #{$appeal->id} {$request->status} for {$appeal->appealable_type} #{$appeal->appealable_id}. Notes: ".substr($request->decision_notes, 0, 100),
            $request,
            [
                'decision_notes' => $request->decision_notes,
                'appealable_type' => class_basename($appeal->appealable),
                'appealable_id' => $appeal->appealable_id,
            ]
        );

        return redirect()->back()->with('success', "Appeal {$request->status} successfully.");
    }

    /**
     * Automatically reject appeals that have passed their deadline.
     */
    private function autoRejectExpiredAppeals(): void
    {
        $expiredAppeals = Appeal::where('status', AppealStatus::Pending)
            ->where('deadline', '<', now())
            ->get();

        foreach ($expiredAppeals as $appeal) {
            $appeal->update([
                'status' => AppealStatus::Rejected,
                'reviewed_by' => null, // System action
                'reviewed_at' => now(),
                'decision_notes' => 'Automatically rejected: Appeal deadline has passed (48 hours after original rejection).',
            ]);

            // Log automatic rejection
            AuditLogService::logAppealAction(
                'appeal_auto_rejected',
                $appeal,
                "Appeal automatically rejected due to deadline expiration. Original request: {$appeal->appealable_type} #{$appeal->appealable_id}",
                request()
            );

            // Notify user
            NotificationService::createAppealStatusNotification($appeal);
        }
    }
}
