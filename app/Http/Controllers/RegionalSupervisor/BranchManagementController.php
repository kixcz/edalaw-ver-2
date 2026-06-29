<?php

namespace App\Http\Controllers\RegionalSupervisor;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Jail;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BranchManagementController extends Controller
{
    /**
     * Display branches within the regional supervisor's region.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (! $user->region_id) {
            abort(403, 'Regional Supervisor must be assigned to a region.');
        }

        $regionId = $user->region_id;

        $branches = Branch::query()
            ->select(['id', 'region_id', 'name', 'code', 'description', 'status', 'created_at'])
            ->where('region_id', $regionId)
            ->with(['region:id,name,code', 'jailWarden:id,branch_id,first_name,middle_name,last_name,email'])
            ->withCount('jails')
            ->when($request->input('search'), function ($query, $term) {
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%")
                        ->orWhere('status', 'like', "%{$term}%");
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Branch $branch) {
                return [
                    'id' => $branch->id,
                    'region_id' => $branch->region_id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'description' => $branch->description,
                    'status' => $branch->status,
                    'region' => $branch->region ? ['id' => $branch->region->id, 'name' => $branch->region->name, 'code' => $branch->region->code] : null,
                    'jail_warden' => $branch->jailWarden ? ['id' => $branch->jailWarden->id, 'name' => $branch->jailWarden->full_name, 'email' => $branch->jailWarden->email] : null,
                    'jails_count' => $branch->jails_count,
                    'annexes_count' => $this->annexCount($branch->id),
                    'dormitories_count' => $this->dormitoryCount($branch->id),
                    'cells_count' => $this->cellCount($branch->id),
                    'pdls_count' => $this->pdlCount($branch->id),
                    'created_at' => $branch->created_at?->format('Y-m-d'),
                ];
            });

        return Inertia::render('RegionalSupervisor/BranchManagement/Index', [
            'records' => $branches,
            'analytics' => [
                'cards' => [
                    ['label' => 'Branches', 'value' => Branch::where('region_id', $regionId)->count(), 'detail' => 'BJMP operating branches in your region'],
                    ['label' => 'Active', 'value' => Branch::where('region_id', $regionId)->where('status', 'active')->count(), 'detail' => 'Branches accepting assignment'],
                    ['label' => 'Jails', 'value' => Jail::whereIn('branch_id', Branch::where('region_id', $regionId)->pluck('id'))->count(), 'detail' => 'Facilities under branches'],
                    ['label' => 'Jail Wardens', 'value' => User::whereHas('role', fn ($q) => $q->where('slug', 'jail_warden'))->whereIn('branch_id', Branch::where('region_id', $regionId)->pluck('id'))->count(), 'detail' => 'Assigned branch administrators'],
                ],
                'charts' => [
                    'status_distribution' => DB::table('branches')->where('region_id', $regionId)->select('status as name', DB::raw('COUNT(*) as count'))->groupBy('status')->get()->map(fn ($row) => ['name' => ucfirst((string) $row->name), 'count' => (int) $row->count]),
                ],
            ],
            'filters' => ['search' => (string) $request->input('search', '')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $this->validated($request, $user);

        $validated['region_id'] = $user->region_id;
        Branch::create($validated);

        return back()->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $user = $request->user();
        if ($branch->region_id !== $user->region_id) {
            abort(403, 'You can only edit branches within your region.');
        }

        $validated = $this->validated($request, $user, $branch);
        $branch->update($validated);

        return back()->with('success', 'Branch updated successfully.');
    }

    public function destroy(Request $request, Branch $branch): RedirectResponse
    {
        $user = $request->user();
        if ($branch->region_id !== $user->region_id) {
            abort(403, 'You can only delete branches within your region.');
        }

        if ($branch->jails()->exists() || $branch->users()->exists()) {
            return back()->with('error', 'Cannot delete a branch with existing jails or assigned users.');
        }

        $branch->delete();

        return back()->with('success', 'Branch deleted successfully.');
    }

    private function validated(Request $request, User $user, ?Branch $branch = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('branches', 'name')->ignore($branch)->where('region_id', $user->region_id)],
            'code' => ['required', 'string', 'max:50', Rule::unique('branches', 'code')->ignore($branch)],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    private function annexCount(int $branchId): int
    {
        return DB::table('annexes')->join('jails', 'annexes.jail_id', '=', 'jails.id')->where('jails.branch_id', $branchId)->count();
    }

    private function dormitoryCount(int $branchId): int
    {
        return DB::table('dormitories')->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')->join('jails', 'annexes.jail_id', '=', 'jails.id')->where('jails.branch_id', $branchId)->count();
    }

    private function cellCount(int $branchId): int
    {
        return DB::table('cells')->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')->join('jails', 'annexes.jail_id', '=', 'jails.id')->where('jails.branch_id', $branchId)->count();
    }

    private function pdlCount(int $branchId): int
    {
        return DB::table('inmates')->join('cells', 'inmates.cell_id', '=', 'cells.id')->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')->join('jails', 'annexes.jail_id', '=', 'jails.id')->where('jails.branch_id', $branchId)->count();
    }
}