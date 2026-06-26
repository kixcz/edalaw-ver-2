<?php

namespace App\Http\Controllers\NationalOffice;

use App\Models\Branch;
use App\Models\Inmate;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RegionManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $regions = $this->paginated(
            $request,
            $this->search(
                $request,
                Region::query()->select(['id', 'name', 'code', 'description', 'status', 'created_at'])->withCount('branches')->orderBy('name'),
                ['name', 'code', 'status']
            )
        )->through(fn (Region $region) => [
            'id' => $region->id,
            'name' => $region->name,
            'code' => $region->code,
            'description' => $region->description,
            'status' => $region->status,
            'branches_count' => $region->branches_count,
            'jails_count' => $this->jailCount($region->id),
            'officers_count' => $this->officerCount($region->id),
            'pdls_count' => $this->pdlCount($region->id),
            'created_at' => $region->created_at?->format('Y-m-d'),
        ]);

        return Inertia::render('NationalOffice/Regions/Index', [
            'records' => $regions,
            'analytics' => [
                'cards' => [
                    ['label' => 'Regions', 'value' => Region::count(), 'detail' => 'National coverage areas'],
                    ['label' => 'Branches', 'value' => Branch::count(), 'detail' => 'Tagged to regions'],
                    ['label' => 'Regional Supervisors', 'value' => $this->regionalSupervisorCount(), 'detail' => 'Accounts with region scope'],
                    ['label' => 'PDLs', 'value' => Inmate::count(), 'detail' => 'Across all regions'],
                ],
                'charts' => [
                    'branches_per_region' => Region::withCount('branches')->orderByDesc('branches_count')->limit(20)->get(['id', 'name'])->map(fn ($region) => ['name' => $region->name, 'count' => $region->branches_count]),
                    'status_distribution' => $this->statusAnalytics('regions'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Region::create($this->validated($request));

        return back()->with('success', 'Region created successfully.');
    }

    public function update(Request $request, Region $region): RedirectResponse
    {
        $region->update($this->validated($request, $region));

        return back()->with('success', 'Region updated successfully.');
    }

    public function destroy(Region $region): RedirectResponse
    {
        if ($region->branches()->exists()) {
            return back()->with('error', 'Cannot delete a region with existing branches.');
        }

        $region->delete();

        return back()->with('success', 'Region deleted successfully.');
    }

    private function validated(Request $request, ?Region $region = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('regions', 'name')->ignore($region)],
            'code' => ['required', 'string', 'max:50', Rule::unique('regions', 'code')->ignore($region)],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    private function jailCount(int $regionId): int
    {
        return DB::table('jails')->join('branches', 'jails.branch_id', '=', 'branches.id')->where('branches.region_id', $regionId)->count();
    }

    private function officerCount(int $regionId): int
    {
        return User::where('region_id', $regionId)->orWhereHas('branch', fn ($query) => $query->where('region_id', $regionId))->count();
    }

    private function pdlCount(int $regionId): int
    {
        return DB::table('inmates')
            ->join('cells', 'inmates.cell_id', '=', 'cells.id')
            ->join('dormitories', 'cells.dormitory_id', '=', 'dormitories.id')
            ->join('annexes', 'dormitories.annex_id', '=', 'annexes.id')
            ->join('jails', 'annexes.jail_id', '=', 'jails.id')
            ->join('branches', 'jails.branch_id', '=', 'branches.id')
            ->where('branches.region_id', $regionId)
            ->count();
    }

    private function regionalSupervisorCount(): int
    {
        return User::whereHas('role', fn ($query) => $query->where('slug', 'regional_supervisor'))->count();
    }
}
