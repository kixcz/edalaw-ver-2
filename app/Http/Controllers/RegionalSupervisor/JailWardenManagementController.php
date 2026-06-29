<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Branch;
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

class JailWardenManagementController extends Controller
{
    /**
     * Display jail wardens belonging to branches in the regional supervisor's region.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! $user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $regionId = $user->region_id;

        $wardens = User::query()
            ->select(['id', 'first_name', 'middle_name', 'last_name', 'email', 'contact_number', 'role_id', 'branch_id', 'region_id', 'approval_status', 'email_verified_at', 'status', 'last_seen_at', 'created_at'])
            ->whereHas('role', fn ($query) => $query->where('slug', 'jail_warden'))
            ->whereHas('branch', fn ($query) => $query->where('region_id', $regionId))
            ->with(['role:id,name,slug', 'branch:id,region_id,name,code', 'branch.region:id,name,code'])
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
            ->through(function (User $warden) {
                $isInactive = strtolower((string) $warden->status) === 'inactive';
                $lastSeen = $warden->last_seen_at;
                $isOnline = ! $isInactive && $lastSeen && $lastSeen->gt(now()->subMinutes(5));

                $activeStatus = $isInactive
                    ? 'Inactive'
                    : ($isOnline ? 'Online' : 'Active');

                return [
                    'id' => $warden->id,
                    'first_name' => $warden->first_name,
                    'middle_name' => $warden->middle_name,
                    'last_name' => $warden->last_name,
                    'name' => $warden->full_name,
                    'email' => $warden->email,
                    'contact_number' => $warden->contact_number,
                    'role_id' => $warden->role_id,
                    'role' => $warden->role ? ['id' => $warden->role->id, 'name' => $warden->role->name, 'slug' => $warden->role->slug] : null,
                    'branch_id' => $warden->branch_id,
                    'branch' => $warden->branch ? ['id' => $warden->branch->id, 'name' => $warden->branch->name, 'code' => $warden->branch->code] : null,
                    'approval_status' => $warden->approval_status?->value ?? $warden->approval_status,
                    'status' => $warden->status,
                    'active_status' => $activeStatus,
                    'email_verified_at' => $warden->email_verified_at?->format('Y-m-d H:i'),
                    'created_at' => $warden->created_at?->format('Y-m-d'),
                ];
            });

        $branches = Branch::where('region_id', $regionId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'region_id', 'name', 'code'])
            ->map(fn ($branch) => ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code]);

        $analytics = app(PersonnelReportService::class)
            ->build($regionId, 'jail_warden', 'Jail Warden');

        return Inertia::render('RegionalSupervisor/JailWardenManagement/Index', [
            'records' => $wardens,
            'branches' => $branches,
            'analytics' => $analytics,
            'filters' => ['search' => (string) $request->input('search', '')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $this->validated($request, $user);

        $validated['role_id'] = Role::where('slug', 'jail_warden')->value('id');
        $validated['email_verified_at'] = $validated['approval_status'] === ApprovalStatus::Approved->value ? now() : null;
        $branch = Branch::findOrFail($validated['branch_id']);
        $validated['region_id'] = $branch->region_id;

        User::create($validated);

        return back()->with('success', 'Jail Warden account created successfully.');
    }

    public function update(Request $request, User $warden): RedirectResponse
    {
        $user = $request->user();
        $validated = $this->validated($request, $user, $warden);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        if ($validated['approval_status'] === ApprovalStatus::Approved->value && ! $warden->email_verified_at) {
            $validated['email_verified_at'] = now();
        }

        $branch = Branch::findOrFail($validated['branch_id']);
        $validated['region_id'] = $branch->region_id;

        $warden->update($validated);

        return back()->with('success', 'Jail Warden account updated successfully.');
    }

    public function destroy(Request $request, User $warden): RedirectResponse
    {
        $user = $request->user();
        if (! $warden->branch || $warden->branch->region_id !== $user->region_id) {
            abort(403, 'You can only delete wardens within your region.');
        }

        $warden->delete();

        return back()->with('success', 'Jail Warden account deleted successfully.');
    }

    private function validated(Request $request, User $user, ?User $warden = null): array
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($warden)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'branch_id' => ['required', 'exists:branches,id'],
            'approval_status' => ['required', Rule::in([ApprovalStatus::Pending->value, ApprovalStatus::Approved->value, ApprovalStatus::Rejected->value])],
            'password' => [$warden ? 'nullable' : 'required', 'string', 'min:8'],
        ]);

        // Regional supervisor can only assign branches within their own region
        $branch = Branch::findOrFail($validated['branch_id']);
        if ($branch->region_id !== $user->region_id) {
            abort(422, 'You can only assign wardens to branches within your region.');
        }

        return $validated;
    }
}