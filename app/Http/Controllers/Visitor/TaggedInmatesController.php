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

        // Get all unique inmates from approved visits with their files and cell info
        $taggedInmates = Visit::where('user_id', $userId)
            ->where('status', 'approved')
            ->with(['inmate.cell', 'relationshipProofFile', 'additionalProofFile'])
            ->get()
            ->map(function ($visit) {
                $inmate = $visit->inmate;
                $cell = $inmate?->cell;
                
                // Get available days from cell schedule
                $availableDays = [];
                if ($cell && $cell->cellScheduleTemplate) {
                    $schedule = $cell->cellScheduleTemplate;
                    $availableDays = [
                        0 => [
                            'virtual' => $schedule->sun_virtual ?? false,
                            'physical' => $schedule->sun_physical ?? false,
                        ],
                        1 => [
                            'virtual' => $schedule->mon_virtual ?? false,
                            'physical' => $schedule->mon_physical ?? false,
                        ],
                        2 => [
                            'virtual' => $schedule->tue_virtual ?? false,
                            'physical' => $schedule->tue_physical ?? false,
                        ],
                        3 => [
                            'virtual' => $schedule->wed_virtual ?? false,
                            'physical' => $schedule->wed_physical ?? false,
                        ],
                        4 => [
                            'virtual' => $schedule->thu_virtual ?? false,
                            'physical' => $schedule->thu_physical ?? false,
                        ],
                        5 => [
                            'virtual' => $schedule->fri_virtual ?? false,
                            'physical' => $schedule->fri_physical ?? false,
                        ],
                        6 => [
                            'virtual' => $schedule->sat_virtual ?? false,
                            'physical' => $schedule->sat_physical ?? false,
                        ],
                    ];
                }
                
                return [
                    'inmate_id' => $visit->inmate_id,
                    'inmate_full_name' => $inmate ? $inmate->full_name : trim("{$visit->inmate_first_name} {$visit->inmate_middle_name} {$visit->inmate_last_name}"),
                    'inmate_first_name' => $inmate ? $inmate->first_name : $visit->inmate_first_name,
                    'inmate_middle_name' => $inmate ? $inmate->middle_name : $visit->inmate_middle_name,
                    'inmate_last_name' => $inmate ? $inmate->last_name : $visit->inmate_last_name,
                    'cell_id' => $cell?->id,
                    'cell_number' => $cell?->cell_number ?? 'N/A',
                    'available_days' => $availableDays,
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
