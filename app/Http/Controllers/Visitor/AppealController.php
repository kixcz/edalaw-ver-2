<?php

namespace App\Http\Controllers\Visitor;

use App\AppealStatus;
use App\EburolStatus;
use App\Http\Controllers\Controller;
use App\Models\Appeal;
use App\Models\AppealDocument;
use App\Models\Eburol;
use App\Models\Visit;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\VisitStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class AppealController extends Controller
{
    /**
     * Display the appeal management page.
     */
    public function index(): Response
    {
        // Auto-reject expired appeals
        $this->autoRejectExpiredAppeals();
        $appeals = Appeal::where('user_id', auth()->id())
            ->with(['appealable', 'reviewer', 'documents'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($appeal) {
                $appealableType = $appeal->appealable_type === Visit::class ? 'Visit Schedule' : 'E-Burol Application';
                $appealableData = null;

                if ($appeal->appealable_type === Visit::class) {
                    $visit = $appeal->appealable;
                    if ($visit) {
                        $appealableData = [
                            'type' => 'visit',
                            'id' => $visit->id,
                            'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                            'scheduled_time' => $visit->scheduled_time,
                            'visit_type' => $visit->visit_type->value,
                            'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                            'status' => $visit->status->value,
                        ];
                    } else {
                        $appealableData = [
                            'type' => 'visit',
                            'id' => null,
                            'scheduled_date' => 'N/A',
                            'scheduled_time' => null,
                            'visit_type' => 'N/A',
                            'inmate_name' => 'Record not found',
                            'status' => 'deleted',
                        ];
                    }
                } else {
                    $eburol = $appeal->appealable;
                    if ($eburol) {
                        $appealableData = [
                            'type' => 'eburol',
                            'id' => $eburol->id,
                            'deceased_name' => trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}"),
                            'inmate_name' => trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}"),
                            'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                            'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
                            'status' => $eburol->status->value,
                        ];
                    } else {
                        $appealableData = [
                            'type' => 'eburol',
                            'id' => null,
                            'deceased_name' => 'Record not found',
                            'inmate_name' => 'Record not found',
                            'wake_start_date' => 'N/A',
                            'wake_end_date' => 'N/A',
                            'status' => 'deleted',
                        ];
                    }
                }

                return [
                    'id' => $appeal->id,
                    'appealable_type' => $appealableType,
                    'appealable_data' => $appealableData,
                    'reason' => $appeal->reason,
                    'status' => $appeal->status->value,
                    'reviewed_by' => $appeal->reviewer ? $appeal->reviewer->first_name.' '.$appeal->reviewer->last_name : null,
                    'reviewed_at' => $appeal->reviewed_at?->format('Y-m-d H:i:s'),
                    'decision_notes' => $appeal->decision_notes,
                    'submitted_at' => $appeal->submitted_at?->format('Y-m-d H:i:s'),
                    'deadline' => $appeal->deadline?->format('Y-m-d H:i:s'),
                    'is_within_deadline' => $appeal->isWithinDeadline(),
                    'documents' => $appeal->documents->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'file_name' => $doc->file_name,
                            'file_path' => Storage::url($doc->file_path),
                        ];
                    }),
                    'created_at' => $appeal->created_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get rejected visits and e-burols that can be appealed
        $rejectedVisits = Visit::where('user_id', auth()->id())
            ->where('status', VisitStatus::Rejected)
            ->whereDoesntHave('appeals', function ($query) {
                $query->where('status', '!=', AppealStatus::Rejected);
            })
            ->get()
            ->map(function ($visit) {
                $deadline = $visit->updated_at->copy()->addHours(48);
                $canAppeal = now()->isBefore($deadline);

                return [
                    'id' => $visit->id,
                    'type' => 'visit',
                    'type_label' => 'Visit Schedule',
                    'scheduled_date' => $visit->scheduled_date->format('Y-m-d'),
                    'scheduled_time' => $visit->scheduled_time,
                    'visit_type' => $visit->visit_type->value,
                    'inmate_name' => trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                    'rejected_at' => $visit->updated_at->format('Y-m-d H:i:s'),
                    'can_appeal' => $canAppeal,
                    'appeal_deadline' => $deadline->format('Y-m-d H:i:s'),
                ];
            });

        $rejectedEburols = Eburol::where('user_id', auth()->id())
            ->where('status', EburolStatus::Rejected)
            ->whereDoesntHave('appeals', function ($query) {
                $query->where('status', '!=', AppealStatus::Rejected);
            })
            ->get()
            ->map(function ($eburol) {
                $deadline = $eburol->updated_at->copy()->addHours(48);
                $canAppeal = now()->isBefore($deadline);

                return [
                    'id' => $eburol->id,
                    'type' => 'eburol',
                    'type_label' => 'E-Burol Application',
                    'deceased_name' => trim("{$eburol->deceased_first_name} {$eburol->deceased_middle_name} {$eburol->deceased_last_name}"),
                    'inmate_name' => trim("{$eburol->inmate_first_name} {$eburol->inmate_middle_name} {$eburol->inmate_last_name}"),
                    'wake_start_date' => $eburol->wake_start_date->format('Y-m-d'),
                    'wake_end_date' => $eburol->wake_end_date->format('Y-m-d'),
                    'rejected_at' => $eburol->updated_at->format('Y-m-d H:i:s'),
                    'can_appeal' => $canAppeal,
                    'appeal_deadline' => $deadline->format('Y-m-d H:i:s'),
                ];
            });

        // Calculate stats (max 4 KPIs)
        $stats = [
            'total_appeals' => $appeals->count(),
            'pending_appeals' => $appeals->where('status', AppealStatus::Pending)->count(),
            'approved_appeals' => $appeals->where('status', AppealStatus::Approved)->count(),
            'rejected_appeals' => $appeals->where('status', AppealStatus::Rejected)->count(),
        ];

        return Inertia::render('Visitor/Appeals', [
            'appeals' => $appeals,
            'rejected_visits' => $rejectedVisits,
            'rejected_eburols' => $rejectedEburols,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a new appeal.
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'appealable_type' => ['required', 'string', 'in:visit,eburol'],
            'appealable_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'documents' => ['nullable', 'array', 'max:5'],
            'documents.*' => ['file', 'max:5120', 'mimes:pdf,doc,docx,jpg,jpeg,png'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // Determine the appealable model and status enum
        $appealableType = $request->appealable_type === 'visit' ? Visit::class : Eburol::class;
        $rejectedStatus = $request->appealable_type === 'visit' ? VisitStatus::Rejected : EburolStatus::Rejected;

        $appealable = $appealableType::where('id', $request->appealable_id)
            ->where('user_id', auth()->id())
            ->where('status', $rejectedStatus)
            ->first();

        // Ensure the original request exists and is rejected
        if (! $appealable) {
            return redirect()->back()
                ->withErrors(['appeal' => 'The requested item was not found or is not rejected.'])
                ->withInput();
        }

        if ($appealable->status !== $rejectedStatus) {
            return redirect()->back()
                ->withErrors(['appeal' => 'You can only appeal rejected requests.'])
                ->withInput();
        }

        // Check if already appealed and not rejected
        $existingAppeal = Appeal::where('user_id', auth()->id())
            ->where('appealable_type', $appealableType)
            ->where('appealable_id', $request->appealable_id)
            ->where('status', '!=', AppealStatus::Rejected)
            ->first();

        if ($existingAppeal) {
            return redirect()->back()
                ->withErrors(['appeal' => 'You have already submitted an appeal for this request.'])
                ->withInput();
        }

        // Check if within deadline (48 hours after rejection)
        // Use copy() to avoid mutating the original timestamp
        $deadline = $appealable->updated_at->copy()->addHours(48);
        if (now()->isAfter($deadline)) {
            return redirect()->back()
                ->withErrors(['appeal' => 'The deadline for submitting an appeal has passed (48 hours after rejection).'])
                ->withInput();
        }

        // Create appeal
        $appeal = Appeal::create([
            'user_id' => auth()->id(),
            'appealable_type' => $appealableType,
            'appealable_id' => $request->appealable_id,
            'reason' => $request->reason,
            'status' => AppealStatus::Pending,
            'submitted_at' => now(),
            'deadline' => $deadline,
        ]);

        // Store documents
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $filePath = $file->store('appeals/documents', 'public');
                AppealDocument::create([
                    'appeal_id' => $appeal->id,
                    'file_path' => $filePath,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        // Create notification
        NotificationService::createAppealSubmittedNotification($appeal);
        NotificationService::notifySuperAdminsAboutAppeal($appeal);
        NotificationService::notifyBjmpOfficersAboutAppeal($appeal);

        // Log appeal submission for audit
        $appealableType = $request->appealable_type === 'visit' ? 'Visit Schedule' : 'E-Burol Application';
        AuditLogService::logAction(
            'appeal_submitted',
            $appeal,
            'Appeal Management',
            "Appeal submitted for {$appealableType} #{$request->appealable_id}. Reason: ".substr($request->reason, 0, 100),
            $request,
            [
                'appealable_type' => $appealableType,
                'appealable_id' => $request->appealable_id,
                'reason_preview' => substr($request->reason, 0, 100),
            ]
        );

        return redirect()->back()->with('success', 'Appeal submitted successfully. Your appeal has been sent to the BJMP officer for review. Thank you for taking the time to submit your appeal.');
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

    /**
     * Download an appeal document.
     */
    public function downloadDocument(AppealDocument $document)
    {
        // Check if the document belongs to an appeal owned by the current user
        $appeal = Appeal::where('id', $document->appeal_id)
            ->where('user_id', auth()->id())
            ->first();

        if (! $appeal) {
            abort(403, 'You do not have permission to access this document.');
        }

        if (! Storage::exists($document->file_path)) {
            abort(404, 'File not found.');
        }

        return Storage::download($document->file_path, $document->file_name);
    }
}
