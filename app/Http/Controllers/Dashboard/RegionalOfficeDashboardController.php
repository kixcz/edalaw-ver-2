<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Dormitory;
use App\Models\Annex;
use App\Models\Cell;
use App\Models\Inmate;
use App\Models\User;
use Inertia\Inertia;

class RegionalOfficeDashboardController extends Controller
{
    /**
     * Display the Regional Supervisor dashboard.
     */
    public function index()
    {
        $user = auth()->user();
        
        // Get all branches in the user's region
        $branches = Branch::where('region_id', $user->region_id)
            ->with(['jailWarden'])
            ->get()
            ->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'code' => $branch->code,
                    'name' => $branch->name,
                    'type' => 'provincial', // Default type since field doesn't exist
                    'status' => $branch->status,
                    'location' => $branch->description ?? 'N/A', // Use description as location
                    'warden' => $branch->jailWarden ? [
                        'name' => trim("{$branch->jailWarden->first_name} {$branch->jailWarden->middle_name} {$branch->jailWarden->last_name}"),
                        'email' => $branch->jailWarden->email,
                    ] : null,
                    'total_annexes' => $branch->annexes()->count(),
                    'total_dormitories' => $branch->dormitories()->count(),
                    'total_cells' => $branch->cells()->count(),
                    'total_pdls' => $branch->cells()->withCount('inmates')->get()->sum('inmates_count'),
                ];
            });

        // Detailed breakdown per branch
        $branchDetails = Branch::where('region_id', $user->region_id)
            ->with(['jails.dormitories.annexes.cells.inmates'])
            ->get()
            ->map(function ($branch) {
                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'jails' => $branch->jails->map(function ($jail) {
                        return [
                            'name' => $jail->name,
                            'code' => $jail->code,
                            'dormitories' => $jail->dormitories->map(function ($dorm) {
                                return [
                                    'name' => $dorm->name,
                                    'type' => $dorm->type,
                                    'annexes' => $dorm->annexes->map(function ($annex) {
                                        return [
                                            'name' => $annex->name,
                                            'cells' => $annex->cells->map(function ($cell) {
                                                return [
                                                    'cell_number' => $cell->cell_number,
                                                    'floor_number' => $cell->floor_number,
                                                    'capacity' => $cell->capacity,
                                                    'current_inmates' => $cell->inmates->count(),
                                                    'inmates' => $cell->inmates->map(function ($inmate) {
                                                        return [
                                                            'id' => $inmate->id,
                                                            'full_name' => trim("{$inmate->first_name} {$inmate->middle_name} {$inmate->last_name}"),
                                                            'age' => $inmate->age,
                                                            'gender' => $inmate->gender,
                                                        ];
                                                    }),
                                                ];
                                            }),
                                        ];
                                    }),
                                ];
                            }),
                        ];
                    }),
                ];
            });

        // Overview statistics
        $overviewStats = [
            'total_branches' => $branches->count(),
            'total_annexes' => Annex::whereHas('dormitory.jail.branch', fn($q) => $q->where('region_id', $user->region_id))->count(),
            'total_dormitories' => Dormitory::whereHas('jail.branch', fn($q) => $q->where('region_id', $user->region_id))->count(),
            'total_cells' => Cell::whereHas('annex.dormitory.jail.branch', fn($q) => $q->where('region_id', $user->region_id))->count(),
            'total_pdls' => Inmate::whereHas('cell.annex.dormitory.jail.branch', fn($q) => $q->where('region_id', $user->region_id))->count(),
            'total_jail_wardens' => User::where('role_id', function($query) {
                    $query->select('id')->from('roles')->where('slug', 'jail_warden');
                })
                ->whereHas('branch', fn($q) => $q->where('region_id', $user->region_id))
                ->count(),
            'total_jails' => $branches->sum(fn($b) => $b['total_jails'] ?? 0),
            'active_branches' => $branches->where('status', 'active')->count(),
        ];

        return Inertia::render('RegionalSupervisor/Dashboard', [
            'overviewStats' => $overviewStats,
            'branches' => $branches,
            'branchDetails' => $branchDetails,
        ]);
    }
}
