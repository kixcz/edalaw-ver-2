<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Dormitory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DormitoryManagementController extends Controller
{
    /**
     * Display a listing of dormitories for the regional supervisor's region.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        // Get dormitories through the region's branches, jails, and annexes
        $dormitories = Dormitory::query()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->with(['annex.jail'])
            ->withCount(['cells'])
            ->select('dormitories.*')
            ->orderBy('dormitories.name')
            ->orderBy('dormitories.name')
            ->get()
            ->map(fn($dormitory) => [
                'id' => $dormitory->id,
                'name' => $dormitory->name,
                'type' => $dormitory->type, // e.g. male, female
                'description' => $dormitory->description,
                'status' => $dormitory->status,
                'annex' => $dormitory->annex ? [
                    'id' => $dormitory->annex->id,
                    'name' => $dormitory->annex->name,
                ] : null,
                'jail' => $dormitory->annex?->jail ? [
                    'id' => $dormitory->annex->jail->id,
                    'name' => $dormitory->annex->jail->name,
                ] : null,
                'cells_count' => $dormitory->cells_count,
                'created_at' => $dormitory->created_at,
            ]);

        // Annexes within this region for dropdowns
        $annexes = Annex::query()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('annexes.status', 'active')
            ->select('annexes.id', 'annexes.name', 'jails.name as jail_name')
            ->orderBy('annexes.name')
            ->get();

        // Calculate stats using base query
        $baseQuery = Dormitory::query()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id);
            
        $stats = [
            'total_dormitories' => (clone $baseQuery)->count(),
            'active_dormitories' => (clone $baseQuery)->where('dormitories.status', 'active')->count(),
            'inactive_dormitories' => (clone $baseQuery)->where('dormitories.status', 'inactive')->count(),
            'total_cells' => (clone $baseQuery)->withCount('cells')->get()->sum('cells_count'),
        ];
        
        $typeStats = (clone $baseQuery)
            ->select('type', \DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get();

        $chartData = [
            'dormitories_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_dormitories']],
                ['status' => 'Inactive', 'count' => $stats['inactive_dormitories']],
            ],
            'dormitories_by_type' => $typeStats->map(function ($item) {
                return [
                    'type' => $item->type ?? 'Unknown',
                    'count' => $item->count,
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('RegionalSupervisor/DormitoryManagement/Index', [
            'dormitories' => $dormitories,
            'annexes' => $annexes,
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }

    /**
     * Store a newly created dormitory.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $validated = $request->validate([
            'annex_id' => 'required|exists:annexes,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Ensure annex is in the region
        $annex = Annex::query()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('annexes.id', $validated['annex_id'])
            ->select('annexes.*')
            ->firstOrFail();

        $validated['annex_id'] = $annex->id;

        Dormitory::create($validated);

        return redirect()->back()->with('success', 'Dormitory created successfully.');
    }

    /**
     * Update the specified dormitory.
     */
    public function update(Request $request, Dormitory $dormitory)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        // Verify dormitory belongs to region
        $belongsToRegion = $dormitory->annex()->whereHas('jail.branch', function ($query) use ($user) {
            $query->where('region_id', $user->region_id);
        })->exists();

        if (!$belongsToRegion) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'annex_id' => 'required|exists:annexes,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Ensure new annex is in the region
        $newAnnex = Annex::query()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('annexes.id', $validated['annex_id'])
            ->select('annexes.*')
            ->firstOrFail();

        $validated['annex_id'] = $newAnnex->id;

        $dormitory->update($validated);

        return redirect()->back()->with('success', 'Dormitory updated successfully.');
    }

    /**
     * Remove the specified dormitory.
     */
    public function destroy(Request $request, Dormitory $dormitory)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        // Verify dormitory belongs to region
        $belongsToRegion = $dormitory->annex()->whereHas('jail.branch', function ($query) use ($user) {
            $query->where('region_id', $user->region_id);
        })->exists();

        if (!$belongsToRegion) {
            abort(403, 'Unauthorized action.');
        }

        // Check if dormitory has cells
        if ($dormitory->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing cells.');
        }

        $dormitory->delete();

        return redirect()->back()->with('success', 'Dormitory deleted successfully.');
    }
}
