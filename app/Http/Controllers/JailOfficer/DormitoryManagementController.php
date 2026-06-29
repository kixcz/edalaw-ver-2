<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DormitoryManagementController extends Controller
{
    /**
     * Display a listing of dormitories.
     */
    public function index(Request $request): Response
    {
        $query = Dormitory::with(['annex.jail', 'cells' => function ($q) {
            $q->withCount(['inmates' => function ($iq) {
                $iq->where('status', 'active');
            }]);
        }]);

        // Filter by annex
        if ($annexId = $request->input('annex_id')) {
            $query->where('annex_id', $annexId);
        }

        // Filter by jail (through annex)
        if ($jailId = $request->input('jail_id')) {
            $query->whereHas('annex', function ($q) use ($jailId) {
                $q->where('jail_id', $jailId);
            });
        }

        // Type filter
        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $dormitories = $query->orderBy('name')->paginate(10)->withQueryString();

        // Get all jails and annexes for dropdowns
        $jails = Jail::active()->orderBy('name')->get(['id', 'name', 'code']);
        $annexes = Annex::active()->with('jail')->orderBy('name')->get(['id', 'jail_id', 'name']);

        // Summary stats
        $stats = [
            'total_dormitories' => Dormitory::count(),
            'active_dormitories' => Dormitory::where('status', 'active')->count(),
            'total_cells' => Cell::count(),
            'total_pdls' => Inmate::where('status', 'active')->count(),
        ];

        // Chart data
        $chartData = [
            'dormitories_by_type' => Dormitory::select('type')->selectRaw('count(*) as count')->groupBy('type')->get(),
            'occupancy_by_dormitory' => Dormitory::with(['cells.inmates' => function($q) {
                $q->where('status', 'active');
            }])->get()->map(fn($d) => [
                'name' => $d->name,
                'capacity' => $d->cells->sum('capacity'),
                'occupied' => $d->cells->sum(fn($c) => $c->inmates->count())
            ]),
        ];

        return Inertia::render('JailOfficer/DormitoryManagement', [
            'dormitories' => $dormitories,
            'jails' => $jails,
            'annexes' => $annexes,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'annex_id' => $annexId ? (int) $annexId : null,
                'jail_id' => $jailId ? (int) $jailId : null,
                'type' => $type ?? 'all',
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created dormitory.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'annex_id' => 'required|exists:annexes,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        Dormitory::create($validated);

        return redirect()->back()->with('success', 'Dormitory created successfully.');
    }

    /**
     * Update the specified dormitory.
     */
    public function update(Request $request, Dormitory $dormitory)
    {
        $validated = $request->validate([
            'annex_id' => 'required|exists:annexes,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $dormitory->update($validated);

        return redirect()->back()->with('success', 'Dormitory updated successfully.');
    }

    /**
     * Remove the specified dormitory.
     */
    public function destroy(Dormitory $dormitory)
    {
        // Check if dormitory has cells
        if ($dormitory->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing cells. Please delete or transfer cells first.');
        }

        $dormitory->delete();

        return redirect()->back()->with('success', 'Dormitory deleted successfully.');
    }
}
