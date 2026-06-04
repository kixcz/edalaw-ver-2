<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Models\Dormitory;
use App\Models\Annex;
use App\Models\Cell;
use App\Models\Inmate;
use App\Models\JailOfficerScope;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class JailWardenDashboardController extends Controller
{
    /**
     * Display the Jail Warden dashboard.
     */
    public function index()
    {
        $user = auth()->user();
        $branch = $user->branch;

        if (!$branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Overview Statistics
        $overviewStats = [
            'total_dormitories' => $branch->dormitories()->count(),
            'total_annexes' => $branch->annexes()->count(),
            'total_cells' => $branch->cells()->count(),
            'total_pdls' => DB::table('cells')
                ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $branch->id)
                ->sum('capacity'), // Use capacity as total PDLs since we don't have actual inmates yet
            'total_jail_officers' => User::where('role_id', function($query) {
                    $query->select('id')->from('roles')->where('slug', 'jail_officer');
                })
                ->where('branch_id', $branch->id)
                ->count(),
            'active_scopes' => JailOfficerScope::whereHas('jailOfficer', fn($q) => $q->where('branch_id', $branch->id))
                ->where('is_active', true)
                ->count(),
        ];

        // Get all dormitories with their annexes and cells
        $dormitories = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->where('annexes.branch_id', $branch->id)
            ->with(['cells.inmates'])
            ->get()
            ->map(function ($dorm) {
                return [
                    'id' => $dorm->id,
                    'name' => $dorm->name,
                    'type' => $dorm->type,
                    'capacity' => $dorm->cells()->sum('capacity'),
                    'cells' => $dorm->cells->map(function ($cell) {
                        return [
                            'id' => $cell->id,
                            'cell_number' => $cell->cell_number,
                            'capacity' => $cell->capacity,
                            'current_inmates' => $cell->inmates->count(),
                            'inmates' => $cell->inmates->map(fn($inmate) => [
                                'id' => $inmate->id,
                                'full_name' => trim("{$inmate->first_name} {$inmate->middle_name} {$inmate->last_name}"),
                                'age' => $inmate->age,
                                'gender' => $inmate->gender,
                            ]),
                        ];
                    }),
                ];
            });

        // Get all jail officers in this branch with their scopes
        $jailOfficers = User::where('role_id', function($query) {
                $query->select('id')->from('roles')->where('slug', 'jail_officer');
            })
            ->where('branch_id', $branch->id)
            ->with(['assignedScopes.annex', 'assignedScopes.dormitory', 'assignedScopes.cell'])
            ->get()
            ->map(function ($officer) {
                return [
                    'id' => $officer->id,
                    'name' => trim("{$officer->first_name} {$officer->middle_name} {$officer->last_name}"),
                    'email' => $officer->email,
                    'scopes' => $officer->assignedScopes()->active()->get()->map(function ($scope) {
                        return [
                            'id' => $scope->id,
                            'scope_type' => $scope->scope_type,
                            'description' => $scope->scope_description,
                            'is_active' => $scope->is_active,
                        ];
                    }),
                ];
            });

        // Get facilities data for scope assignment dropdowns
        $facilities = [
            'annexes' => Annex::where('branch_id', $branch->id)
                ->with(['dormitories'])
                ->get()
                ->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'dormitories' => $a->dormitories->map(fn($d) => ['id' => $d->id, 'name' => $d->name])]),
            
            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $branch->id)
                ->select('dormitories.*')
                ->get()
                ->map(fn($d) => ['id' => $d->id, 'name' => $d->name]),
            
            'cells' => Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->where('annexes.branch_id', $branch->id)
                ->with(['dormitory.annex'])
                ->get()
                ->map(fn($c) => [
                    'id' => $c->id,
                    'cell_number' => $c->cell_number,
                    'dormitory' => ['id' => $c->dormitory->id, 'name' => $c->dormitory->name],
                    'annex' => ['id' => $c->dormitory->annex->id, 'name' => $c->dormitory->annex->name],
                ]),
        ];

        return Inertia::render('JailWarden/Dashboard', [
            'overviewStats' => $overviewStats,
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
            ],
            'dormitories' => $dormitories,
            'jailOfficers' => $jailOfficers,
            'facilities' => $facilities,
        ]);
    }
}
