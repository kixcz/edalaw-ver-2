<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\CellScheduleTemplate;
use App\Models\Annex;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CellManagementController extends Controller
{
    /**
     * Display a listing of cells.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Get officer's authorized cell IDs based on scope
        $authorizedCellIds = $user->getAuthorizedCellIds();
        
        $query = Cell::with(['dormitory.annex.jail', 'inmates' => function ($q) {
            $q->where('status', 'active');
        }])->whereIn('id', $authorizedCellIds);

        // Search filter
        if ($search = $request->input('search')) {
            $query->where('cell_number', 'like', "%{$search}%");
        }

        // Filter by annex (through dormitory)
        if ($annexId = $request->input('annex_id')) {
            $query->whereHas('dormitory', function ($q) use ($annexId) {
                $q->where('annex_id', $annexId);
            });
        }

        // Filter by dormitory
        if ($dormitoryId = $request->input('dormitory_id')) {
            $query->where('dormitory_id', $dormitoryId);
        }

        // Filter by jail (through dormitory and annex)
        if ($jailId = $request->input('jail_id')) {
            $query->whereHas('dormitory.annex', function ($q) use ($jailId) {
                $q->where('jail_id', $jailId);
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $cells = $query->orderBy('cell_number')->paginate(10)->withQueryString();

        // Get all jails, dormitories, and annexes for dropdowns
        $jails = Jail::orderBy('name')->get(['id', 'name', 'code']);
        $dormitories = Dormitory::with('annex')
            ->orderBy('name')
            ->get(['id', 'annex_id', 'name']);
        $annexes = Annex::with('jail')
            ->orderBy('name')
            ->get(['id', 'jail_id', 'name']);

        // Summary stats
        $totalCapacity = Cell::whereIn('id', $authorizedCellIds)->sum('capacity');
        $occupiedBeds = Inmate::whereIn('cell_id', $authorizedCellIds)->where('status', 'active')->count();
        
        $stats = [
            'total_cells' => count($authorizedCellIds),
            'active_cells' => Cell::whereIn('id', $authorizedCellIds)->where('status', 'active')->count(),
            'total_capacity' => $totalCapacity,
            'occupied_beds' => $occupiedBeds,
            'occupancy_rate' => $totalCapacity > 0 ? round(($occupiedBeds / $totalCapacity) * 100, 1) : 0,
        ];

        // Chart data
        $chartData = [
            'cells_by_status' => [
                ['status' => 'Active', 'count' => Cell::whereIn('id', $authorizedCellIds)->where('status', 'active')->count()],
                ['status' => 'Inactive', 'count' => Cell::whereIn('id', $authorizedCellIds)->where('status', 'inactive')->count()],
            ],
            'occupancy_by_dormitory' => Dormitory::with(['cells' => function($q) use ($authorizedCellIds) {
                $q->whereIn('id', $authorizedCellIds);
            }])->get()->map(fn($d) => [
                'name' => $d->name,
                'capacity' => $d->cells->sum('capacity'),
                'occupied' => $d->cells->sum(fn($c) => $c->inmates->where('status', 'active')->count())
            ])->filter(fn($d) => $d['capacity'] > 0),
        ];

        return Inertia::render('BjmpOfficer/CellManagement', [
            'cells' => $cells,
            'jails' => $jails,
            'dormitories' => $dormitories,
            'annexes' => $annexes,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'search' => $search ?? '',
                'annex_id' => $annexId ? (int) $annexId : null,
                'dormitory_id' => $dormitoryId ? (int) $dormitoryId : null,
                'jail_id' => $jailId ? (int) $jailId : null,
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created cell.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'dormitory_id' => 'required|exists:dormitories,id',
            'cell_number' => 'required|string|max:50|unique:cells',
            'capacity' => 'required|integer|min:1|max:50',
            'status' => 'required|in:active,inactive',
        ]);

        $cell = Cell::create($validated);

        // Initialize schedule templates for the new cell
        CellScheduleTemplate::initializeForCell($cell->id);

        return redirect()->back()->with('success', 'Cell created successfully.');
    }

    /**
     * Update the specified cell.
     */
    public function update(Request $request, Cell $cell)
    {
        $validated = $request->validate([
            'dormitory_id' => 'required|exists:dormitories,id',
            'cell_number' => 'required|string|max:50|unique:cells,cell_number,' . $cell->id,
            'capacity' => 'required|integer|min:1|max:50',
            'status' => 'required|in:active,inactive',
        ]);

        // Check if capacity is being reduced below current inmates
        if ($validated['capacity'] < $cell->current_inmates_count) {
            return redirect()->back()->with('error', 'Cannot reduce capacity below current number of inmates.');
        }

        $cell->update($validated);

        return redirect()->back()->with('success', 'Cell updated successfully.');
    }

    /**
     * Remove the specified cell.
     */
    public function destroy(Cell $cell)
    {
        // Check if cell has inmates
        if ($cell->inmates()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete cell with assigned inmates. Please transfer inmates first.');
        }

        $cell->delete();

        return redirect()->back()->with('success', 'Cell deleted successfully.');
    }
}
