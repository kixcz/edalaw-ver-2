<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

class TaggedInmatesController extends Controller
{
    /**
     * Display a listing of tagged inmates for the visitor.
     */
    public function index(): Response
    {
        $userId = Auth::id();

        // Get all unique inmates from approved visits with their files
        $taggedInmates = Visit::where('user_id', $userId)
            ->where('status', 'approved')
            ->with(['inmate', 'relationshipProofFile', 'additionalProofFile'])
            ->get()
            ->map(function ($visit) {
                return [
                    'inmate_id' => $visit->inmate_id,
                    'inmate_full_name' => $visit->inmate ? $visit->inmate->full_name : trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                    'inmate_first_name' => $visit->inmate ? $visit->inmate->first_name : $visit->inmate_first_name,
                    'inmate_middle_name' => $visit->inmate ? $visit->inmate->middle_name : $visit->inmate_middle_name,
                    'inmate_last_name' => $visit->inmate ? $visit->inmate->last_name : $visit->inmate_last_name,
                    'relationship_proof_file_id' => $visit->relationship_proof_file_id,
                    'additional_proof_file_id' => $visit->additional_proof_file_id,
                    'has_relationship_proof' => !is_null($visit->relationship_proof_file_id) || !is_null($visit->relationship_proof_path),
                    'has_additional_proof' => !is_null($visit->additional_proof_file_id) || !is_null($visit->additional_proof_path),
                ];
            })
            ->unique(function($inmate) {
                // Use inmate_id if available, otherwise use full name as fallback
                return $inmate['inmate_id'] ?? $inmate['inmate_full_name'];
            })
            ->values();

        $stats = [
            'total_tagged_inmates' => $taggedInmates->count(),
        ];

        return Inertia::render('Visitor/TaggedInmates', [
            'taggedInmates' => $taggedInmates,
            'stats' => $stats,
        ]);
    }
}
