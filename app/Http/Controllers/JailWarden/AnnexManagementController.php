<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Annex;
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

        $annexes = Annex::where('branch_id', $user->branch_id)
            ->withCount(['dormitories', 'cells'])
            ->orderBy('name')
            ->paginate(10)
            ->through(fn($annex) => [
                'id' => $annex->id,
                'name' => $annex->name,
                'description' => $annex->description,
                'status' => $annex->status,
                'dormitories_count' => $annex->dormitories_count,
                'cells_count' => $annex->cells_count,
                'created_at' => $annex->created_at,
            ]);

        return Inertia::render('JailWarden/AnnexManagement/Index', [
            'annexes' => $annexes,
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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['branch_id'] = $user->branch_id;

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

        // Verify annex belongs to warden's branch
        if ($annex->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
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
    public function destroy(Request $request, Annex $annex)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify annex belongs to warden's branch
        if ($annex->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        // Check if annex has dormitories
        if ($annex->dormitories()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete annex with existing dormitories.');
        }

        $annex->delete();

        return redirect()->back()->with('success', 'Annex deleted successfully.');
    }
}
