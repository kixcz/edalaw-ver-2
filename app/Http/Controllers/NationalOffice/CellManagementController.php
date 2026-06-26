<?php

namespace App\Http\Controllers\NationalOffice;

use App\Models\Cell;
use App\Models\Dormitory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CellManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $cells = $this->paginated(
            $request,
            $this->search(
                $request,
                Cell::query()->select(['id', 'dormitory_id', 'cell_number', 'capacity', 'status', 'created_at'])->with(['dormitory:id,annex_id,name,type', 'dormitory.annex:id,jail_id,name', 'dormitory.annex.jail:id,branch_id,name,code', 'dormitory.annex.jail.branch:id,region_id,name,code', 'dormitory.annex.jail.branch.region:id,name,code'])->withCount(['inmates as pdls_count'])->orderBy('cell_number'),
                ['cell_number', 'status']
            )
        )->through(function (Cell $cell) {
            $dormitory = $cell->dormitory;
            $annex = $dormitory?->annex;
            $jail = $annex?->jail;
            $branch = $jail?->branch;
            $region = $branch?->region;

            return [
                'id' => $cell->id,
                'dormitory_id' => $cell->dormitory_id,
                'cell_number' => $cell->cell_number,
                'capacity' => $cell->capacity,
                'status' => $cell->status,
                'occupancy' => $cell->pdls_count,
                'available_capacity' => max(0, (int) $cell->capacity - (int) $cell->pdls_count),
                'dormitory' => $dormitory ? ['id' => $dormitory->id, 'name' => $dormitory->name, 'type' => $dormitory->type] : null,
                'annex' => $annex ? ['id' => $annex->id, 'name' => $annex->name] : null,
                'jail' => $jail ? ['id' => $jail->id, 'name' => $jail->name, 'code' => $jail->code] : null,
                'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code] : null,
                'region' => $region ? ['id' => $region->id, 'name' => $region->name, 'code' => $region->code] : null,
                'created_at' => $cell->created_at?->format('Y-m-d'),
            ];
        });

        return Inertia::render('NationalOffice/Cells/Index', [
            'records' => $cells,
            'dormitories' => Dormitory::active()->with('annex:id,name')->orderBy('name')->get(['id', 'annex_id', 'name', 'type'])->map(fn ($dormitory) => ['id' => $dormitory->id, 'name' => $dormitory->name, 'label' => $dormitory->annex ? "{$dormitory->name} ({$dormitory->annex->name})" : $dormitory->name]),
            'analytics' => [
                'cards' => [
                    ['label' => 'Cells', 'value' => Cell::count(), 'detail' => 'Housing cells'],
                    ['label' => 'Active Cells', 'value' => Cell::where('status', 'active')->count(), 'detail' => 'Available for PDL assignment'],
                    ['label' => 'Total Capacity', 'value' => Cell::sum('capacity'), 'detail' => 'Configured capacity'],
                    ['label' => 'Current Occupancy', 'value' => DB::table('inmates')->count(), 'detail' => 'Assigned PDL records'],
                ],
                'charts' => [
                    'occupancy_by_cell' => DB::table('cells')->leftJoin('inmates', 'cells.id', '=', 'inmates.cell_id')->select('cells.cell_number as name', DB::raw('COUNT(inmates.id) as count'))->groupBy('cells.id', 'cells.cell_number')->orderByDesc('count')->limit(20)->get(),
                    'status_distribution' => $this->statusAnalytics('cells'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Cell::create($this->validated($request));

        return back()->with('success', 'Cell created successfully.');
    }

    public function update(Request $request, Cell $cell): RedirectResponse
    {
        $cell->update($this->validated($request, $cell));

        return back()->with('success', 'Cell updated successfully.');
    }

    public function destroy(Cell $cell): RedirectResponse
    {
        if ($cell->inmates()->exists()) {
            return back()->with('error', 'Cannot delete a cell with existing PDLs.');
        }

        $cell->delete();

        return back()->with('success', 'Cell deleted successfully.');
    }

    private function validated(Request $request, ?Cell $cell = null): array
    {
        return $request->validate([
            'dormitory_id' => ['required', 'exists:dormitories,id'],
            'cell_number' => ['required', 'string', 'max:255', Rule::unique('cells', 'cell_number')->where('dormitory_id', $request->integer('dormitory_id'))->ignore($cell)],
            'capacity' => ['required', 'integer', 'min:1', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }
}
