<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnnexManagementController extends Controller
{
    /**
     * Display a listing of annexes for the jail warden's branch.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Get annexes through the branch's jails
        $annexes = Annex::query()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['jail'])
            ->withCount(['dormitories', 'cells'])
            ->select('annexes.*')
            ->orderBy('annexes.name')
            ->paginate(10)
            ->through(fn($annex) => [
                'id' => $annex->id,
                'name' => $annex->name,
                'description' => $annex->description,
                'status' => $annex->status,
                'jail' => $annex->jail ? [
                    'id' => $annex->jail->id,
                    'name' => $annex->jail->name,
                ] : null,
                'dormitories_count' => $annex->dormitories_count,
                'cells_count' => $annex->cells_count,
                'created_at' => $annex->created_at,
            ]);

        return Inertia::render('JailWarden/AnnexManagement/Index', [
            'annexes' => $annexes,
            'jails' => Jail::where('branch_id', $user->branch_id)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'branch' => [
                'id' => $user->branch->id,
                'name' => $user->branch->name,
            ],
        ]);
    }

    /**
     * Store a newly created annex.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $jail = Jail::where('id', $validated['jail_id'])
            ->where('branch_id', $user->branch_id)
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
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $belongsToBranch = $annex->jail()
            ->where('branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $newJail = Jail::where('id', $validated['jail_id'])
            ->where('branch_id', $user->branch_id)
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
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $belongsToBranch = $annex->jail()
            ->where('branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
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
