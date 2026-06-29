<?php

namespace App\Http\Controllers\BjmpOfficer;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\Inmate;
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
        $query = Inmate::with('cell');

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

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $inmates = $query->orderBy('last_name')->orderBy('first_name')->paginate(10)->withQueryString();

        // Get all active cells for dropdown
        $cells = Cell::active()->orderBy('cell_number')->get(['id', 'cell_number', 'capacity']);

        // Summary stats
        $stats = [
            'total_pdls' => Inmate::count(),
            'active_pdls' => Inmate::where('status', 'active')->count(),
            'inactive_pdls' => Inmate::where('status', 'inactive')->count(),
            'released_pdls' => Inmate::where('status', 'released')->count(),
        ];

        // Chart data
        $chartData = [
            'pdls_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_pdls']],
                ['status' => 'Inactive', 'count' => $stats['inactive_pdls']],
                ['status' => 'Released', 'count' => $stats['released_pdls']],
            ],
            'pdls_by_cell' => Cell::withCount(['inmates' => fn($q) => $q->where('status', 'active')])
                ->having('inmates_count', '>', 0)
                ->orderBy('inmates_count', 'desc')
                ->limit(10)
                ->get()
                ->map(fn($c) => ['cell' => $c->cell_number, 'count' => $c->inmates_count]),
        ];

        return Inertia::render('BjmpOfficer/InmateManagement', [
            'inmates' => $inmates,
            'cells' => $cells,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'search' => $search ?? '',
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
        $cell = Cell::find($validated['cell_id']);
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
            $cell = Cell::find($validated['cell_id']);
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
