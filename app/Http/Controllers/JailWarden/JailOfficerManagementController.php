<?php

namespace App\Http\Controllers\JailWarden;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Annex;
use App\Models\Dormitory;
use App\Models\Cell;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JailOfficerManagementController extends Controller
{
    /**
     * Display all jail officers with their assigned scopes.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Get all jail officers in the branch
        $officers = User::whereHas('role', function ($query) {
                $query->where('slug', 'jail_officer');
            })
            ->whereHas('branch', function ($query) use ($user) {
                $query->where('id', $user->branch_id);
            })
            ->with(['assignedScopes' => function ($query) {
                $query->with(['annex', 'dormitory', 'cell']);
            }])
            ->orderBy('first_name')
            ->get()
            ->map(function ($officer) {
                return [
                    'id' => $officer->id,
                    'name' => $officer->full_name,
                    'email' => $officer->email,
                    'scopes' => $officer->assignedScopes->map(function ($scope) {
                        $description = match($scope->scope_type) {
                            'annex' => $scope->annex?->name ?? 'Unknown',
                            'dormitory' => $scope->dormitory?->name ?? 'Unknown',
                            'cell' => $scope->cell?->cell_number ?? 'Unknown',
                            default => 'Unknown',
                        };
                        
                        return [
                            'id' => $scope->id,
                            'scope_type' => $scope->scope_type,
                            'description' => $description,
                            'is_active' => $scope->is_active,
                        ];
                    }),
                ];
            });

        // Get facilities for dropdown
        $facilities = [
            'annexes' => Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('annexes.status', 'active')
                ->orderBy('annexes.name')
                ->select('annexes.id', 'annexes.name')
                ->get(),

            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->orderBy('dormitories.name')
                ->select('dormitories.id', 'dormitories.name')
                ->get(),

            'cells' => Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('cells.status', 'active')
                ->orderBy('cells.cell_number')
                ->select(
                    'cells.id',
                    'cells.cell_number',
                    'annexes.name as annex_name',
                    'dormitories.name as dormitory_name'
                )
                ->get(),
        ];

        // Calculate stats
        $stats = [
            'total_officers' => $officers->count(),
            'active_assignments' => $officers->sum(fn($o) => $o['scopes']->where('is_active', true)->count()),
            'annex_scopes' => $officers->sum(fn($o) => $o['scopes']->where('scope_type', 'annex')->count()),
            'dormitory_scopes' => $officers->sum(fn($o) => $o['scopes']->where('scope_type', 'dormitory')->count()),
        ];

        // Chart data
        $chartData = [
            'officers_by_scope_type' => [
                ['type' => 'Annex', 'count' => $stats['annex_scopes']],
                ['type' => 'Dormitory', 'count' => $stats['dormitory_scopes']],
                ['type' => 'Cell', 'count' => $officers->sum(fn($o) => $o['scopes']->where('scope_type', 'cell')->count())],
            ],
            'assignment_status' => [
                ['status' => 'Active', 'count' => $stats['active_assignments']],
                ['status' => 'Inactive', 'count' => $officers->sum(fn($o) => $o['scopes']->where('is_active', false)->count())],
            ],
        ];

        return Inertia::render('JailWarden/JailOfficerManagement/Index', [
            'officers' => $officers,
            'facilities' => $facilities,
            'stats' => $stats,
            'chartData' => $chartData,
        ]);
    }

    /**
     * Store a newly created jail officer.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
        ]);

        // Get the jail officer role
        $jailOfficerRole = \App\Models\Role::where('slug', 'jail_officer')->firstOrFail();

        // Create the user
        User::create([
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role_id' => $jailOfficerRole->id,
            'branch_id' => $user->branch_id,
            'approval_status' => 'approved', // Auto-approve since warden creates it
        ]);

        return redirect()->back()->with('success', 'Jail Officer account created successfully.');
    }
    /**
     * Display the specified jail officer details.
     */
    public function show(Request $request, User $officer)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify the officer belongs to the warden's branch and is a jail officer
        if ($officer->branch_id !== $user->branch_id || $officer->role->slug !== 'jail_officer') {
            abort(403, 'Unauthorized action.');
        }

        $officer->load(['assignedScopes.annex', 'assignedScopes.dormitory', 'assignedScopes.cell']);

        // Get facilities for dropdown
        $facilities = [
            'annexes' => Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('annexes.status', 'active')
                ->orderBy('annexes.name')
                ->select('annexes.id', 'annexes.name')
                ->get(),

            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->orderBy('dormitories.name')
                ->select('dormitories.id', 'dormitories.name')
                ->get(),

            'cells' => Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $user->branch_id)
                ->where('cells.status', 'active')
                ->orderBy('cells.cell_number')
                ->select(
                    'cells.id',
                    'cells.cell_number',
                    'annexes.name as annex_name',
                    'dormitories.name as dormitory_name'
                )
                ->get(),
        ];

        return Inertia::render('JailWarden/JailOfficerManagement/Show', [
            'officer' => [
                'id' => $officer->id,
                'name' => $officer->full_name,
                'email' => $officer->email,
                'scopes' => $officer->assignedScopes->map(function ($scope) {
                    $description = match($scope->scope_type) {
                        'annex' => $scope->annex?->name ?? 'Unknown',
                        'dormitory' => $scope->dormitory?->name ?? 'Unknown',
                        'cell' => $scope->cell?->cell_number ?? 'Unknown',
                        default => 'Unknown',
                    };
                    
                    return [
                        'id' => $scope->id,
                        'scope_type' => $scope->scope_type,
                        'building_id' => $scope->building_id,
                        'dormitory_id' => $scope->dormitory_id,
                        'cell_id' => $scope->cell_id,
                        'description' => $description,
                        'is_active' => $scope->is_active,
                    ];
                }),
            ],
            'facilities' => $facilities,
        ]);
    }

    /**
     * Update the assigned scopes for a jail officer.
     */
    public function updateScopes(Request $request, User $officer)
    {
        $user = $request->user();
        
        if (!$user->branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Verify the officer belongs to the warden's branch and is a jail officer
        if ($officer->branch_id !== $user->branch_id || $officer->role->slug !== 'jail_officer') {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'scopes' => 'array',
            'scopes.*.scope_type' => 'required|in:annex,dormitory,cell',
            'scopes.*.building_id' => 'nullable|exists:annexes,id',
            'scopes.*.dormitory_id' => 'nullable|exists:dormitories,id',
            'scopes.*.cell_id' => 'nullable|exists:cells,id',
            'scopes.*.is_active' => 'boolean',
        ]);

        // Clear existing scopes
        $officer->assignedScopes()->delete();

        // Create new scopes
        if (!empty($validated['scopes'])) {
            foreach ($validated['scopes'] as $scope) {
                // Ensure the required ID is present for the selected scope_type
                if ($scope['scope_type'] === 'annex' && empty($scope['building_id'])) continue;
                if ($scope['scope_type'] === 'dormitory' && empty($scope['dormitory_id'])) continue;
                if ($scope['scope_type'] === 'cell' && empty($scope['cell_id'])) continue;
                
                $officer->assignedScopes()->create([
                    'assigned_by' => $user->id,
                    'scope_type' => $scope['scope_type'],
                    'building_id' => $scope['building_id'] ?? null,
                    'dormitory_id' => $scope['dormitory_id'] ?? null,
                    'cell_id' => $scope['cell_id'] ?? null,
                    'is_active' => $scope['is_active'] ?? true,
                ]);
            }
        }

        return redirect()->back()->with('success', 'Assigned scopes updated successfully.');
    }
}
