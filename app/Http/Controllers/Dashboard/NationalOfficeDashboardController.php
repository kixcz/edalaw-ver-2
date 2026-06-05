<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Branch;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\Jail;
use App\Models\JailOfficerScope;
use App\Models\Region;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitSession;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NationalOfficeDashboardController extends Controller
{
    /**
     * Display the National Office dashboard.
     */
    public function __invoke(Request $request)
    {
        // Get date range for analytics (default: last 30 days)
        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));

        // === OVERVIEW STATISTICS ===
        $overviewStats = [
            'total_regions' => Region::count(),
            'total_branches' => Branch::count(),
            'total_jails' => Jail::count(),
            'total_dormitories' => Dormitory::count(),
            'total_annexes' => Annex::count(),
            'total_cells' => Cell::count(),
            'total_pdls' => Inmate::count(),
            'total_visitors' => User::whereHas('role', fn($q) => $q->where('slug', 'visitor'))->count(),
            'total_visits' => Visit::count(),
            'active_visit_sessions' => VisitSession::whereNull('ended_at')->count(),
        ];

        // === REGIONAL OFFICES MODULE ===
        $regions = Region::withCount(['branches as total_branches'])->get()->map(function ($region) {
            $jailsCount = $region->jails()->count();
            $dormsCount = Dormitory::join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();
            $cellsCount = Cell::join('annexes', 'cells.annex_id', '=', 'annexes.id')
                ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();
            $pdlsCount = Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
                ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
                ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();

            return [
                'id' => $region->id,
                'code' => $region->code,
                'name' => $region->name,
                'status' => $region->status,
                'total_branches' => $region->total_branches,
                'total_jails' => $jailsCount,
                'total_dormitories' => $dormsCount,
                'total_cells' => $cellsCount,
                'total_pdls' => $pdlsCount,
            ];
        });

        // === BJMP BRANCHES MODULE ===
        $branches = Branch::with(['region', 'jailWarden'])->withCount([
            'jails as total_jails',
            'dormitories as total_dormitories',
            'annexes as total_annexes',
        ])->get()->map(function ($branch) {
            // Calculate cells count manually since it's not a direct relationship
            $totalCells = Cell::join('annexes', 'cells.annex_id', '=', 'annexes.id')
                ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->count();

            return [
                'id' => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name,
                'type' => $branch->type,
                'status' => $branch->status,
                'region' => [
                    'code' => $branch->region->code,
                    'name' => $branch->region->name,
                ],
                'jail_warden' => $branch->jailWarden ? [
                    'id' => $branch->jailWarden->id,
                    'name' => trim("{$branch->jailWarden->first_name} {$branch->jailWarden->middle_name} {$branch->jailWarden->last_name}"),
                    'email' => $branch->jailWarden->email,
                ] : null,
                'total_jails' => $branch->total_jails,
                'total_dormitories' => $branch->total_dormitories,
                'total_annexes' => $branch->total_annexes,
                'total_cells' => $totalCells,
                'total_pdls' => Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
                    ->join('annexes', 'cells.annex_id', '=', 'annexes.id')
                    ->join('dormitories', 'annexes.dormitory_id', '=', 'dormitories.id')
                    ->join('jails', 'dormitories.jail_id', '=', 'jails.id')
                    ->where('jails.branch_id', $branch->id)
                    ->count(),
            ];
        });

        // === JAIL OFFICERS MODULE ===
        $jailOfficers = User::whereHas('role', fn($q) => $q->where('slug', 'jail_officer'))
            ->with(['branch.region', 'assignedScopes.annex', 'assignedScopes.dormitory', 'assignedScopes.cell'])
            ->get()->map(function ($officer) {
                return [
                    'id' => $officer->id,
                    'name' => trim("{$officer->first_name} {$officer->middle_name} {$officer->last_name}"),
                    'email' => $officer->email,
                    'branch' => $officer->branch ? [
                        'code' => $officer->branch->code,
                        'name' => $officer->branch->name,
                        'region' => $officer->branch->region?->name ?? 'Unknown',
                    ] : null,
                    'scopes' => $officer->assignedScopes()->active()->get()->map(function ($scope) {
                        return [
                            'scope_type' => $scope->scope_type,
                            'description' => $scope->scope_description,
                        ];
                    }),
                ];
            });

        // === ANNEX MODULE ===
        $annexes = Annex::with(['dormitory.jail.branch.region'])
            ->withCount(['cells as total_cells'])
            ->get()->map(function ($annex) {
                return [
                    'id' => $annex->id,
                    'name' => $annex->name,
                    'dormitory' => [
                        'name' => $annex->dormitory?->name ?? 'Unknown',
                        'type' => $annex->dormitory?->type ?? 'Unknown',
                    ],
                    'jail' => [
                        'name' => $annex->dormitory?->jail?->name ?? 'Unknown',
                        'code' => $annex->dormitory?->jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $annex->dormitory?->jail?->branch?->name ?? 'Unknown',
                        'code' => $annex->dormitory?->jail?->branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $annex->dormitory?->jail?->branch?->region?->name ?? 'Unknown',
                        'code' => $annex->dormitory?->jail?->branch?->region?->code ?? 'Unknown',
                    ],
                    'total_cells' => $annex->total_cells,
                    'assigned_officers' => $annex->jailOfficerScopes()->active()->count(),
                ];
            });

        // === DORMITORIES MODULE ===
        $dormitories = Dormitory::with(['jail.branch.region'])
            ->withCount(['annexes as total_annexes', 'cells as total_cells'])
            ->get()->map(function ($dorm) {
                return [
                    'id' => $dorm->id,
                    'name' => $dorm->name,
                    'type' => $dorm->type,
                    'capacity' => $dorm->capacity,
                    'jail' => [
                        'name' => $dorm->jail?->name ?? 'Unknown',
                        'code' => $dorm->jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $dorm->jail?->branch?->name ?? 'Unknown',
                        'code' => $dorm->jail?->branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $dorm->jail?->branch?->region?->name ?? 'Unknown',
                        'code' => $dorm->jail?->branch?->region?->code ?? 'Unknown',
                    ],
                    'total_annexes' => $dorm->total_annexes,
                    'total_cells' => $dorm->total_cells,
                    'total_pdls' => $dorm->cells()->withCount('inmates')->get()->sum('inmates_count'),
                ];
            });

        // === CELLS MODULE ===
        $cells = Cell::with(['annex.dormitory.jail.branch.region'])
            ->withCount(['inmates as total_pdls'])
            ->get()->map(function ($cell) {
                return [
                    'id' => $cell->id,
                    'cell_number' => $cell->cell_number,
                    'floor_number' => $cell->floor_number,
                    'capacity' => $cell->capacity,
                    'annex' => [
                        'name' => $cell->annex?->name ?? 'Unknown',
                    ],
                    'dormitory' => [
                        'name' => $cell->annex?->dormitory?->name ?? 'Unknown',
                        'type' => $cell->annex?->dormitory?->type ?? 'Unknown',
                    ],
                    'jail' => [
                        'name' => $cell->annex?->dormitory?->jail?->name ?? 'Unknown',
                        'code' => $cell->annex?->dormitory?->jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $cell->annex?->dormitory?->jail?->branch?->name ?? 'Unknown',
                        'code' => $cell->annex?->dormitory?->jail?->branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $cell->annex?->dormitory?->jail?->branch?->region?->name ?? 'Unknown',
                        'code' => $cell->annex?->dormitory?->jail?->branch?->region?->code ?? 'Unknown',
                    ],
                    'total_pdls' => $cell->total_pdls,
                    'assigned_officers' => $cell->jailOfficerScopes()->active()->count(),
                ];
            });

        // === PDL MODULE ===
        $pdls = Inmate::with(['cell.annex.dormitory.jail.branch.region'])
            ->get()->map(function ($inmate) {
                return [
                    'id' => $inmate->id,
                    'full_name' => trim("{$inmate->first_name} {$inmate->middle_name} {$inmate->last_name}"),
                    'age' => $inmate->age,
                    'gender' => $inmate->gender,
                    'cell' => [
                        'cell_number' => $inmate->cell?->cell_number ?? 'N/A',
                    ],
                    'annex' => [
                        'name' => $inmate->cell?->annex?->name ?? 'N/A',
                    ],
                    'dormitory' => [
                        'name' => $inmate->cell?->annex?->dormitory?->name ?? 'N/A',
                        'type' => $inmate->cell?->annex?->dormitory?->type ?? 'N/A',
                    ],
                    'jail' => [
                        'name' => $inmate->cell?->annex?->dormitory?->jail?->name ?? 'N/A',
                        'code' => $inmate->cell?->annex?->dormitory?->jail?->code ?? 'N/A',
                    ],
                    'branch' => [
                        'name' => $inmate->cell?->annex?->dormitory?->jail?->branch?->name ?? 'N/A',
                        'code' => $inmate->cell?->annex?->dormitory?->jail?->branch?->code ?? 'N/A',
                    ],
                    'region' => [
                        'name' => $inmate->cell?->annex?->dormitory?->jail?->branch?->region?->name ?? 'N/A',
                        'code' => $inmate->cell?->annex?->dormitory?->jail?->branch?->region?->code ?? 'N/A',
                    ],
                ];
            });

        // === ANALYTICS DATA ===
        
        // PDL count per branch
        $pdlPerBranch = Branch::with(['jails.dormitories.annexes.cells.inmates'])
            ->get()
            ->map(function ($b) {
                $count = 0;
                foreach ($b->jails as $jail) {
                    foreach ($jail->dormitories as $dorm) {
                        foreach ($dorm->annexes as $annex) {
                            $count += $annex->cells->sum('inmates_count');
                        }
                    }
                }
                return ['name' => $b->name, 'count' => $count];
            });

        // Branch count per region
        $branchPerRegion = Region::withCount('branches')
            ->get()
            ->map(fn($r) => ['name' => $r->name, 'count' => $r->branches_count]);

        // Cell count per branch
        $cellPerBranch = Branch::with(['jails.dormitories.annexes.cells'])
            ->get()
            ->map(function ($b) {
                $count = 0;
                foreach ($b->jails as $jail) {
                    foreach ($jail->dormitories as $dorm) {
                        $count += $dorm->annexes->sum(fn($annex) => $annex->cells->count());
                    }
                }
                return ['name' => $b->name, 'count' => $count];
            });

        // Visits per region
        $visitsPerRegion = Region::with(['branches.jails.visits'])
            ->get()
            ->map(fn($r) => [
                'name' => $r->name,
                'count' => $r->branches->sum(fn($b) => $b->jails->sum(fn($j) => $j->visits->count()))
            ]);

        // Visits per branch
        $visitsPerBranch = Branch::withCount(['visits'])
            ->get()
            ->map(fn($b) => ['name' => $b->name, 'count' => $b->visits_count]);

        // Visits per dormitory
        $visitsPerDormitory = Dormitory::with(['jail.visits'])
            ->get()
            ->map(fn($d) => ['name' => $d->name, 'count' => $d->jail?->visits->count() ?? 0]);

        // Visits per cell (top 20 by inmate visits in that cell)
        $visitsPerCell = Cell::with(['annex.dormitory', 'inmates.visits'])
            ->get()
            ->map(function ($cell) {
                $visitCount = $cell->inmates->sum(fn($inmate) => $inmate->visits->count());
                return [
                    'name' => "{$cell->cell_number} ({$cell->annex->dormitory->name})",
                    'count' => $visitCount
                ];
            })
            ->sortByDesc('count')
            ->take(20)
            ->values();

        return Inertia::render('NationalOffice/Dashboard', [
            'overviewStats' => $overviewStats,
            'regions' => $regions,
            'branches' => $branches,
            'jailOfficers' => $jailOfficers,
            'annexes' => $annexes,
            'dormitories' => $dormitories,
            'cells' => $cells,
            'pdls' => $pdls,
            'analytics' => [
                'pdl_per_branch' => $pdlPerBranch,
                'branch_per_region' => $branchPerRegion,
                'cell_per_branch' => $cellPerBranch,
                'visits_per_region' => $visitsPerRegion,
                'visits_per_branch' => $visitsPerBranch,
                'visits_per_dormitory' => $visitsPerDormitory,
                'visits_per_cell' => $visitsPerCell,
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}
