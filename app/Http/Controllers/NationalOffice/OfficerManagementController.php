<?php

namespace App\Http\Controllers\NationalOffice;

use App\ApprovalStatus;
use App\Models\Branch;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OfficerManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $officers = $this->paginated(
            $request,
            $this->search(
                $request,
                User::query()
                    ->select(['id', 'first_name', 'middle_name', 'last_name', 'email', 'contact_number', 'role_id', 'branch_id', 'region_id', 'approval_status', 'email_verified_at', 'created_at'])
                    ->whereHas('role', fn ($query) => $query->whereIn('slug', ['national', 'regional_supervisor', 'jail_warden', 'jail_officer', 'bjmp_officer', 'monitoring_officer']))
                    ->with(['role:id,name,slug', 'branch:id,region_id,name,code', 'branch.region:id,name,code'])
                    ->orderBy('last_name')
                    ->orderBy('first_name'),
                ['first_name', 'middle_name', 'last_name', 'email', 'approval_status']
            )
        )->through(function (User $officer) {
            $directRegion = $officer->region_id ? Region::select(['id', 'name', 'code'])->find($officer->region_id) : null;
            $region = $officer->branch?->region ?? $directRegion;

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
                'region_id' => $officer->region_id,
                'branch' => $officer->branch ? ['id' => $officer->branch->id, 'name' => $officer->branch->name, 'code' => $officer->branch->code] : null,
                'region' => $region ? ['id' => $region->id, 'name' => $region->name, 'code' => $region->code] : null,
                'approval_status' => $officer->approval_status?->value ?? $officer->approval_status,
                'email_verified_at' => $officer->email_verified_at?->format('Y-m-d H:i'),
                'scopes' => $officer->role?->slug === 'jail_officer'
                    ? $officer->assignedScopes()->active()->select(['scope_type', 'building_id', 'dormitory_id', 'cell_id'])->limit(5)->get()->map(fn ($scope) => ['scope_type' => $scope->scope_type, 'description' => $scope->scope_description])
                    : [],
                'created_at' => $officer->created_at?->format('Y-m-d'),
            ];
        });

        return Inertia::render('NationalOffice/Officers/Index', [
            'records' => $officers,
            'roles' => Role::whereIn('slug', ['regional_supervisor', 'jail_warden', 'jail_officer', 'bjmp_officer', 'monitoring_officer'])->orderBy('name')->get(['id', 'name', 'slug']),
            'regions' => Region::active()->orderBy('name')->get(['id', 'name', 'code']),
            'branches' => Branch::active()->with('region:id,name,code')->orderBy('name')->get(['id', 'region_id', 'name', 'code'])->map(fn ($branch) => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code, 'region_id' => $branch->region_id, 'label' => $branch->region ? "{$branch->name} ({$branch->region->code})" : $branch->name]),
            'analytics' => [
                'cards' => [
                    ['label' => 'Officers', 'value' => User::whereHas('role', fn ($query) => $query->whereIn('slug', ['regional_supervisor', 'jail_warden', 'jail_officer', 'bjmp_officer', 'monitoring_officer']))->count(), 'detail' => 'National-visible personnel'],
                    ['label' => 'Regional Supervisors', 'value' => $this->roleCount('regional_supervisor'), 'detail' => 'Region-level accounts'],
                    ['label' => 'Jail Wardens', 'value' => $this->roleCount('jail_warden'), 'detail' => 'Branch administrators'],
                    ['label' => 'Jail Officers', 'value' => $this->roleCount('jail_officer'), 'detail' => 'Facility operators'],
                ],
                'charts' => [
                    'officers_by_role' => DB::table('users')->join('roles', 'users.role_id', '=', 'roles.id')->whereIn('roles.slug', ['regional_supervisor', 'jail_warden', 'jail_officer', 'bjmp_officer', 'monitoring_officer'])->select('roles.name', DB::raw('COUNT(*) as count'))->groupBy('roles.name')->orderByDesc('count')->get(),
                    'approval_status' => DB::table('users')->join('roles', 'users.role_id', '=', 'roles.id')->whereIn('roles.slug', ['regional_supervisor', 'jail_warden', 'jail_officer', 'bjmp_officer', 'monitoring_officer'])->select('approval_status as name', DB::raw('COUNT(*) as count'))->groupBy('approval_status')->get(),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);
        $validated['email_verified_at'] = $validated['approval_status'] === ApprovalStatus::Approved->value ? now() : null;

        User::create($validated);

        return back()->with('success', 'Officer account created successfully.');
    }

    public function update(Request $request, User $officer): RedirectResponse
    {
        $validated = $this->validated($request, $officer);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        if ($validated['approval_status'] === ApprovalStatus::Approved->value && ! $officer->email_verified_at) {
            $validated['email_verified_at'] = now();
        }

        $officer->update($validated);

        return back()->with('success', 'Officer account updated successfully.');
    }

    public function destroy(User $officer): RedirectResponse
    {
        if ($officer->role?->slug === 'national') {
            return back()->with('error', 'National Office accounts cannot be removed from this module.');
        }

        $officer->delete();

        return back()->with('success', 'Officer account deleted successfully.');
    }

    private function validated(Request $request, ?User $officer = null): array
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($officer)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'role_id' => ['required', 'exists:roles,id'],
            'region_id' => ['nullable', 'exists:regions,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'approval_status' => ['required', Rule::in([ApprovalStatus::Pending->value, ApprovalStatus::Approved->value, ApprovalStatus::Rejected->value])],
            'password' => [$officer ? 'nullable' : 'required', 'string', 'min:8'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        if (in_array($role->slug, ['jail_warden', 'jail_officer'], true) && empty($validated['branch_id'])) {
            abort(422, 'Jail wardens and jail officers must be assigned to a branch.');
        }

        if ($role->slug === 'regional_supervisor' && empty($validated['region_id'])) {
            abort(422, 'Regional supervisors must be assigned to a region.');
        }

        if (! empty($validated['branch_id'])) {
            $branch = Branch::findOrFail($validated['branch_id']);
            $validated['region_id'] = $branch->region_id;
        }

        return $validated;
    }

    private function roleCount(string $slug): int
    {
        return User::whereHas('role', fn ($query) => $query->where('slug', $slug))->count();
    }
}
