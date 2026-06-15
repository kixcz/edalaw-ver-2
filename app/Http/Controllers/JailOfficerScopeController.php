<?php

namespace App\Http\Controllers;

use App\Models\JailOfficerScope;
use App\Models\User;
use Illuminate\Http\Request;

class JailOfficerScopeController extends Controller
{
    /**
     * Store a new jail officer scope assignment.
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        
        // Verify user is a jail warden of a branch
        if ($user->role->slug !== 'jail_warden' || !$user->branch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'jail_officer_id' => 'required|exists:users,id',
            'scope_type' => 'required|in:annex,dormitory,cell',
            'annex_id' => 'nullable|exists:annexes,id',
            'dormitory_id' => 'nullable|exists:dormitories,id',
            'cell_id' => 'nullable|exists:cells,id',
        ]);

        // Verify the jail officer belongs to the same branch
        $officer = User::where('id', $validated['jail_officer_id'])
            ->where('branch_id', $user->branch_id)
            ->first();

        if (!$officer) {
            abort(403, 'Jail officer must belong to your branch.');
        }

        // Deactivate existing scopes for this officer at the same level
        JailOfficerScope::where('jail_officer_id', $validated['jail_officer_id'])
            ->where('scope_type', $validated['scope_type'])
            ->update(['is_active' => false]);

        // Validate scope type matches the provided IDs
        if ($validated['scope_type'] === 'annex' && !$validated['annex_id']) {
            return back()->withErrors(['annex_id' => 'Annex selection required for annex-level scope.']);
        }

        if ($validated['scope_type'] === 'dormitory' && !$validated['dormitory_id']) {
            return back()->withErrors(['dormitory_id' => 'Dormitory selection required for dormitory-level scope.']);
        }

        if ($validated['scope_type'] === 'cell' && !$validated['cell_id']) {
            return back()->withErrors(['cell_id' => 'Cell selection required for cell-level scope.']);
        }

        // For annex-level scope, verify it belongs to branch via dormitory -> jail -> branch
        if ($validated['annex_id']) {
            $annexBelongsToBranch = \App\Models\Annex::join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('annexes.id', $validated['annex_id'])
                ->exists();
            
            if (!$annexBelongsToBranch) {
                abort(403, 'Annex does not belong to your branch.');
            }
        }

        // For dormitory-level scope, verify it belongs to branch
        if ($validated['dormitory_id']) {
            $dormitoryBelongsToBranch = \App\Models\Dormitory::join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('dormitories.id', $validated['dormitory_id'])
                ->exists();
            
            if (!$dormitoryBelongsToBranch) {
                abort(403, 'Dormitory does not belong to your branch.');
            }
        }

        // For cell-level scope, verify it belongs to branch
        if ($validated['cell_id']) {
            $cellBelongsToBranch = \App\Models\Cell::join('annexes', 'cells.annex_id', '=', 'annexes.id')
                ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('cells.id', $validated['cell_id'])
                ->exists();
            
            if (!$cellBelongsToBranch) {
                abort(403, 'Cell does not belong to your branch.');
            }
        }

        // Create the scope assignment
        JailOfficerScope::create([
            'jail_officer_id' => $validated['jail_officer_id'],
            'assigned_by' => $user->id,
            'scope_type' => $validated['scope_type'],
            'annex_id' => $validated['annex_id'] ?? null,
            'dormitory_id' => $validated['dormitory_id'] ?? null,
            'cell_id' => $validated['cell_id'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', 'Jail officer scope assigned successfully.');
    }

    /**
     * Update an existing jail officer scope assignment.
     */
    public function update(Request $request, JailOfficerScope $scope)
    {
        $user = auth()->user();
        
        // Verify user is a jail warden
        if ($user->role->slug !== 'jail_warden' || !$user->branch) {
            abort(403, 'Unauthorized action.');
        }

        // Verify the scope belongs to an officer in their branch
        if ($scope->jailOfficer->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized to modify this scope assignment.');
        }

        $validated = $request->validate([
            'is_active' => 'boolean',
        ]);

        $scope->update($validated);

        return back()->with('success', 'Scope assignment updated successfully.');
    }

    /**
     * Remove a jail officer scope assignment.
     */
    public function destroy(JailOfficerScope $scope)
    {
        $user = auth()->user();
        
        // Verify user is a jail warden
        if ($user->role->slug !== 'jail_warden' || !$user->branch) {
            abort(403, 'Unauthorized action.');
        }

        // Verify the scope belongs to an officer in their branch
        if ($scope->jailOfficer->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized to modify this scope assignment.');
        }

        $scope->delete();

        return back()->with('success', 'Scope assignment removed successfully.');
    }
}
