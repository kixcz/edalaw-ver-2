<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\Eburol;
use App\Models\RegistrationAppeal;
use App\Models\Visit;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FilesUploadedController extends Controller
{
    /**
     * Display the files uploaded management page.
     */
    public function index(): Response
    {
        $userId = Auth::id();

        // Get all uploaded files from visits
        $visitFiles = Visit::where('user_id', $userId)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) {
                $query->whereNotNull('relationship_proof_path')
                    ->orWhereNotNull('additional_proof_path');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($visit) {
                $files = [];
                
                if ($visit->relationship_proof_path) {
                    $files[] = [
                        'type' => 'Visit Document',
                        'subtype' => 'Proof of Relationship',
                        'path' => $visit->relationship_proof_path,
                        'uploaded_at' => $visit->created_at->format('Y-m-d H:i:s'),
                        'related_to' => "Visit to {$visit->inmate_first_name} {$visit->inmate_last_name}",
                        'status' => $visit->status->value,
                    ];
                }
                
                if ($visit->additional_proof_path) {
                    $files[] = [
                        'type' => 'Visit Document',
                        'subtype' => 'Additional Supporting Document',
                        'path' => $visit->additional_proof_path,
                        'uploaded_at' => $visit->created_at->format('Y-m-d H:i:s'),
                        'related_to' => "Visit to {$visit->inmate_first_name} {$visit->inmate_last_name}",
                        'status' => $visit->status->value,
                    ];
                }
                
                return $files;
            })
            ->flatten(1);

        // Get all uploaded files from eburol applications
        $eburolFiles = Eburol::where('user_id', $userId)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) {
                $query->whereNotNull('relationship_proof_path')
                      ->orWhereNotNull('death_certificate_path');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($eburol) {
                $files = [];
                
                if ($eburol->death_certificate_path) {
                    $files[] = [
                        'type' => 'E-Burol Document',
                        'subtype' => 'Death Certificate',
                        'path' => $eburol->death_certificate_path,
                        'uploaded_at' => $eburol->created_at->format('Y-m-d H:i:s'),
                        'related_to' => "E-Burol for {$eburol->deceased_first_name} {$eburol->deceased_last_name}",
                        'status' => $eburol->status->value,
                    ];
                }
                
                if ($eburol->relationship_proof_path) {
                    $files[] = [
                        'type' => 'E-Burol Document',
                        'subtype' => 'Relationship Proof',
                        'path' => $eburol->relationship_proof_path,
                        'uploaded_at' => $eburol->created_at->format('Y-m-d H:i:s'),
                        'related_to' => "E-Burol for {$eburol->deceased_first_name} {$eburol->deceased_last_name}",
                        'status' => $eburol->status->value,
                    ];
                }
                
                return $files;
            })
            ->flatten(1);

        // Get all uploaded files from registration appeals
        $appealFiles = RegistrationAppeal::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($appeal) {
                $files = [];
                
                if ($appeal->id_document_1_path) {
                    $files[] = [
                        'type' => 'Registration Document',
                        'subtype' => 'ID Document 1',
                        'path' => $appeal->id_document_1_path,
                        'uploaded_at' => $appeal->created_at->format('Y-m-d H:i:s'),
                        'related_to' => 'Registration Appeal',
                        'status' => $appeal->status->value ?? 'pending',
                    ];
                }
                
                if ($appeal->id_document_2_path) {
                    $files[] = [
                        'type' => 'Registration Document',
                        'subtype' => 'ID Document 2',
                        'path' => $appeal->id_document_2_path,
                        'uploaded_at' => $appeal->created_at->format('Y-m-d H:i:s'),
                        'related_to' => 'Registration Appeal',
                        'status' => $appeal->status->value ?? 'pending',
                    ];
                }
                
                return $files;
            })
            ->flatten(1);

        // Combine all files
        $allFiles = $visitFiles->concat($eburolFiles)->concat($appealFiles)
            ->sortByDesc('uploaded_at')
            ->values();

        // Statistics
        $stats = [
            'total_files' => $allFiles->count(),
            'visit_documents' => $visitFiles->count(),
            'eburol_documents' => $eburolFiles->count(),
            'registration_documents' => $appealFiles->count(),
        ];

        return Inertia::render('Visitor/FilesUploaded', [
            'files' => $allFiles->toArray(),
            'stats' => $stats,
        ]);
    }
}
