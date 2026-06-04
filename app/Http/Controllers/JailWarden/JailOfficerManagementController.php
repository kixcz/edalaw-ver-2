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
            'annexes' => Annex::where('branch_id', $user->branch_id)
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            
            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $user->branch_id)
                ->where('dormitories.status', 'active')
                ->orderBy('dormitories.name')
                ->select('dormitories.id', 'dormitories.name', 'annexes.name as annex_name')
                ->get(),
            
            'cells' => Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $user->branch_id)
                ->where('cells.status', 'active')
                ->orderBy('cells.cell_number')
                ->select(
                    'cells.id',
                    'cells.cell_number',
                    'dormitories.name as dormitory_name',
                    'annexes.name as annex_name'
                )
                ->get(),
        ];

        return Inertia::render('JailWarden/JailOfficerManagement/Index', [
            'officers' => $officers,
            'facilities' => $facilities,
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
}
