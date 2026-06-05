<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Dormitory;
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

        // Get annexes through branch's jails and dormitories
        $annexes = Annex::query()
            ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['dormitory', 'dormitory.jail'])
            ->withCount(['dormitories', 'cells'])
            ->select('annexes.*')
            ->orderBy('annexes.name')
            ->paginate(10)
            ->through(fn($annex) => [
                'id' => $annex->id,
                'name' => $annex->name,
                'description' => $annex->description,
                'status' => $annex->status,
                'dormitory' => [
                    'id' => $annex->dormitory->id,
                    'name' => $annex->dormitory->name,
                    'jail' => [
                        'id' => $annex->dormitory->jail->id,
                        'name' => $annex->dormitory->jail->name,
                    ],
                ],
                'dormitories_count' => 0, // Annexes don't have dormitories, they belong to one
                'cells_count' => $annex->cells_count,
                'created_at' => $annex->created_at,
            ]);

        return Inertia::render('JailWarden/AnnexManagement/Index', [
            'annexes' => $annexes,
            'dormitories' => Dormitory::join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->select('dormitories.*')
                ->orderBy('dormitories.name')
                ->get(['dormitories.id', 'dormitories.name']),
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
            'dormitory_id' => 'required|exists:dormitories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Verify dormitory belongs to warden's branch through jail
        $dormitory = Dormitory::where('id', $validated['dormitory_id'])
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->select('dormitories.*')
            ->firstOrFail();

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

        // Verify annex belongs to warden's branch through dormitory and jail
        $belongsToBranch = $annex->dormitory()
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('dormitories.id', $annex->dormitory_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'dormitory_id' => 'required|exists:dormitories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        // Verify new dormitory belongs to warden's branch
        $newDormitory = Dormitory::where('id', $validated['dormitory_id'])
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->select('dormitories.*')
            ->firstOrFail();

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

        // Verify annex belongs to warden's branch through dormitory and jail
        $belongsToBranch = $annex->dormitory()
            ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->where('dormitories.id', $annex->dormitory_id)
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
