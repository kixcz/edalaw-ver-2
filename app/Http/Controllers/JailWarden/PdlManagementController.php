<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Inmate;
use App\Models\Cell;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PdlManagementController extends Controller
{
    /**
     * Display all PDLs in the jail warden's branch.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Get all inmates in the branch through cell → dormitory → annex → jail → branch hierarchy
        $inmates = Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->select('inmates.*')
            ->with(['cell' => function ($query) {
                $query->with(['dormitory' => function ($q) {
                    $q->with(['annex' => function ($qr) {
                        $qr->with('jail');
                    }]);
                }]);
            }])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(15)
            ->through(fn($inmate) => [
                'id' => $inmate->id,
                'inmate_number' => $inmate->inmate_number,
                'full_name' => $inmate->full_name,
                'first_name' => $inmate->first_name,
                'middle_name' => $inmate->middle_name,
                'last_name' => $inmate->last_name,
                'date_of_birth' => $inmate->date_of_birth,
                'status' => $inmate->status,
                'cell' => $inmate->cell ? [
                    'id' => $inmate->cell->id,
                    'cell_number' => $inmate->cell->cell_number,
                    'annex' => $inmate->cell->dormitory?->annex ? [
                        'id' => $inmate->cell->dormitory->annex->id,
                        'name' => $inmate->cell->dormitory->annex->name,
                        'dormitory' => $inmate->cell->dormitory ? [
                            'id' => $inmate->cell->dormitory->id,
                            'name' => $inmate->cell->dormitory->name,
                            'jail' => $inmate->cell->dormitory->annex?->jail ? [
                                'id' => $inmate->cell->dormitory->annex->jail->id,
                                'name' => $inmate->cell->dormitory->annex->jail->name,
                            ] : null,
                        ] : null,
                    ] : null,
                ] : null,
                'created_at' => $inmate->created_at,
            ]);

        // Get cells for dropdown
        $cells = Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('cells.status', 'active')
            ->orderBy('annexes.name')
            ->orderBy('cells.cell_number')
            ->select(
                'cells.id',
                'cells.cell_number',
                'annexes.name as annex_name',
                'dormitories.name as dormitory_name'
            )
            ->get()
            ->map(fn($cell) => [
                'id' => $cell->id,
                'label' => "Cell {$cell->cell_number} - {$cell->annex_name} ({$cell->dormitory_name})",
                'value' => (string) $cell->id,
            ]);

        // Calculate stats
        $stats = [
            'total_pdls' => $inmates->total(),
            'active_pdls' => $inmates->where('status', 'active')->count(),
            'inactive_pdls' => $inmates->where('status', 'inactive')->count(),
            'assigned_cells' => $inmates->pluck('cell.id')->filter()->unique()->count(),
        ];

        // Chart data
        $chartData = [
            'pdls_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_pdls']],
                ['status' => 'Inactive', 'count' => $stats['inactive_pdls']],
            ],
            'pdls_by_annex' => $inmates->groupBy('cell.annex.name')->map(function ($group, $annexName) {
                return [
                    'annex' => $annexName ?? 'Unassigned',
                    'count' => $group->count(),
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('JailWarden/PdlManagement/Index', [
            'inmates' => $inmates,
            'cells' => $cells,
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }

    /**
     * Store a newly created PDL.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'inmate_number' => 'required|string|max:255|unique:inmates,inmate_number',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'nullable|date',
            'cell_id' => 'required|exists:cells,id',
        ]);

        // Verify cell belongs to warden's branch
        $cell = Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('cells.id', $validated['cell_id'])
            ->select('cells.*')
            ->first();

        if (!$cell) {
            abort(403, 'Invalid cell selection.');
        }

        Inmate::create($validated);

        return redirect()->back()->with('success', 'PDL created successfully.');
    }
}
