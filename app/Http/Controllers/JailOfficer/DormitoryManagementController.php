<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Dormitory;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DormitoryManagementController extends Controller
{
    /**
     * Display a listing of dormitories.
     */
    public function index(Request $request): Response
    {
        $query = Dormitory::with(['jail', 'annexes' => function ($q) {
            $q->withCount(['cells' => function ($cq) {
                $cq->withCount(['inmates' => function ($iq) {
                    $iq->where('status', 'active');
                }]);
            }]);
        }]);

        // Filter by jail
        if ($jailId = $request->input('jail_id')) {
            $query->where('jail_id', $jailId);
        }

        // Type filter
        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $dormitories = $query->orderBy('name')->paginate(10)->withQueryString();

        // Get all jails for dropdown
        $jails = Jail::active()->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('JailOfficer/DormitoryManagement', [
            'dormitories' => $dormitories,
            'jails' => $jails,
            'filters' => [
                'jail_id' => $jailId ? (int) $jailId : null,
                'type' => $type ?? 'all',
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created dormitory.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        Dormitory::create($validated);

        return redirect()->back()->with('success', 'Dormitory created successfully.');
    }

    /**
     * Update the specified dormitory.
     */
    public function update(Request $request, Dormitory $dormitory)
    {
        $validated = $request->validate([
            'jail_id' => 'required|exists:jails,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $dormitory->update($validated);

        return redirect()->back()->with('success', 'Dormitory updated successfully.');
    }

    /**
     * Remove the specified dormitory.
     */
    public function destroy(Dormitory $dormitory)
    {
        // Check if dormitory has annexes
        if ($dormitory->annexes()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing annexes. Please delete annexes first.');
        }

        $dormitory->delete();

        return redirect()->back()->with('success', 'Dormitory deleted successfully.');
    }
}
