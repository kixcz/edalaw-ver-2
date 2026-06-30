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

        $dormitories = Dormitory::query()
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->with(['annex', 'annex.jail'])
            ->withCount(['cells'])
            ->select('dormitories.*')
            ->orderBy('dormitories.name')
            ->paginate(10)
            ->through(fn($dorm) => [
                'id' => $dorm->id,
                'name' => $dorm->name,
                'type' => $dorm->type,
                'description' => $dorm->description,
                'status' => $dorm->status,
                'annex' => $dorm->annex ? [
                    'id' => $dorm->annex->id,
                    'name' => $dorm->annex->name,
                ] : null,
                'jail' => $dorm->annex?->jail ? [
                    'id' => $dorm->annex->jail->id,
                    'name' => $dorm->annex->jail->name,
                ] : null,
                'cells_count' => $dorm->cells_count,
                'created_at' => $dorm->created_at,
            ]);

        // Calculate stats
        $stats = [
            'total_dormitories' => $dormitories->total(),
            'active_dormitories' => $dormitories->where('status', 'active')->count(),
            'inactive_dormitories' => $dormitories->where('status', 'inactive')->count(),
            'total_cells' => $dormitories->sum('cells_count'),
        ];

        // Chart data
        $chartData = [
            'dormitories_by_status' => [
                ['status' => 'Active', 'count' => $stats['active_dormitories']],
                ['status' => 'Inactive', 'count' => $stats['inactive_dormitories']],
            ],
            'dormitories_by_type' => $dormitories->groupBy('type')->map(function ($group, $type) {
                return [
                    'type' => $type ?? 'Unknown',
                    'count' => $group->count(),
                ];
            })->values()->toArray(),
        ];

        return Inertia::render('JailWarden/DormitoryManagement/Index', [
            'dormitories' => $dormitories,
            'annexes' => Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('annexes.status', 'active')
                ->orderBy('annexes.name')
                ->get(['annexes.id', 'annexes.name']),
            'stats' => $stats,
            'chartData' => $chartData,
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

        $annex = Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('annexes.id', $validated['annex_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('annexes.*')
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

        $belongsToBranch = $dormitory->annex()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'annex_id' => 'required|exists:annexes,id',
        ]);

        $newAnnex = Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('annexes.id', $validated['annex_id'])
            ->where('jails.branch_id', $user->branch_id)
            ->select('annexes.*')
            ->firstOrFail();

        $validated['annex_id'] = $newAnnex->id;

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

        $belongsToBranch = $dormitory->annex()
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $user->branch_id)
            ->exists();

        if (!$belongsToBranch) {
            abort(403, 'Unauthorized action.');
        }

        if ($dormitory->cells()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete dormitory with existing cells.');
        }

        $dormitory->delete();

        return redirect()->back()->with('success', 'Dormitory deleted successfully.');
    }
}
