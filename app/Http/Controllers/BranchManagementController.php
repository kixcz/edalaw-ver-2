<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BranchManagementController extends Controller
{
    /**
     * Store a newly created branch.
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:branches,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:provincial,district,sub-provincial'],
            'location' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'string', 'in:active,inactive,maintenance'],
        ]);

        $validated['region_id'] = $user->region_id;

        $branch = Branch::create($validated);

        return redirect()->back()->with('success', 'Branch created successfully.');
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch)
    {
        $user = auth()->user();

        // Verify branch belongs to user's region
        if ($branch->region_id !== $user->region_id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('branches')->ignore($branch->id)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:provincial,district,sub-provincial'],
            'location' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'string', 'in:active,inactive,maintenance'],
        ]);

        $branch->update($validated);

        return redirect()->back()->with('success', 'Branch updated successfully.');
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(Branch $branch)
    {
        $user = auth()->user();

        // Verify branch belongs to user's region
        if ($branch->region_id !== $user->region_id) {
            abort(403, 'Unauthorized action.');
        }

        // Check if branch has any jails (prevent deletion if it does)
        if ($branch->jails()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete branch with existing jails.');
        }

        $branch->delete();

        return redirect()->back()->with('success', 'Branch deleted successfully.');
    }
}
