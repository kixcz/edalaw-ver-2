<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Dormitory;
use App\Models\Annex;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DormitoryManagementController extends Controller
{
    /**
     * Display a listing of dormitories for the jail warden's branch.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $dormitories = Dormitory::join('jails', 'dormitories.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['jail'])
            ->withCount(['annexes', 'cells'])
            ->orderBy('name')
            ->paginate(10)
            ->through(fn($dorm) => [
                'id' => $dorm->id,
                'name' => $dorm->name,
                'type' => $dorm->type,
                'description' => $dorm->description,
                'status' => $dorm->status,
                'jail' => [
                    'id' => $dorm->jail->id,
                    'name' => $dorm->jail->name,
                ],
                'annexes_count' => $dorm->annexes_count,
                'cells_count' => $dorm->cells_count,
                'created_at' => $dorm->created_at,
            ]);

        return Inertia::render('JailWarden/DormitoryManagement/Index', [
            'dormitories' => $dormitories,
            'jails' => \App\Models\Jail::where('branch_id', $user->branch_id)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created dormitory.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'jail_id' => 'required|exists:jails,id',
        ]);

        // Verify jail belongs to warden's branch
        $jail = \App\Models\Jail::where('id', $validated['jail_id'])
            ->where('branch_id', $user->branch_id)
            ->firstOrFail();

        $validated['jail_id'] = $jail->id;

        Dormitory::create($validated);

        return redirect()->back()->with('success', 'Dormitory created successfully.');
    }

    /**
     * Update the specified dormitory.
     */
    public function update(Request $request, Dormitory $dormitory)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify dormitory belongs to warden's branch through jail
        $belongsToBranch = $dormitory->jail()
            ->where('branch_id', $user->branch_id)
            ->where('id', $dormitory->jail_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'jail_id' => 'required|exists:jails,id',
        ]);

        // Verify new jail belongs to warden's branch
        $newJail = \App\Models\Jail::where('id', $validated['jail_id'])
            ->where('branch_id', $user->branch_id)
            ->firstOrFail();

        $dormitory->update($validated);

        return redirect()->back()->with('success', 'Dormitory updated successfully.');
    }

    /**
     * Remove the specified dormitory.
     */
    public function destroy(Request $request, Dormitory $dormitory)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify dormitory belongs to warden's branch through jail
        $belongsToBranch = $dormitory->jail()
            ->where('branch_id', $user->branch_id)
            ->where('id', $dormitory->jail_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        // Check if dormitory has annexes or cells
        if ($dormitory->annexes()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing annexes.');
        }

        if ($dormitory->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing cells.');
        }

        $dormitory->delete();

        return redirect()->back()->with('success', 'Dormitory deleted successfully.');
    }
}
