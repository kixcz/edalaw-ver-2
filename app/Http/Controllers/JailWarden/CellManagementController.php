<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\Annex;
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

        $cells = Cell::query()
            ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['annex', 'annex.dormitory', 'annex.dormitory.jail'])
            ->select('cells.*')
            ->orderBy('cells.cell_number')
            ->paginate(15)
            ->through(fn($cell) => [
                'id' => $cell->id,
                'cell_number' => $cell->cell_number,
                'capacity' => $cell->capacity,
                'status' => $cell->status,
                'annex' => [
                    'id' => $cell->annex->id,
                    'name' => $cell->annex->name,
                    'dormitory' => [
                        'id' => $cell->annex->dormitory->id,
                        'name' => $cell->annex->dormitory->name,
                        'jail' => [
                            'id' => $cell->annex->dormitory->jail->id,
                            'name' => $cell->annex->dormitory->jail->name,
                        ],
                    ],
                ],
                'created_at' => $cell->created_at,
            ]);

        return Inertia::render('JailWarden/CellManagement/Index', [
            'cells' => $cells,
            'annexes' => Annex::join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('annexes.status', 'active')
                ->select('annexes.*')
                ->orderBy('annexes.name')
                ->get(['annexes.id', 'annexes.name']),
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
            'annex_id' => 'required|exists:annexes,id',
        ]);

        // Check if cell number already exists in this annex
        $existingCell = Cell::where('cell_number', $validated['cell_number'])
            ->where('annex_id', $validated['annex_id'])
            ->first();

        if ($existingCell) {
            return back()->withErrors([
                'cell_number' => "Cell '{$validated['cell_number']}' already exists in this annex."
            ])->withInput();
        }

        // Verify annex belongs to warden's branch through dormitory and jail
        $annex = Annex::join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('annexes.id', $validated['annex_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('annexes.*')
            ->firstOrFail();

        $validated['annex_id'] = $annex->id;

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

        // Verify cell belongs to warden's branch through annex, dormitory, and jail
        $belongsToBranch = $cell->annex()
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('annexes.id', $cell->annex_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'cell_number' => 'required|string|max:255|unique:cells,cell_number,' . $cell->id,
            'capacity' => 'required|integer|min:1|max:100',
            'status' => 'required|in:active,inactive',
            'annex_id' => 'required|exists:annexes,id',
        ]);

        // Verify new annex belongs to warden's branch
        $newAnnex = Annex::join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('annexes.id', $validated['annex_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('annexes.*')
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

        // Verify cell belongs to warden's branch through annex, dormitory, and jail
        $belongsToBranch = $cell->annex()
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('annexes.id', $cell->annex_id)
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
