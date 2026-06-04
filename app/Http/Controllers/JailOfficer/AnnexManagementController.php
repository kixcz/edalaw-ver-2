<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Dormitory;
use App\Models\Jail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnexManagementController extends Controller
{
    /**
     * Display a listing of annexes.
     */
    public function index(Request $request): Response
    {
        $query = Annex::with(['dormitory.jail', 'cells' => function ($q) {
            $q->withCount(['inmates' => function ($iq) {
                $iq->where('status', 'active');
            }]);
        }]);

        // Filter by dormitory
        if ($dormitoryId = $request->input('dormitory_id')) {
            $query->where('dormitory_id', $dormitoryId);
        }

        // Filter by jail (through dormitory)
        if ($jailId = $request->input('jail_id')) {
            $query->whereHas('dormitory', function ($q) use ($jailId) {
                $q->where('jail_id', $jailId);
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $annexes = $query->orderBy('name')->paginate(10)->withQueryString();

        // Get all jails and dormitories for dropdowns
        $jails = Jail::orderBy('name')->get(['id', 'name', 'code']);
        $dormitories = Dormitory::with('annex')
            ->orderBy('name')
            ->get(['id', 'annex_id', 'name']);

        return Inertia::render('JailOfficer/AnnexManagement', [
            'annexes' => $annexes,
            'jails' => $jails,
            'dormitories' => $dormitories,
            'filters' => [
                'dormitory_id' => $dormitoryId ? (int) $dormitoryId : null,
                'jail_id' => $jailId ? (int) $jailId : null,
                'status' => $status ?? 'all',
            ],
        ]);
    }

    /**
     * Store a newly created annex.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'dormitory_id' => 'required|exists:dormitories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        Annex::create($validated);

        return redirect()->back()->with('success', 'Annex created successfully.');
    }

    /**
     * Update the specified annex.
     */
    public function update(Request $request, Annex $annex)
    {
        $validated = $request->validate([
            'dormitory_id' => 'required|exists:dormitories,id',
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
    public function destroy(Annex $annex)
    {
        // Check if annex has cells
        if ($annex->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete annex with existing cells. Please delete or transfer cells first.');
        }

        $annex->delete();

        return redirect()->back()->with('success', 'Annex deleted successfully.');
    }
}
