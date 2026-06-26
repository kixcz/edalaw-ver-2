<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Branch;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Inmate;
use App\Models\Jail;
use App\Models\Region;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $registryLimit = 50;

        // === OVERVIEW STATISTICS ===
        $overviewStats = [
            'total_regions' => Region::count(),
            'total_branches' => Branch::count(),
            'total_jails' => Jail::count(),
            'total_dormitories' => Dormitory::count(),
            'total_annexes' => Annex::count(),
            'total_cells' => Cell::count(),
            'total_pdls' => Inmate::count(),
            'total_visitors' => User::whereHas('role', fn ($q) => $q->where('slug', 'visitor'))->count(),
            'total_visits' => Visit::count(),
            'active_visit_sessions' => VisitSession::whereNull('ended_at')->count(),
        ];

        // === REGIONAL OFFICES MODULE ===
        $regions = Region::withCount(['branches as total_branches'])->get()->map(function ($region) {
            $jailsCount = Jail::join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();
            $dormsCount = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();
            $cellsCount = Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->join('branches', 'jails.branch_id', '=', 'branches.id')
                ->where('branches.region_id', $region->id)
                ->count();
            $pdlsCount = Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
                ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
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
        $branches = Branch::with([
            'region:id,code,name',
            'jailWarden:id,branch_id,first_name,middle_name,last_name,email',
        ])->limit($registryLimit)->get()->map(function ($branch) {
            $totalJails = Jail::where('branch_id', $branch->id)->count();
            $totalAnnexes = Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->count();
            $totalDormitories = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->count();
            $totalCells = Cell::join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->count();
            $totalPdls = Inmate::join('cells', 'inmates.cell_id', '=', 'cells.id')
                ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->count();

            return [
                'id' => $branch->id,
                'code' => $branch->code,
                'name' => $branch->name,
                'type' => $branch->type,
                'status' => $branch->status,
                'region' => [
                    'code' => $branch->region?->code ?? 'Unknown',
                    'name' => $branch->region?->name ?? 'Unknown',
                ],
                'jail_warden' => $branch->jailWarden ? [
                    'id' => $branch->jailWarden->id,
                    'name' => trim("{$branch->jailWarden->first_name} {$branch->jailWarden->middle_name} {$branch->jailWarden->last_name}"),
                    'email' => $branch->jailWarden->email,
                ] : null,
                'total_jails' => $totalJails,
                'total_dormitories' => $totalDormitories,
                'total_annexes' => $totalAnnexes,
                'total_cells' => $totalCells,
                'total_pdls' => $totalPdls,
            ];
        });

        // === JAIL OFFICERS MODULE ===
        $jailOfficers = User::whereHas('role', fn ($q) => $q->where('slug', 'jail_officer'))
            ->select(['id', 'branch_id', 'first_name', 'middle_name', 'last_name', 'email'])
            ->with(['branch:id,region_id,code,name', 'branch.region:id,name'])
            ->limit($registryLimit)
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
                    'scopes' => $officer->assignedScopes()
                        ->active()
                        ->select(['id', 'jail_officer_id', 'scope_type', 'building_id', 'dormitory_id', 'cell_id'])
                        ->limit(5)
                        ->get()
                        ->map(function ($scope) {
                            return [
                                'scope_type' => $scope->scope_type,
                                'description' => $scope->scope_description,
                            ];
                        }),
                ];
            });

        // === ANNEX MODULE ===
        $annexes = Annex::with(['jail:id,branch_id,name,code', 'jail.branch:id,region_id,name,code', 'jail.branch.region:id,name,code'])
            ->withCount(['cells as total_cells', 'dormitories as total_dormitories'])
            ->limit($registryLimit)
            ->get()->map(function ($annex) {
                return [
                    'id' => $annex->id,
                    'name' => $annex->name,
                    'jail' => [
                        'name' => $annex->jail?->name ?? 'Unknown',
                        'code' => $annex->jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $annex->jail?->branch?->name ?? 'Unknown',
                        'code' => $annex->jail?->branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $annex->jail?->branch?->region?->name ?? 'Unknown',
                        'code' => $annex->jail?->branch?->region?->code ?? 'Unknown',
                    ],
                    'total_dormitories' => $annex->total_dormitories,
                    'total_cells' => $annex->total_cells,
                    'assigned_officers' => $annex->jailOfficerScopes()->active()->count(),
                ];
            });

        // === DORMITORIES MODULE ===
        $dormitories = Dormitory::with(['annex:id,jail_id,name', 'annex.jail:id,branch_id,name,code', 'annex.jail.branch:id,region_id,name,code', 'annex.jail.branch.region:id,name,code'])
            ->withCount(['cells as total_cells'])
            ->limit($registryLimit)
            ->get()->map(function ($dorm) {
                return [
                    'id' => $dorm->id,
                    'name' => $dorm->name,
                    'type' => $dorm->type,
                    'annex' => [
                        'name' => $dorm->annex?->name ?? 'Unknown',
                    ],
                    'jail' => [
                        'name' => $dorm->annex?->jail?->name ?? 'Unknown',
                        'code' => $dorm->annex?->jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $dorm->annex?->jail?->branch?->name ?? 'Unknown',
                        'code' => $dorm->annex?->jail?->branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $dorm->annex?->jail?->branch?->region?->name ?? 'Unknown',
                        'code' => $dorm->annex?->jail?->branch?->region?->code ?? 'Unknown',
                    ],
                    'total_cells' => $dorm->total_cells,
                    'total_pdls' => $dorm->cells()->withCount('inmates')->get()->sum('inmates_count'),
                ];
            });

        // === CELLS MODULE ===
        $cells = Cell::select(['id', 'dormitory_id', 'cell_number', 'capacity', 'status'])
            ->with(['dormitory:id,annex_id,name,type', 'dormitory.annex:id,jail_id,name', 'dormitory.annex.jail:id,branch_id,name,code', 'dormitory.annex.jail.branch:id,region_id,name,code', 'dormitory.annex.jail.branch.region:id,name,code'])
            ->withCount(['inmates as total_pdls'])
            ->limit($registryLimit)
            ->get()->map(function ($cell) {
                $dormitory = $cell->dormitory;
                $annex = $dormitory?->annex;
                $jail = $annex?->jail;
                $branch = $jail?->branch;
                $region = $branch?->region;

                return [
                    'id' => $cell->id,
                    'cell_number' => $cell->cell_number,
                    'capacity' => $cell->capacity,
                    'status' => $cell->status,
                    'annex' => [
                        'name' => $annex?->name ?? 'Unknown',
                    ],
                    'dormitory' => [
                        'name' => $dormitory?->name ?? 'Unknown',
                        'type' => $dormitory?->type ?? 'Unknown',
                    ],
                    'jail' => [
                        'name' => $jail?->name ?? 'Unknown',
                        'code' => $jail?->code ?? 'Unknown',
                    ],
                    'branch' => [
                        'name' => $branch?->name ?? 'Unknown',
                        'code' => $branch?->code ?? 'Unknown',
                    ],
                    'region' => [
                        'name' => $region?->name ?? 'Unknown',
                        'code' => $region?->code ?? 'Unknown',
                    ],
                    'total_pdls' => $cell->total_pdls,
                    'assigned_officers' => $cell->jailOfficerScopes()->active()->count(),
                ];
            });

        // === PDL MODULE ===
        $pdls = Inmate::select(['id', 'cell_id', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'status'])
            ->with(['cell:id,dormitory_id,cell_number', 'cell.dormitory:id,annex_id,name,type', 'cell.dormitory.annex:id,jail_id,name', 'cell.dormitory.annex.jail:id,branch_id,name,code', 'cell.dormitory.annex.jail.branch:id,region_id,name,code', 'cell.dormitory.annex.jail.branch.region:id,name,code'])
            ->limit($registryLimit)
            ->get()->map(function ($inmate) {
                $cell = $inmate->cell;
                $dormitory = $cell?->dormitory;
                $annex = $dormitory?->annex;
                $jail = $annex?->jail;
                $branch = $jail?->branch;
                $region = $branch?->region;

                return [
                    'id' => $inmate->id,
                    'full_name' => trim("{$inmate->first_name} {$inmate->middle_name} {$inmate->last_name}"),
                    'age' => $inmate->date_of_birth ? now()->diffInYears($inmate->date_of_birth) : null,
                    'gender' => 'N/A',
                    'cell' => [
                        'cell_number' => $cell?->cell_number ?? 'N/A',
                    ],
                    'annex' => [
                        'name' => $annex?->name ?? 'N/A',
                    ],
                    'dormitory' => [
                        'name' => $dormitory?->name ?? 'N/A',
                        'type' => $dormitory?->type ?? 'N/A',
                    ],
                    'jail' => [
                        'name' => $jail?->name ?? 'N/A',
                        'code' => $jail?->code ?? 'N/A',
                    ],
                    'branch' => [
                        'name' => $branch?->name ?? 'N/A',
                        'code' => $branch?->code ?? 'N/A',
                    ],
                    'region' => [
                        'name' => $region?->name ?? 'N/A',
                        'code' => $region?->code ?? 'N/A',
                    ],
                ];
            });

        // === ANALYTICS DATA ===

        // PDL count per branch (optimized with direct query)
        $pdlPerBranch = DB::table('branches')
            ->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')
            ->leftJoin('annexes', 'jails.id', '=', 'annexes.jail_id')
            ->leftJoin('dormitories', 'annexes.id', '=', 'dormitories.annex_id')
            ->leftJoin('cells', 'dormitories.id', '=', 'cells.dormitory_id')
            ->leftJoin('inmates', 'cells.id', '=', 'inmates.cell_id')
            ->select('branches.id', 'branches.name', DB::raw('COUNT(inmates.id) as aggregate_count'))
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('aggregate_count')
            ->limit(20)
            ->get()
            ->map(fn ($branch) => ['name' => $branch->name, 'count' => (int) $branch->aggregate_count]);

        // Branch count per region
        $branchPerRegion = Region::withCount('branches')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'count' => $r->branches_count]);

        // Cell count per branch
        $cellPerBranch = DB::table('branches')
            ->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')
            ->leftJoin('annexes', 'jails.id', '=', 'annexes.jail_id')
            ->leftJoin('dormitories', 'annexes.id', '=', 'dormitories.annex_id')
            ->leftJoin('cells', 'dormitories.id', '=', 'cells.dormitory_id')
            ->select('branches.id', 'branches.name', DB::raw('COUNT(DISTINCT cells.id) as aggregate_count'))
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('aggregate_count')
            ->limit(20)
            ->get()
            ->map(fn ($branch) => ['name' => $branch->name, 'count' => (int) $branch->aggregate_count]);

        // Visits per region
        $visitsPerRegion = DB::table('regions')
            ->leftJoin('branches', 'regions.id', '=', 'branches.region_id')
            ->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')
            ->leftJoin('visits', function ($join) use ($dateFrom, $dateTo) {
                $join->on('jails.id', '=', 'visits.jail_id')
                    ->whereBetween('visits.scheduled_date', [$dateFrom, $dateTo]);
            })
            ->select('regions.id', 'regions.name', DB::raw('COUNT(visits.id) as aggregate_count'))
            ->groupBy('regions.id', 'regions.name')
            ->orderByDesc('aggregate_count')
            ->limit(20)
            ->get()
            ->map(fn ($region) => ['name' => $region->name, 'count' => (int) $region->aggregate_count]);

        // Visits per branch
        $visitsPerBranch = DB::table('branches')
            ->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')
            ->leftJoin('visits', function ($join) use ($dateFrom, $dateTo) {
                $join->on('jails.id', '=', 'visits.jail_id')
                    ->whereBetween('visits.scheduled_date', [$dateFrom, $dateTo]);
            })
            ->select('branches.id', 'branches.name', DB::raw('COUNT(visits.id) as aggregate_count'))
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('aggregate_count')
            ->limit(20)
            ->get()
            ->map(fn ($branch) => ['name' => $branch->name, 'count' => (int) $branch->aggregate_count]);

        // Visits per dormitory
        $visitsPerDormitory = DB::table('dormitories')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->leftJoin('visits', function ($join) use ($dateFrom, $dateTo) {
                $join->on('jails.id', '=', 'visits.jail_id')
                    ->whereBetween('visits.scheduled_date', [$dateFrom, $dateTo]);
            })
            ->select('dormitories.id', 'dormitories.name', DB::raw('COUNT(visits.id) as visit_count'))
            ->groupBy('dormitories.id', 'dormitories.name')
            ->orderByDesc('visit_count')
            ->limit(20)
            ->get()
            ->map(fn ($d) => ['name' => $d->name, 'count' => (int) $d->visit_count]);

        // Visits per cell (top 20 by inmate visits in that cell)
        $visitsPerCell = DB::table('cells')
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->leftJoin('inmates', 'cells.id', '=', 'inmates.cell_id')
            ->leftJoin('visits', function ($join) use ($dateFrom, $dateTo) {
                $join->on('inmates.id', '=', 'visits.inmate_id')
                    ->whereBetween('visits.scheduled_date', [$dateFrom, $dateTo]);
            })
            ->select(
                'cells.id',
                'cells.cell_number',
                'annexes.name as annex_name',
                DB::raw('COUNT(DISTINCT visits.id) as visit_count')
            )
            ->groupBy('cells.id', 'cells.cell_number', 'annexes.name')
            ->orderByDesc('visit_count')
            ->limit(20)
            ->get()
            ->map(fn ($c) => [
                'name' => "{$c->cell_number} ({$c->annex_name})",
                'count' => (int) $c->visit_count,
            ]);

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
            'registryLimit' => $registryLimit,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}
