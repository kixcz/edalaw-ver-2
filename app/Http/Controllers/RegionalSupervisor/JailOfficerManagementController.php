<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Annex;
use App\Models\Branch;
use App\Models\Cell;
use App\Models\Dormitory;
use App\Models\Role;
use App\Models\User;
use App\ApprovalStatus;
use App\Services\PersonnelReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JailOfficerManagementController extends Controller
{
    /**
     * Display jail officers belonging to branches in the regional supervisor's region.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! $user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $regionId = $user->region_id;

        $officers = User::query()
            ->select(['id', 'first_name', 'middle_name', 'last_name', 'email', 'contact_number', 'role_id', 'branch_id', 'region_id', 'approval_status', 'email_verified_at', 'status', 'last_seen_at', 'created_at'])
            ->whereHas('role', fn ($query) => $query->where('slug', 'jail_officer'))
            ->whereHas('branch', fn ($query) => $query->where('region_id', $regionId))
            ->with([
                'role:id,name,slug',
                'branch:id,region_id,name,code',
                'branch.region:id,name,code',
                'assignedScopes' => function ($query) {
                    $query->with(['annex:id,name', 'dormitory:id,name', 'cell:id,cell_number']);
                },
            ])
            ->when($request->input('search'), function ($query, $term) {
                $query->where(function ($q) use ($term) {
                    $q->where('first_name', 'like', "%{$term}%")
                        ->orWhere('middle_name', 'like', "%{$term}%")
                        ->orWhere('last_name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('approval_status', 'like', "%{$term}%")
                        ->orWhere('status', 'like', "%{$term}%");
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(15)
            ->withQueryString()
            ->through(function (User $officer) {
                $isInactive = strtolower((string) $officer->status) === 'inactive';
                $lastSeen = $officer->last_seen_at;
                $isOnline = ! $isInactive && $lastSeen && $lastSeen->gt(now()->subMinutes(5));

                $activeStatus = $isInactive
                    ? 'Inactive'
                    : ($isOnline ? 'Online' : 'Active');

                return [
                    'id' => $officer->id,
                    'first_name' => $officer->first_name,
                    'middle_name' => $officer->middle_name,
                    'last_name' => $officer->last_name,
                    'name' => $officer->full_name,
                    'email' => $officer->email,
                    'contact_number' => $officer->contact_number,
                    'role_id' => $officer->role_id,
                    'role' => $officer->role ? ['id' => $officer->role->id, 'name' => $officer->role->name, 'slug' => $officer->role->slug] : null,
                    'branch_id' => $officer->branch_id,
                    'branch' => $officer->branch ? ['id' => $officer->branch->id, 'name' => $officer->branch->name, 'code' => $officer->branch->code] : null,
                    'approval_status' => $officer->approval_status?->value ?? $officer->approval_status,
                    'status' => $officer->status,
                    'active_status' => $activeStatus,
                    'email_verified_at' => $officer->email_verified_at?->format('Y-m-d H:i'),
                    'scopes' => $officer->assignedScopes->map(function ($scope) {
                        $description = match ($scope->scope_type) {
                            'annex', 'building' => $scope->annex?->name ?? 'Unknown',
                            'dormitory' => $scope->dormitory?->name ?? 'Unknown',
                            'cell' => $scope->cell?->cell_number ?? 'Unknown',
                            default => 'Unknown',
                        };

                        return [
                            'id' => $scope->id,
                            'scope_type' => $scope->scope_type,
                            'description' => $description,
                            'is_active' => (bool) $scope->is_active,
                        ];
                    })->values(),
                    'created_at' => $officer->created_at?->format('Y-m-d'),
                ];
            });

        $branches = Branch::where('region_id', $regionId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'region_id', 'name', 'code'])
            ->map(fn ($branch) => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code]);

        $branchIds = Branch::where('region_id', $regionId)->pluck('id');

        // Facility dropdowns scoped to region via branch
        $facilities = [
            'annexes' => Annex::whereIn('jail_id', function ($query) use ($branchIds) {
                $query->select('id')->from('jails')->whereIn('branch_id', $branchIds);
            })->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'dormitories' => Dormitory::whereIn('annex_id', function ($query) use ($branchIds) {
                $query->select('annexes.id')->from('annexes')->join('jails', 'annexes.jail_id', '=', 'jails.id')->whereIn('jails.branch_id', $branchIds);
            })->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'cells' => Cell::whereIn('dormitory_id', function ($query) use ($branchIds) {
                $query->select('dormitories.id')->from('dormitories')->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')->join('jails', 'annexes.jail_id', '=', 'jails.id')->whereIn('jails.branch_id', $branchIds);
            })->where('status', 'active')->orderBy('cell_number')->get(['id', 'cell_number']),
        ];

        $analytics = app(PersonnelReportService::class)
            ->build($regionId, 'jail_officer', 'Jail Officer');

        return Inertia::render('RegionalSupervisor/JailOfficerManagement/Index', [
            'records' => $officers,
            'branches' => $branches,
            'facilities' => $facilities,
            'analytics' => $analytics,
            'filters' => ['search' => (string) $request->input('search', '')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $this->validated($request, $user);

        $validated['role_id'] = Role::where('slug', 'jail_officer')->value('id');
        $validated['email_verified_at'] = $validated['approval_status'] === ApprovalStatus::Approved->value ? now() : null;
        $branch = Branch::findOrFail($validated['branch_id']);
        $validated['region_id'] = $branch->region_id;

        User::create($validated);

        return back()->with('success', 'Jail Officer account created successfully.');
    }

    public function update(Request $request, User $officer): RedirectResponse
    {
        $user = $request->user();
        $validated = $this->validated($request, $user, $officer);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        if ($validated['approval_status'] === ApprovalStatus::Approved->value && ! $officer->email_verified_at) {
            $validated['email_verified_at'] = now();
        }

        $branch = Branch::findOrFail($validated['branch_id']);
        $validated['region_id'] = $branch->region_id;

        $officer->update($validated);

        return back()->with('success', 'Jail Officer account updated successfully.');
    }

    public function destroy(Request $request, User $officer): RedirectResponse
    {
        $user = $request->user();
        if (! $officer->branch || $officer->branch->region_id !== $user->region_id) {
            abort(403, 'You can only delete officers within your region.');
        }

        $officer->delete();

        return back()->with('success', 'Jail Officer account deleted successfully.');
    }

    private function validated(Request $request, User $user, ?User $officer = null): array
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($officer)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'branch_id' => ['required', 'exists:branches,id'],
            'approval_status' => ['required', Rule::in([ApprovalStatus::Pending->value, ApprovalStatus::Approved->value, ApprovalStatus::Rejected->value])],
            'password' => [$officer ? 'nullable' : 'required', 'string', 'min:8'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        if ($branch->region_id !== $user->region_id) {
            abort(422, 'You can only assign officers to branches within your region.');
        }

        return $validated;
    }
}