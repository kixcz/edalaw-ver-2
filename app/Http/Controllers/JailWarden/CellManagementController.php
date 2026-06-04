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

        $cells = Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('annexes.branch_id', $user->branch_id)
            ->with(['dormitory.annex'])
            ->orderBy('cell_number')
            ->paginate(15)
            ->through(fn($cell) => [
                'id' => $cell->id,
                'cell_number' => $cell->cell_number,
                'capacity' => $cell->capacity,
                'status' => $cell->status,
                'dormitory' => [
                    'id' => $cell->dormitory->id,
                    'name' => $cell->dormitory->name,
                    'annex' => [
                        'id' => $cell->dormitory->annex->id,
                        'name' => $cell->dormitory->annex->name,
                    ],
                ],
                'created_at' => $cell->created_at,
            ]);

        return Inertia::render('JailWarden/CellManagement/Index', [
            'cells' => $cells,
            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->orderBy('name')
                ->get(['dormitories.id', 'dormitories.name']),
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

        // Verify dormitory belongs to warden's branch through annex
        $dormitory = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('dormitories.id', $validated['dormitory_id'])
            ->where('annexes.branch_id', $user->branch_id)
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

        // Verify cell belongs to warden's branch through dormitory and annex
        $dormitory = $cell->dormitory;
        if (!$dormitory) {
            abort(403, 'Unauthorized action.');
        }
        
        $annex = $dormitory->annex;
        if (!$annex || $annex->branch_id !== $user->branch_id) {
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
            ->where('dormitories.id', $validated['dormitory_id'])
            ->where('annexes.branch_id', $user->branch_id)
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

        // Verify cell belongs to warden's branch through dormitory and annex
        $dormitory = $cell->dormitory;
        if (!$dormitory) {
            abort(403, 'Unauthorized action.');
        }
        
        $annex = $dormitory->annex;
        if (!$annex || $annex->branch_id !== $user->branch_id) {
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
