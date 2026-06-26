<?php

namespace App\Http\Controllers\NationalOffice;

use App\Models\Annex;
use App\Models\Jail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnnexManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $annexes = $this->paginated(
            $request,
            $this->search(
                $request,
                Annex::query()->select(['id', 'jail_id', 'name', 'description', 'status', 'created_at'])->with(['jail:id,branch_id,name,code', 'jail.branch:id,region_id,name,code', 'jail.branch.region:id,name,code'])->withCount('dormitories')->orderBy('name'),
                ['name', 'status']
            )
        )->through(fn (Annex $annex) => [
            'id' => $annex->id,
            'jail_id' => $annex->jail_id,
            'name' => $annex->name,
            'description' => $annex->description,
            'status' => $annex->status,
            'jail' => $annex->jail ? ['id' => $annex->jail->id, 'name' => $annex->jail->name, 'code' => $annex->jail->code] : null,
            'branch' => $annex->jail?->branch ? ['id' => $annex->jail->branch->id, 'name' => $annex->jail->branch->name, 'code' => $annex->jail->branch->code] : null,
            'region' => $annex->jail?->branch?->region ? ['id' => $annex->jail->branch->region->id, 'name' => $annex->jail->branch->region->name, 'code' => $annex->jail->branch->region->code] : null,
            'dormitories_count' => $annex->dormitories_count,
            'cells_count' => $annex->cells()->count(),
            'assigned_officers_count' => $annex->jailOfficerScopes()->active()->count(),
            'created_at' => $annex->created_at?->format('Y-m-d'),
        ]);

        return Inertia::render('NationalOffice/Annexes/Index', [
            'records' => $annexes,
            'jails' => Jail::active()->with('branch:id,name,code')->orderBy('name')->get(['id', 'branch_id', 'name', 'code'])->map(fn ($jail) => ['id' => $jail->id, 'name' => $jail->name, 'code' => $jail->code, 'label' => $jail->branch ? "{$jail->name} ({$jail->branch->code})" : $jail->name]),
            'analytics' => [
                'cards' => [
                    ['label' => 'Annexes', 'value' => Annex::count(), 'detail' => 'Buildings under jails'],
                    ['label' => 'Active Annexes', 'value' => Annex::where('status', 'active')->count(), 'detail' => 'Available facilities'],
                    ['label' => 'Dormitories', 'value' => DB::table('dormitories')->count(), 'detail' => 'Under annexes'],
                    ['label' => 'Cells', 'value' => DB::table('cells')->count(), 'detail' => 'Housing cells'],
                ],
                'charts' => [
                    'annexes_per_branch' => DB::table('branches')->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')->leftJoin('annexes', 'jails.id', '=', 'annexes.jail_id')->select('branches.name', DB::raw('COUNT(annexes.id) as count'))->groupBy('branches.name')->orderByDesc('count')->limit(20)->get(),
                    'status_distribution' => $this->statusAnalytics('annexes'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Annex::create($this->validated($request));

        return back()->with('success', 'Annex created successfully.');
    }

    public function update(Request $request, Annex $annex): RedirectResponse
    {
        $annex->update($this->validated($request, $annex));

        return back()->with('success', 'Annex updated successfully.');
    }

    public function destroy(Annex $annex): RedirectResponse
    {
        if ($annex->dormitories()->exists() || $annex->cells()->exists()) {
            return back()->with('error', 'Cannot delete an annex with existing dormitories or cells.');
        }

        $annex->delete();

        return back()->with('success', 'Annex deleted successfully.');
    }

    private function validated(Request $request, ?Annex $annex = null): array
    {
        return $request->validate([
            'jail_id' => ['required', 'exists:jails,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('annexes', 'name')->where('jail_id', $request->integer('jail_id'))->ignore($annex)],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }
}
