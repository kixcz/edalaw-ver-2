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

class AnnexManagementController extends Controller
{
    /**
     * Display a listing of annexes.
     */
    public function index(Request $request): Response
    {
        $query = Annex::with(['jail', 'dormitories' => function ($q) {
            $q->withCount(['cells']);
        }, 'cells' => function ($q) {
            $q->withCount(['inmates' => function ($iq) {
                $iq->where('status', 'active');
            }]);
        }]);

        // Filter by jail
        if ($jailId = $request->input('jail_id')) {
            $query->where('jail_id', $jailId);
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $annexes = $query->orderBy('name')->paginate(10)->withQueryString();

        // Get all jails for dropdowns
        $jails = Jail::orderBy('name')->get(['id', 'name', 'code']);

        // Summary stats
        $stats = [
            'total_annexes' => Annex::count(),
            'active_annexes' => Annex::where('status', 'active')->count(),
            'total_dormitories' => Dormitory::count(),
            'total_cells' => Cell::count(),
            'total_pdls' => Inmate::where('status', 'active')->count(),
        ];

        // Chart data
        $chartData = [
            'annexes_by_jail' => Jail::withCount('annexes')->get()->map(fn($j) => [
                'name' => $j->name,
                'annexes' => $j->annexes_count
            ]),
            'occupancy_by_annex' => Annex::with(['cells.inmates' => function($q) {
                $q->where('status', 'active');
            }])->get()->map(fn($a) => [
                'name' => $a->name,
                'capacity' => $a->cells->sum('capacity'),
                'occupied' => $a->cells->sum(fn($c) => $c->inmates->count())
            ]),
        ];

        return Inertia::render('JailOfficer/AnnexManagement', [
            'annexes' => $annexes,
            'jails' => $jails,
            'stats' => $stats,
            'chartData' => $chartData,
            'filters' => [
                'jail_id' => $jailId ? (int) $jailId : null,
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created annex.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        Annex::create($validated);

        return redirect()->back()->with('success', 'Annex created successfully.');
    }

    /**
     * Update the specified annex.
     */
    public function update(Request $request, Annex $annex)
    {
        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $annex->update($validated);

        return redirect()->back()->with('success', 'Annex updated successfully.');
    }

    /**
     * Remove the specified annex.
     */
    public function destroy(Annex $annex)
    {
        // Check if annex has cells
        if ($annex->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete annex with existing cells. Please delete or transfer cells first.');
        }

        $annex->delete();

        return redirect()->back()->with('success', 'Annex deleted successfully.');
    }
}
