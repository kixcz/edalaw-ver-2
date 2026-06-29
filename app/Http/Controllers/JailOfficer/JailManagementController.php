<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JailManagementController extends Controller
{
    /**
     * Display a listing of jails.
     */
    public function index(Request $request): Response
    {
        $query = Jail::withCount(['dormitories', 'annexes']);

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

        return Inertia::render('JailOfficer/JailManagement', [
            'jails' => $jails,
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:jails',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        Jail::create($validated);

        return redirect()->back()->with('success', 'Jail created successfully.');
    }

    /**
     * Update the specified jail.
     */
    public function update(Request $request, Jail $jail)
    {
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
    public function destroy(Jail $jail)
    {
        // Check if jail has dormitories
        if ($jail->dormitories()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete jail with existing dormitories. Please delete dormitories first.');
        }

        $jail->delete();

        return redirect()->back()->with('success', 'Jail deleted successfully.');
    }

    /**
     * Get jail details with full hierarchy.
     */
    public function show(Jail $jail)
    {
        $jail->load(['annexes.dormitories.cells.inmates' => function ($q) {
            $q->where('status', 'active');
        }]);

        return Inertia::render('JailOfficer/JailDetails', [
            'jail' => $jail,
        ]);
    }
}
