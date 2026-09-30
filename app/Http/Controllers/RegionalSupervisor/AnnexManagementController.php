<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnnexManagementController extends Controller
{
    /**
     * Display a listing of annexes for the regional supervisor's region.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $baseQuery = Annex::query()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id);

        $annexes = (clone $baseQuery)
            ->with(['jail.branch'])
            ->withCount(['dormitories', 'cells'])
            ->select('annexes.*')
            ->orderBy('annexes.name')
            ->get()
            ->map(fn($annex) => [
                'id' => $annex->id,
                'name' => $annex->name,
                'description' => $annex->description,
                'status' => $annex->status,
                'jail' => $annex->jail ? [
                    'id' => $annex->jail->id,
                    'name' => $annex->jail->name,
                    'branch' => $annex->jail->branch ? [
                        'id' => $annex->jail->branch->id,
                        'name' => $annex->jail->branch->name,
                    ] : null,
                ] : null,
                'dormitories_count' => $annex->dormitories_count,
                'cells_count' => $annex->cells_count,
                'created_at' => $annex->created_at,
            ]);

        // Calculate stats
        $stats = [
            'total_annexes' => (clone $baseQuery)->count(),
            'active_annexes' => (clone $baseQuery)->where('annexes.status', 'active')->count(),
            'inactive_annexes' => (clone $baseQuery)->where('annexes.status', 'inactive')->count(),
        ];

        // Jails within this region for creation/editing dropdowns
        $jails = Jail::query()
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('jails.status', 'active')
            ->select('jails.id', 'jails.name', 'branches.name as branch_name')
            ->orderBy('jails.name')
            ->get();

        return Inertia::render('RegionalSupervisor/AnnexManagement/Index', [
            'annexes' => $annexes,
            'jails' => $jails,
            'region_id' => $user->region_id,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created annex.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Ensure jail is in the region
        $jail = Jail::query()
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('jails.id', $validated['jail_id'])
            ->select('jails.*')
            ->firstOrFail();

        $validated['jail_id'] = $jail->id;

        Annex::create($validated);

        return redirect()->back()->with('success', 'Annex created successfully.');
    }

    /**
     * Update the specified annex.
     */
    public function update(Request $request, Annex $annex)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        // Verify annex belongs to region
        $belongsToRegion = $annex->jail()->whereHas('branch', function ($query) use ($user) {
            $query->where('region_id', $user->region_id);
        })->exists();

        if (!$belongsToRegion) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Ensure new jail is in the region
        $newJail = Jail::query()
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->where('jails.id', $validated['jail_id'])
            ->select('jails.*')
            ->firstOrFail();

        $validated['jail_id'] = $newJail->id;

        $annex->update($validated);

        return redirect()->back()->with('success', 'Annex updated successfully.');
    }

    /**
     * Remove the specified annex.
     */
    public function destroy(Request $request, Annex $annex)
    {
        $user = $request->user();
        
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        // Verify annex belongs to region
        $belongsToRegion = $annex->jail()->whereHas('branch', function ($query) use ($user) {
            $query->where('region_id', $user->region_id);
        })->exists();

        if (!$belongsToRegion) {
            abort(403, 'Unauthorized action.');
        }

        // Check if annex has cells
        if ($annex->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete annex with existing cells.');
        }

        $annex->delete();

        return redirect()->back()->with('success', 'Annex deleted successfully.');
    }
}
