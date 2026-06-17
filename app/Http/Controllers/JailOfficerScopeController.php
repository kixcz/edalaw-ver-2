<?php

namespace App\Http\Controllers;

use App\Models\JailOfficerScope;
use App\Models\User;
use App\Rules\ValidFacilityScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
            'scope_type' => 'required|in:building,dormitory,cell',
            'building_id' => 'nullable|exists:buildings,id',
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

        // Validate scope type matches the provided IDs
        if (!ValidFacilityScope::validateScopeTypeMatch(
            $validated['scope_type'],
            $validated['building_id'],
            $validated['dormitory_id'],
            $validated['cell_id']
        )) {
            return back()->withErrors(['scope_type' => 'Scope type does not match the provided facility selection.']);
        }

        // Validate facility belongs to warden's branch
        $facilityId = $validated['building_id'] ?? $validated['dormitory_id'] ?? $validated['cell_id'];
        if (!ValidFacilityScope::validateFacilityBranch(
            $validated['scope_type'],
            $facilityId,
            $user->branch_id
        )) {
            return back()->withErrors(['facility' => 'Selected facility does not belong to your branch.']);
        }

        // Validate facility is active
        if (!ValidFacilityScope::validateFacilityActive(
            $validated['scope_type'],
            $facilityId
        )) {
            return back()->withErrors(['facility' => 'Selected facility is not active.']);
        }

        // Check for conflicting scope assignments
        $conflicts = ValidFacilityScope::checkConflictingScopes(
            $validated['jail_officer_id'],
            $validated['scope_type'],
            $validated['building_id'],
            $validated['dormitory_id'],
            $validated['cell_id']
        );

        if (!empty($conflicts)) {
            return back()->withErrors(['scope' => implode(' ', $conflicts)]);
        }

        // Deactivate existing scopes for this officer at the same level
        JailOfficerScope::where('jail_officer_id', $validated['jail_officer_id'])
            ->where('scope_type', $validated['scope_type'])
            ->update(['is_active' => false]);

        // Create the scope assignment
        JailOfficerScope::create([
            'jail_officer_id' => $validated['jail_officer_id'],
            'assigned_by' => $user->id,
            'scope_type' => $validated['scope_type'],
            'building_id' => $validated['building_id'] ?? null,
            'dormitory_id' => $validated['dormitory_id'] ?? null,
            'cell_id' => $validated['cell_id'] ?? null,
            'is_active' => true,
        ]);

        Log::info('Jail Officer scope assigned', [
            'warden_id' => $user->id,
            'officer_id' => $validated['jail_officer_id'],
            'scope_type' => $validated['scope_type'],
            'facility_id' => $facilityId,
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

        Log::info('Jail Officer scope updated', [
            'warden_id' => $user->id,
            'scope_id' => $scope->id,
            'is_active' => $validated['is_active'],
        ]);

        return back()->with('success', 'Scope assignment updated successfully.');
    }

    /**
     * Transfer a jail officer to a different scope.
     */
    public function transfer(Request $request, JailOfficerScope $scope)
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
            'scope_type' => 'required|in:building,dormitory,cell',
            'building_id' => 'nullable|exists:buildings,id',
            'dormitory_id' => 'nullable|exists:dormitories,id',
            'cell_id' => 'nullable|exists:cells,id',
        ]);

        // Validate scope type matches the provided IDs
        if (!ValidFacilityScope::validateScopeTypeMatch(
            $validated['scope_type'],
            $validated['building_id'],
            $validated['dormitory_id'],
            $validated['cell_id']
        )) {
            return back()->withErrors(['scope_type' => 'Scope type does not match the provided facility selection.']);
        }

        // Validate facility belongs to warden's branch
        $facilityId = $validated['building_id'] ?? $validated['dormitory_id'] ?? $validated['cell_id'];
        if (!ValidFacilityScope::validateFacilityBranch(
            $validated['scope_type'],
            $facilityId,
            $user->branch_id
        )) {
            return back()->withErrors(['facility' => 'Selected facility does not belong to your branch.']);
        }

        // Validate facility is active
        if (!ValidFacilityScope::validateFacilityActive(
            $validated['scope_type'],
            $facilityId
        )) {
            return back()->withErrors(['facility' => 'Selected facility is not active.']);
        }

        // Check for conflicting scope assignments (excluding current scope)
        $conflicts = ValidFacilityScope::checkConflictingScopes(
            $scope->jail_officer_id,
            $validated['scope_type'],
            $validated['building_id'],
            $validated['dormitory_id'],
            $validated['cell_id']
        );

        if (!empty($conflicts)) {
            return back()->withErrors(['scope' => implode(' ', $conflicts)]);
        }

        // Deactivate the old scope
        $scope->update(['is_active' => false]);

        // Create the new scope assignment
        JailOfficerScope::create([
            'jail_officer_id' => $scope->jail_officer_id,
            'assigned_by' => $user->id,
            'scope_type' => $validated['scope_type'],
            'building_id' => $validated['building_id'] ?? null,
            'dormitory_id' => $validated['dormitory_id'] ?? null,
            'cell_id' => $validated['cell_id'] ?? null,
            'is_active' => true,
        ]);

        Log::info('Jail Officer scope transferred', [
            'warden_id' => $user->id,
            'officer_id' => $scope->jail_officer_id,
            'old_scope_id' => $scope->id,
            'new_scope_type' => $validated['scope_type'],
            'facility_id' => $facilityId,
        ]);

        return back()->with('success', 'Jail officer scope transferred successfully.');
    }

    /**
     * Revoke a jail officer scope assignment.
     */
    public function revoke(Request $request, JailOfficerScope $scope)
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
            'reason' => 'nullable|string|max:500',
        ]);

        // Deactivate the scope (soft delete for audit trail)
        $scope->update(['is_active' => false]);

        Log::info('Jail Officer scope revoked', [
            'warden_id' => $user->id,
            'scope_id' => $scope->id,
            'officer_id' => $scope->jail_officer_id,
            'reason' => $validated['reason'] ?? 'Not provided',
        ]);

        return back()->with('success', 'Jail officer scope revoked successfully.');
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
