<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JailManagementController extends Controller
{
    /**
     * Display a listing of jails for the current warden's branch.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $query = Jail::where('branch_id', $user->branch_id)->withCount(['dormitories', 'annexes']);

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $jails = $query->orderBy('name')->paginate(10)->withQueryString();

        return Inertia::render('JailWarden/JailManagement/Index', [
            'jails' => $jails,
            'filters' => [
                'search' => $search ?? '',
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created jail in the warden's branch.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:jails',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['branch_id'] = $user->branch_id;

        Jail::create($validated);

        return redirect()->back()->with('success', 'Jail created successfully.');
    }

    /**
     * Update the specified jail.
     */
    public function update(Request $request, Jail $jail)
    {
        $user = $request->user();
        if ($jail->branch_id !== $user->branch_id) {
            abort(403, 'You can only edit jails in your branch.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:jails,code,' . $jail->id,
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $jail->update($validated);

        return redirect()->back()->with('success', 'Jail updated successfully.');
    }

    /**
     * Remove the specified jail.
     */
    public function destroy(Request $request, Jail $jail)
    {
        $user = $request->user();
        if ($jail->branch_id !== $user->branch_id) {
            abort(403, 'You can only delete jails in your branch.');
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
        if ($jail->branch_id !== $user->branch_id) {
            abort(403, 'You can only view jails in your branch.');
        }

        $jail->load(['annexes.dormitories.cells.inmates' => function ($q) {
            $q->where('status', 'active');
        }]);

        // Fallback or implemented details page
        return Inertia::render('JailWarden/JailManagement/Details', [
            'jail' => $jail,
        ]);
    }
}
