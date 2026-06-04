<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\Inmate;
use App\Models\Annex;
use App\Models\Dormitory;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InmateManagementController extends Controller
{
    /**
     * Display a listing of inmates.
     */
    public function index(Request $request): Response
    {
        $query = Inmate::with(['cell.annex.dormitory.jail']);

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('inmate_number', 'like', "%{$search}%");
            });
        }

        // Cell filter
        if ($cellId = $request->input('cell_id')) {
            $query->where('cell_id', $cellId);
        }

        // Filter by annex (through cell)
        if ($annexId = $request->input('annex_id')) {
            $query->whereHas('cell', function ($q) use ($annexId) {
                $q->where('annex_id', $annexId);
            });
        }

        // Filter by dormitory (through cell and annex)
        if ($dormitoryId = $request->input('dormitory_id')) {
            $query->whereHas('cell.annex', function ($q) use ($dormitoryId) {
                $q->where('dormitory_id', $dormitoryId);
            });
        }

        // Filter by jail (through cell, annex, and dormitory)
        if ($jailId = $request->input('jail_id')) {
            $query->whereHas('cell.annex.dormitory', function ($q) use ($jailId) {
                $q->where('jail_id', $jailId);
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $inmates = $query->orderBy('last_name')->orderBy('first_name')->paginate(10)->withQueryString();

        // Get all jails, dormitories, annexes, and cells for dropdowns
        $jails = Jail::active()->orderBy('name')->get(['id', 'name', 'code']);
        $dormitories = Dormitory::active()
            ->when($jailId, fn($q) => $q->where('jail_id', $jailId))
            ->with('jail')
            ->orderBy('name')
            ->get(['id', 'jail_id', 'name']);
        $annexes = Annex::active()
            ->when($dormitoryId, fn($q) => $q->where('dormitory_id', $dormitoryId))
            ->with('dormitory')
            ->orderBy('name')
            ->get(['id', 'dormitory_id', 'name']);
        $cells = Cell::active()
            ->when($annexId, fn($q) => $q->where('annex_id', $annexId))
            ->with('annex')
            ->orderBy('cell_number')
            ->get(['id', 'annex_id', 'cell_number', 'capacity']);

        return Inertia::render('BjmpOfficer/InmateManagement', [
            'inmates' => $inmates,
            'jails' => $jails,
            'dormitories' => $dormitories,
            'annexes' => $annexes,
            'cells' => $cells,
            'filters' => [
                'search' => $search ?? '',
                'jail_id' => $jailId ? (int) $jailId : null,
                'dormitory_id' => $dormitoryId ? (int) $dormitoryId : null,
                'annex_id' => $annexId ? (int) $annexId : null,
                'cell_id' => $cellId ? (int) $cellId : null,
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created inmate.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cell_id' => 'required|exists:cells,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'inmate_number' => 'required|string|max:50|unique:inmates',
            'date_of_birth' => 'nullable|date',
            'status' => 'required|in:active,inactive,released',
        ]);

        // Check if cell has available capacity
        $cell = Cell::with('annex')->find($validated['cell_id']);
        if (! $cell->hasAvailableCapacity()) {
            return redirect()->back()->with('error', 'Selected cell is at full capacity.');
        }

        Inmate::create($validated);

        return redirect()->back()->with('success', 'Inmate created successfully.');
    }

    /**
     * Update the specified inmate.
     */
    public function update(Request $request, Inmate $inmate)
    {
        $validated = $request->validate([
            'cell_id' => 'required|exists:cells,id',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'inmate_number' => 'required|string|max:50|unique:inmates,inmate_number,' . $inmate->id,
            'date_of_birth' => 'nullable|date',
            'status' => 'required|in:active,inactive,released',
        ]);

        // Check if cell has available capacity (if changing cells)
        if ($validated['cell_id'] != $inmate->cell_id) {
            $cell = Cell::with('annex')->find($validated['cell_id']);
            if (! $cell->hasAvailableCapacity()) {
                return redirect()->back()->with('error', 'Selected cell is at full capacity.');
            }
        }

        $inmate->update($validated);

        return redirect()->back()->with('success', 'Inmate updated successfully.');
    }

    /**
     * Remove the specified inmate.
     */
    public function destroy(Inmate $inmate)
    {
        $inmate->delete();

        return redirect()->back()->with('success', 'Inmate deleted successfully.');
    }

    /**
     * Transfer inmate to a different cell.
     */
    public function transfer(Request $request, Inmate $inmate)
    {
        $validated = $request->validate([
            'cell_id' => 'required|exists:cells,id',
        ]);

        // Check if transferring to same cell
        if ($validated['cell_id'] == $inmate->cell_id) {
            return redirect()->back()->with('error', 'Inmate is already in the selected cell.');
        }

        // Check if new cell has available capacity
        $cell = Cell::find($validated['cell_id']);
        if (! $cell->hasAvailableCapacity()) {
            return redirect()->back()->with('error', 'Selected cell is at full capacity.');
        }

        $inmate->update(['cell_id' => $validated['cell_id']]);

        return redirect()->back()->with('success', 'Inmate transferred successfully to ' . $cell->cell_number);
    }
}
