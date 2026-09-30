<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Jail;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JailManagementController extends Controller
{
    /**
     * Display a listing of jails for the regional supervisor's region.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $query = Jail::query()
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $user->region_id)
            ->select('jails.*', 'branches.name as branch_name')
            ->withCount(['dormitories', 'annexes']);

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('jails.name', 'like', "%{$search}%")
                    ->orWhere('jails.code', 'like', "%{$search}%")
                    ->orWhere('jails.location', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('jails.status', $status);
        }

        $jails = $query->orderBy('jails.name')->get();
        
        $branches = Branch::where('region_id', $user->region_id)->active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('RegionalSupervisor/JailManagement/Index', [
            'jails' => $jails,
            'branches' => $branches,
            'filters' => [
                'search' => $search ?? '',
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created jail.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:jails',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Ensure branch is in region
        $branch = Branch::where('region_id', $user->region_id)->findOrFail($validated['branch_id']);

        Jail::create($validated);

        return redirect()->back()->with('success', 'Jail created successfully.');
    }

    /**
     * Update the specified jail.
     */
    public function update(Request $request, Jail $jail)
    {
        $user = $request->user();
        
        $belongsToRegion = $jail->branch()->where('region_id', $user->region_id)->exists();
        
        if (!$belongsToRegion) {
            abort(403, 'You can only edit jails in your region.');
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:jails,code,' . $jail->id,
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);
        
        // Ensure new branch is in region
        $branch = Branch::where('region_id', $user->region_id)->findOrFail($validated['branch_id']);

        $jail->update($validated);

        return redirect()->back()->with('success', 'Jail updated successfully.');
    }

    /**
     * Remove the specified jail.
     */
    public function destroy(Request $request, Jail $jail)
    {
        $user = $request->user();
        
        $belongsToRegion = $jail->branch()->where('region_id', $user->region_id)->exists();
        
        if (!$belongsToRegion) {
            abort(403, 'You can only delete jails in your region.');
        }

        // Check if jail has annexes or dormitories
        if ($jail->annexes()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete jail with existing annexes. Please delete annexes first.');
        }

        $jail->delete();

        return redirect()->back()->with('success', 'Jail deleted successfully.');
    }

    /**
     * Get jail details with full hierarchy.
     */
    public function show(Request $request, Jail $jail)
    {
        $user = $request->user();
        
        $belongsToRegion = $jail->branch()->where('region_id', $user->region_id)->exists();
        
        if (!$belongsToRegion) {
            abort(403, 'You can only view jails in your region.');
        }

        $jail->load(['annexes.dormitories.cells.inmates' => function ($q) {
            $q->where('status', 'active');
        }]);

        // Fallback or implemented details page
        return Inertia::render('RegionalSupervisor/JailManagement/Details', [
            'jail' => $jail,
        ]);
    }
}

