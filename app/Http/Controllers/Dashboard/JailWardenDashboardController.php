<?php

namespace App\Http\Controllers\Dashboard;

use App\AppealStatus;
use App\ApprovalStatus;
use App\EburolStatus;
use App\Http\Controllers\Controller;
use App\Models\Appeal;
use App\Models\Branch;
use App\Models\ChatFlag;
use App\Models\Eburol;
use App\Models\Incident;
use App\Models\MonitoringLog;
use App\Models\MonitoringSession;
use App\Models\Role;
use App\Models\Suggestion;
use App\Models\User;
use App\Models\Dormitory;
use App\Models\Annex;
use App\Models\Cell;
use App\Models\Inmate;
use App\Models\JailOfficerScope;
use App\Models\Visit;
use App\Models\VisitSession;
use App\SuggestionStatus;
use App\VisitType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class JailWardenDashboardController extends Controller
{
    /**
     * Display the Jail Warden dashboard with merged Super Admin features.
     * All analytics are scoped to the warden's branch only.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $branch = $user->branch;

        if (!$branch) {
            abort(403, 'Jail Warden must be assigned to a branch.');
        }

        // Resolve date range for analytics
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);
        $dateFromStr = $dateFrom->format('Y-m-d');
        $dateToStr = $dateTo->format('Y-m-d');
        $visitTypeFilter = $request->input('visit_type');
        $statusFilter = $request->input('status');
        $timeGrouping = $request->input('time_grouping', 'daily');
        $recordingFilter = $request->input('recording_compliance', 'all');
        $violationFilter = $request->input('violation', 'all');
        $inmateSearch = $request->input('inmate');

        // ===== BRANCH-SCOPED ANALYTICS =====
        
        // User statistics (branch-scoped)
        $totalUsers = User::where('branch_id', $branch->id)->whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $pendingUsers = User::where('branch_id', $branch->id)->where('approval_status', ApprovalStatus::Pending)->whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $approvedUsers = User::where('branch_id', $branch->id)->where('approval_status', ApprovalStatus::Approved)->whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $rejectedUsers = User::where('branch_id', $branch->id)->where('approval_status', ApprovalStatus::Rejected)->whereBetween('created_at', [$dateFrom, $dateTo])->count();

        $recentUsers = User::with('role')
            ->where('branch_id', $branch->id)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'role' => $user->role?->slug,
                    'role_name' => $user->role?->name,
                    'approval_status' => $user->approval_status,
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                ];
            });

        $usersByRole = User::with('role')
            ->where('branch_id', $branch->id)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->get()
            ->groupBy(function ($user) {
                return $user->role?->slug ?? 'no_role';
            })
            ->map(function ($users) {
                return $users->count();
            })
            ->toArray();

        // Appeals statistics (branch-scoped via visits/eburols in branch)
        $appealsStats = [
            'total' => Appeal::whereHas('appealable', function ($q) use ($branch) {
                    $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'pending' => Appeal::where('status', AppealStatus::Pending)
                ->whereHas('appealable', function ($q) use ($branch) {
                    $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'approved' => Appeal::where('status', AppealStatus::Approved)
                ->whereHas('appealable', function ($q) use ($branch) {
                    $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'rejected' => Appeal::where('status', AppealStatus::Rejected)
                ->whereHas('appealable', function ($q) use ($branch) {
                    $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'by_type' => [
                'visit' => Appeal::where('appealable_type', Visit::class)
                    ->whereHas('appealable', function ($q) use ($branch) {
                        $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                    })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
                'eburol' => Appeal::where('appealable_type', Eburol::class)
                    ->whereHas('appealable', function ($q) use ($branch) {
                        $q->whereHas('branch', fn($branchQuery) => $branchQuery->where('branches.id', $branch->id));
                    })->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            ],
        ];

        // Suggestions/Complaints statistics (branch-scoped through users)
        $suggestionsStats = [
            'total' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'pending' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', SuggestionStatus::Pending)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'suggestions' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('type', 'suggestion')->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'complaints' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('type', 'complaint')->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'resolved' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', SuggestionStatus::Resolved)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'reviewed' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', SuggestionStatus::Reviewed)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'in_progress' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', SuggestionStatus::InProgress)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'dismissed' => Suggestion::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', SuggestionStatus::Dismissed)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
        ];

        // E-Burol statistics (branch-scoped through users)
        $eburolStats = [
            'total' => Eburol::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'pending' => Eburol::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', EburolStatus::Pending)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'approved' => Eburol::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', EburolStatus::Approved)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'rejected' => Eburol::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', EburolStatus::Rejected)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'completed' => Eburol::whereHas('user', fn($q) => $q->where('branch_id', $branch->id))->where('status', EburolStatus::Completed)->whereBetween('created_at', [$dateFrom, $dateTo])->count(),
        ];

        // Visit statistics (branch-scoped via HasBranchScope trait)
        $visitBase = Visit::whereBetween('scheduled_date', [$dateFromStr, $dateToStr]);
        $this->applyVisitFilters($visitBase, $visitTypeFilter, $statusFilter, $inmateSearch);
        $visitTypeDistribution = [
            'physical' => (clone $visitBase)->where('visit_type', VisitType::Physical)->count(),
            'virtual' => (clone $visitBase)->where('visit_type', VisitType::Virtual)->count(),
        ];

        // Monitoring sessions (branch-scoped through visits)
        $monitoringSessions = MonitoringSession::whereHas('visit', fn($q) => $q->whereHas('jail', fn($jq) => $jq->where('branch_id', $branch->id)))
            ->whereBetween('created_at', [$dateFrom, $dateTo]);

        // Incidents (branch-scoped)
        $incidentReportsData = $this->getIncidentReportsSummary($dateFrom, $dateTo, $branch->id);

        // Chat flags (branch-scoped via visit sessions)
        $flaggedMessagesData = $this->getFlaggedChatMessagesOverTime($dateFrom, $dateTo, $branch->id);

        // Overview Statistics
        $overviewStats = [
            'total_dormitories' => $branch->dormitories()->count(),
            'total_annexes' => $branch->annexes()->count(),
            'total_cells' => $branch->cells()->count(),
            'total_pdls' => DB::table('cells')
                ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
                ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->sum('cells.capacity'), // Use capacity as total PDLs
            'total_jail_officers' => User::where('role_id', function($query) {
                    $query->select('id')->from('roles')->where('slug', 'jail_officer');
                })
                ->where('branch_id', $branch->id)
                ->count(),
            'active_scopes' => JailOfficerScope::whereHas('jailOfficer', fn($q) => $q->where('branch_id', $branch->id))
                ->where('is_active', true)
                ->count(),
        ];

        // Get all dormitories with their annexes and cells (branch-scoped through jails)
        $dormitories = Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->where('jails.branch_id', $branch->id)
            ->with(['annex.cells.inmates'])
            ->get()
            ->map(function ($dorm) {
                return [
                    'id' => $dorm->id,
                    'name' => $dorm->name,
                    'type' => $dorm->type,
                    'capacity' => $dorm->annex->cells->sum('capacity'),
                    'annex' => [
                        'id' => $dorm->annex->id,
                        'name' => $dorm->annex->name,
                        'cells' => $dorm->annex->cells->map(function ($cell) {
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
                    ],
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

        // Get facilities data for scope assignment dropdowns (branch-scoped through jails)
        $facilities = [
            'annexes' => Annex::join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->select('annexes.*')
                ->with(['dormitories'])
                ->get()
                ->map(fn($a) => ['id' => $a->id, 'name' => $a->name, 'dormitories' => $a->dormitories->map(fn($d) => ['id' => $d->id, 'name' => $d->name])]),
            
            'dormitories' => Dormitory::join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
                ->join('jails', 'annexes.jail_id', '=', 'jails.id')
                ->where('jails.branch_id', $branch->id)
                ->select('dormitories.*')
                ->get()
                ->map(fn($d) => ['id' => $d->id, 'name' => $d->name]),
            
            'cells' => Cell::whereHas('dormitory.annex.jail', fn($q) => $q->where('branch_id', $branch->id))
                ->with(['dormitory.annex'])
                ->get()
                ->map(fn($c) => [
                    'id' => $c->id,
                    'cell_number' => $c->cell_number,
                    'dormitory' => $c->dormitory ? ['id' => $c->dormitory->id, 'name' => $c->dormitory->name] : null,
                    'annex' => $c->dormitory?->annex ? ['id' => $c->dormitory->annex->id, 'name' => $c->dormitory->annex->name] : null,
                ]),
        ];

        return Inertia::render('JailWarden/Dashboard', [
            'filters' => [
                'date_preset' => $request->input('date_preset', 'last_30_days'),
                'date_from' => $dateFromStr,
                'date_to' => $dateToStr,
                'time_grouping' => $timeGrouping,
                'visit_type' => $visitTypeFilter,
                'status' => $statusFilter,
                'recording_compliance' => $recordingFilter,
                'violation' => $violationFilter,
                'inmate' => $inmateSearch,
            ],
            'stats' => [
                'total_users' => $totalUsers,
                'pending_users' => $pendingUsers,
                'approved_users' => $approvedUsers,
                'rejected_users' => $rejectedUsers,
            ],
            'recent_users' => $recentUsers,
            'users_by_role' => $usersByRole,
            'appeals_stats' => $appealsStats,
            'suggestions_stats' => $suggestionsStats,
            'eburol_stats' => $eburolStats,
            'visit_type_distribution' => $visitTypeDistribution,
            'incident_reports_summary' => $incidentReportsData,
            'flagged_messages_over_time' => $flaggedMessagesData,
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

    /**
     * Resolve date range from preset or custom inputs.
     */
    private function resolveDateRange(Request $request): array
    {
        $preset = $request->input('date_preset', 'last_30_days');
        $from = $request->input('date_from');
        $to = $request->input('date_to');
        if ($from && $to && $preset === 'custom') {
            $start = Carbon::parse($from)->startOfDay();
            $end = Carbon::parse($to)->endOfDay();
            return [$start, $end];
        }
        $end = Carbon::now()->endOfDay();
        $start = match ($preset) {
            'today' => Carbon::now()->startOfDay(),
            'yesterday' => Carbon::yesterday()->startOfDay(),
            'last_7_days' => Carbon::now()->subDays(6)->startOfDay(),
            'last_30_days' => Carbon::now()->subDays(29)->startOfDay(),
            'this_month' => Carbon::now()->startOfMonth(),
            'last_month' => Carbon::now()->subMonth()->startOfMonth(),
            'this_year' => Carbon::now()->startOfYear(),
            default => Carbon::now()->subDays(29)->startOfDay(),
        };
        if ($preset === 'yesterday') {
            $end = Carbon::yesterday()->endOfDay();
        } elseif ($preset === 'last_month') {
            $end = Carbon::now()->subMonth()->endOfMonth();
        }
        return [$start, $end];
    }

    /**
     * Apply visit filters to a query builder.
     */
    private function applyVisitFilters($query, ?string $visitType, ?string $status, ?string $inmateSearch): void
    {
        if ($visitType && $visitType !== 'all' && in_array($visitType, ['virtual', 'physical'], true)) {
            $query->where('visit_type', $visitType);
        }
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($inmateSearch) {
            $query->where(function ($q) use ($inmateSearch) {
                $q->where('inmate_first_name', 'like', "%{$inmateSearch}%")
                    ->orWhere('inmate_last_name', 'like', "%{$inmateSearch}%");
            });
        }
    }

    /**
     * Get incident reports summary (branch-scoped through monitoring sessions).
     */
    private function getIncidentReportsSummary(Carbon $dateFrom, Carbon $dateTo, int $branchId): array
    {
        $incidents = Incident::select('classification', DB::raw('count(*) as count'))
            ->whereHas('monitoringSession.visit.jail', fn($q) => $q->where('branch_id', $branchId))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->groupBy('classification')
            ->get()
            ->pluck('count', 'classification')
            ->toArray();

        return [
            'minor' => $incidents['minor'] ?? 0,
            'major' => $incidents['major'] ?? 0,
            'critical' => $incidents['critical'] ?? 0,
        ];
    }

    /**
     * Get flagged chat messages over time (branch-scoped).
     */
    private function getFlaggedChatMessagesOverTime(Carbon $startDate, Carbon $endDate, int $branchId): array
    {
        $flags = ChatFlag::whereHas('chatMessage.monitoringSession.visit.jail', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get()
            ->groupBy(fn ($flag) => $flag->created_at->format('Y-m-d'));

        $data = [];
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $dateKey = $currentDate->format('Y-m-d');
            $data[] = [
                'date' => $currentDate->format('M d'),
                'count' => $flags->get($dateKey, collect())->count(),
            ];
            $currentDate->addDay();
        }

        return $data;
    }
}
