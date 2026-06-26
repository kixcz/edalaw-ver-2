<?php

namespace App\Http\Controllers\NationalOffice;

use App\Models\Annex;
use App\Models\Dormitory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DormitoryManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $dormitories = $this->paginated(
            $request,
            $this->search(
                $request,
                Dormitory::query()->select(['id', 'annex_id', 'name', 'type', 'description', 'status', 'created_at'])->with(['annex:id,jail_id,name', 'annex.jail:id,branch_id,name,code', 'annex.jail.branch:id,region_id,name,code', 'annex.jail.branch.region:id,name,code'])->withCount('cells')->orderBy('name'),
                ['name', 'type', 'status']
            )
        )->through(fn (Dormitory $dormitory) => [
            'id' => $dormitory->id,
            'annex_id' => $dormitory->annex_id,
            'name' => $dormitory->name,
            'type' => $dormitory->type,
            'description' => $dormitory->description,
            'status' => $dormitory->status,
            'annex' => $dormitory->annex ? ['id' => $dormitory->annex->id, 'name' => $dormitory->annex->name] : null,
            'jail' => $dormitory->annex?->jail ? ['id' => $dormitory->annex->jail->id, 'name' => $dormitory->annex->jail->name, 'code' => $dormitory->annex->jail->code] : null,
            'branch' => $dormitory->annex?->jail?->branch ? ['id' => $dormitory->annex->jail->branch->id, 'name' => $dormitory->annex->jail->branch->name, 'code' => $dormitory->annex->jail->branch->code] : null,
            'region' => $dormitory->annex?->jail?->branch?->region ? ['id' => $dormitory->annex->jail->branch->region->id, 'name' => $dormitory->annex->jail->branch->region->name, 'code' => $dormitory->annex->jail->branch->region->code] : null,
            'cells_count' => $dormitory->cells_count,
            'pdls_count' => $dormitory->cells()->withCount('inmates')->get()->sum('inmates_count'),
            'created_at' => $dormitory->created_at?->format('Y-m-d'),
        ]);

        return Inertia::render('NationalOffice/Dormitories/Index', [
            'records' => $dormitories,
            'annexes' => Annex::active()->with('jail:id,name,code')->orderBy('name')->get(['id', 'jail_id', 'name'])->map(fn ($annex) => ['id' => $annex->id, 'name' => $annex->name, 'label' => $annex->jail ? "{$annex->name} ({$annex->jail->code})" : $annex->name]),
            'analytics' => [
                'cards' => [
                    ['label' => 'Dormitories', 'value' => Dormitory::count(), 'detail' => 'Housing units'],
                    ['label' => 'Active Dormitories', 'value' => Dormitory::where('status', 'active')->count(), 'detail' => 'Available for cells'],
                    ['label' => 'Cells', 'value' => DB::table('cells')->count(), 'detail' => 'Assigned cells'],
                    ['label' => 'PDLs', 'value' => DB::table('inmates')->count(), 'detail' => 'Assigned residents'],
                ],
                'charts' => [
                    'cells_per_dormitory' => DB::table('dormitories')->leftJoin('cells', 'dormitories.id', '=', 'cells.dormitory_id')->select('dormitories.name', DB::raw('COUNT(cells.id) as count'))->groupBy('dormitories.name')->orderByDesc('count')->limit(20)->get(),
                    'status_distribution' => $this->statusAnalytics('dormitories'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Dormitory::create($this->validated($request));

        return back()->with('success', 'Dormitory created successfully.');
    }

    public function update(Request $request, Dormitory $dormitory): RedirectResponse
    {
        $dormitory->update($this->validated($request, $dormitory));

        return back()->with('success', 'Dormitory updated successfully.');
    }

    public function destroy(Dormitory $dormitory): RedirectResponse
    {
        if ($dormitory->cells()->exists()) {
            return back()->with('error', 'Cannot delete a dormitory with existing cells.');
        }

        $dormitory->delete();

        return back()->with('success', 'Dormitory deleted successfully.');
    }

    private function validated(Request $request, ?Dormitory $dormitory = null): array
    {
        return $request->validate([
            'annex_id' => ['required', 'exists:annexes,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('dormitories', 'name')->where('annex_id', $request->integer('annex_id'))->ignore($dormitory)],
            'type' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }
}
