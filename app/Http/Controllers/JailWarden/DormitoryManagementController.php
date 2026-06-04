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

        $dormitories = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('annexes.branch_id', $user->branch_id)
            ->with(['annex'])
            ->withCount('cells')
            ->orderBy('name')
            ->paginate(10)
            ->through(fn($dorm) => [
                'id' => $dorm->id,
                'name' => $dorm->name,
                'type' => $dorm->type,
                'description' => $dorm->description,
                'status' => $dorm->status,
                'annex' => [
                    'id' => $dorm->annex->id,
                    'name' => $dorm->annex->name,
                ],
                'cells_count' => $dorm->cells_count,
                'created_at' => $dorm->created_at,
            ]);

        return Inertia::render('JailWarden/DormitoryManagement/Index', [
            'dormitories' => $dormitories,
            'annexes' => Annex::where('branch_id', $user->branch_id)
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
            'annex_id' => 'required|exists:annexes,id',
        ]);

        // Verify annex belongs to warden's branch
        $annex = Annex::where('id', $validated['annex_id'])
            ->where('branch_id', $user->branch_id)
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
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify dormitory belongs to warden's branch through annex
        $annex = $dormitory->annex;
        if (!$annex || $annex->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'annex_id' => 'required|exists:annexes,id',
        ]);

        // Verify new annex belongs to warden's branch
        $newAnnex = Annex::where('id', $validated['annex_id'])
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

        // Verify dormitory belongs to warden's branch through annex
        $annex = $dormitory->annex;
        if (!$annex || $annex->branch_id !== $user->branch_id) {
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
