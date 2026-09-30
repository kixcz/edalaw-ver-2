<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\Dormitory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CellManagementController extends Controller
{
    /**
     * Display a listing of cells for the jail warden's branch.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $scopeResolver = app(\App\Services\JailWardenScopeResolver::class);
        $hasScope = $scopeResolver->hasActiveScope($user);

        $query = Cell::query()
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id);

        if ($hasScope) {
            $authorizedCellIds = $scopeResolver->getAuthorizedCellIds($user);
            $query->whereIn('cells.id', $authorizedCellIds);
        }

        $cells = $query->with(['dormitory', 'dormitory.annex', 'dormitory.annex.jail'])
            ->select('cells.*')
            ->orderBy('cells.cell_number')
            ->get()
            ->map(fn($cell) => [
                'id' => $cell->id,
                'cell_number' => $cell->cell_number,
                'capacity' => $cell->capacity,
                'status' => $cell->status,
                'dormitory' => $cell->dormitory ? [
                    'id' => $cell->dormitory->id,
                    'name' => $cell->dormitory->name,
                    'annex' => $cell->dormitory->annex ? [
                        'id' => $cell->dormitory->annex->id,
                        'name' => $cell->dormitory->annex->name,
                        'jail' => $cell->dormitory->annex->jail ? [
                            'id' => $cell->dormitory->annex->jail->id,
                            'name' => $cell->dormitory->annex->jail->name,
                        ] : null,
                    ] : null,
                ] : null,
                'created_at' => $cell->created_at,
            ]);

        // Calculate stats
        $stats = [
            'total_cells' => $cells->count(),
            'active_cells' => $cells->where('status', 'active')->count(),
            'inactive_cells' => $cells->where('status', 'inactive')->count(),
            'total_capacity' => $cells->sum('capacity'),
        ];

        // Chart data
        $chartData = [
            'cells_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_cells']],
                ['status' => 'Inactive', 'count' => $stats['inactive_cells']],
            ],
            'cells_by_dormitory' => $cells->groupBy('dormitory.name')->map(function ($group, $dormitoryName) {
                return [
                    'dormitory' => $dormitoryName ?? 'Unassigned',
                    'count' => $group->count(),
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('JailWarden/CellManagement/Index', [
            'cells' => $cells,
            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->select('dormitories.*')
                ->orderBy('dormitories.name')
                ->get(['dormitories.id', 'dormitories.name']),
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }

    /**
     * Store a newly created cell.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'cell_number' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1|max:100',
            'status' => 'required|in:active,inactive',
            'dormitory_id' => 'required|exists:dormitories,id',
        ]);

        // Check if cell number already exists in this dormitory
        $existingCell = Cell::where('cell_number', $validated['cell_number'])
            ->where('dormitory_id', $validated['dormitory_id'])
            ->first();

        if ($existingCell) {
            return back()->withErrors([
                'cell_number' => "Cell '{$validated['cell_number']}' already exists in this dormitory."
            ])->withInput();
        }

        // Verify dormitory belongs to warden's branch
        $dormitory = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('dormitories.id', $validated['dormitory_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('dormitories.*')
            ->firstOrFail();

        $validated['dormitory_id'] = $dormitory->id;

        Cell::create($validated);

        return redirect()->back()->with('success', 'Cell created successfully.');
    }

    /**
     * Update the specified cell.
     */
    public function update(Request $request, Cell $cell)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify cell belongs to warden's branch through dormitory, annex, and jail
        $belongsToBranch = $cell->dormitory()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'cell_number' => 'required|string|max:255|unique:cells,cell_number,' . $cell->id,
            'capacity' => 'required|integer|min:1|max:100',
            'status' => 'required|in:active,inactive',
            'dormitory_id' => 'required|exists:dormitories,id',
        ]);

        // Verify new dormitory belongs to warden's branch
        $newDormitory = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('dormitories.id', $validated['dormitory_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('dormitories.*')
            ->firstOrFail();

        $cell->update($validated);

        return redirect()->back()->with('success', 'Cell updated successfully.');
    }

    /**
     * Remove the specified cell.
     */
    public function destroy(Request $request, Cell $cell)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify cell belongs to warden's branch through dormitory, annex, and jail
        $belongsToBranch = $cell->dormitory()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        // Check if cell has inmates
        if ($cell->inmates()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete cell with existing inmates.');
        }

        $cell->delete();

        return redirect()->back()->with('success', 'Cell deleted successfully.');
    }
}
