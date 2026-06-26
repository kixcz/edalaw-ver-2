<?php

namespace App\Http\Controllers\NationalOffice;

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

class BranchManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $branches = $this->paginated(
            $request,
            $this->search(
                $request,
                Branch::query()->select(['id', 'region_id', 'name', 'code', 'description', 'status', 'created_at'])->with(['region:id,name,code', 'jailWarden:id,branch_id,first_name,middle_name,last_name,email'])->withCount('jails')->orderBy('name'),
                ['name', 'code', 'status']
            )
        )->through(fn (Branch $branch) => [
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
        ]);

        return Inertia::render('NationalOffice/Branches/Index', [
            'records' => $branches,
            'regions' => Region::active()->orderBy('name')->get(['id', 'name', 'code']),
            'analytics' => [
                'cards' => [
                    ['label' => 'Branches', 'value' => Branch::count(), 'detail' => 'BJMP operating branches'],
                    ['label' => 'Active Branches', 'value' => Branch::where('status', 'active')->count(), 'detail' => 'Available for assignment'],
                    ['label' => 'Jails', 'value' => Jail::count(), 'detail' => 'Facilities under branches'],
                    ['label' => 'Jail Wardens', 'value' => $this->wardenCount(), 'detail' => 'Assigned branch administrators'],
                ],
                'charts' => [
                    'branches_by_region' => Region::withCount('branches')->orderByDesc('branches_count')->limit(20)->get(['id', 'name'])->map(fn ($region) => ['name' => $region->name, 'count' => $region->branches_count]),
                    'status_distribution' => $this->statusAnalytics('branches'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Branch::create($this->validated($request));

        return back()->with('success', 'Branch created successfully.');
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $branch->update($this->validated($request, $branch));

        return back()->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        if ($branch->jails()->exists() || $branch->users()->exists()) {
            return back()->with('error', 'Cannot delete a branch with existing jails or assigned users.');
        }

        $branch->delete();

        return back()->with('success', 'Branch deleted successfully.');
    }

    private function validated(Request $request, ?Branch $branch = null): array
    {
        return $request->validate([
            'region_id' => ['required', 'exists:regions,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('branches', 'name')->ignore($branch)],
            'code' => ['required', 'string', 'max:50', Rule::unique('branches', 'code')->ignore($branch)],
            'description' => ['nullable', 'string'],
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

    private function wardenCount(): int
    {
        return User::whereHas('role', fn ($query) => $query->where('slug', 'jail_warden'))->count();
    }
}
