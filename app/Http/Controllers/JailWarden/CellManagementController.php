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
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['dormitory', 'dormitory.annex', 'dormitory.annex.jail'])
            ->select('cells.*')
            ->orderBy('cells.cell_number')
            ->paginate(15)
            ->through(fn($cell) => [
                'id' => $cell->id,
                'cell_number' => $cell->cell_number,
                'capacity' => $cell->capacity,
                'status' => $cell->status,
                'annex' => $cell->dormitory?->annex ? [
                    'id' => $cell->dormitory->annex->id,
                    'name' => $cell->dormitory->annex->name,
                    'dormitory' => $cell->dormitory ? [
                        'id' => $cell->dormitory->id,
                        'name' => $cell->dormitory->name,
                        'jail' => $cell->dormitory->annex?->jail ? [
                            'id' => $cell->dormitory->annex->jail->id,
                            'name' => $cell->dormitory->annex->jail->name,
                        ] : null,
                    ] : null,
                ] : null,
                'created_at' => $cell->created_at,
            ]);

        return Inertia::render('JailWarden/CellManagement/Index', [
            'cells' => $cells,
            'annexes' => Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
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

        // Verify annex belongs to warden's branch through jail
        $annex = Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
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
            'annex_id' => 'required|exists:annexes,id',
        ]);

        // Verify new annex belongs to warden's branch
        $newAnnex = Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
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
