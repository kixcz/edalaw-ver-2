<?php

namespace App\Http\Controllers\NationalOffice;

use App\Models\Cell;
use App\Models\Inmate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PdlManagementController extends BaseNationalOfficeController
{
    public function index(Request $request): Response
    {
        $pdls = $this->paginated(
            $request,
            $this->search(
                $request,
                Inmate::query()->select(['id', 'cell_id', 'inmate_number', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'status', 'created_at'])->with(['cell:id,dormitory_id,cell_number', 'cell.dormitory:id,annex_id,name,type', 'cell.dormitory.annex:id,jail_id,name', 'cell.dormitory.annex.jail:id,branch_id,name,code', 'cell.dormitory.annex.jail.branch:id,region_id,name,code', 'cell.dormitory.annex.jail.branch.region:id,name,code'])->orderBy('last_name')->orderBy('first_name'),
                ['inmate_number', 'first_name', 'middle_name', 'last_name', 'status']
            )
        )->through(function (Inmate $inmate) {
            $cell = $inmate->cell;
            $dormitory = $cell?->dormitory;
            $annex = $dormitory?->annex;
            $jail = $annex?->jail;
            $branch = $jail?->branch;
            $region = $branch?->region;

            return [
                'id' => $inmate->id,
                'cell_id' => $inmate->cell_id,
                'inmate_number' => $inmate->inmate_number,
                'first_name' => $inmate->first_name,
                'middle_name' => $inmate->middle_name,
                'last_name' => $inmate->last_name,
                'name' => $inmate->full_name,
                'date_of_birth' => $inmate->date_of_birth,
                'age' => $inmate->date_of_birth ? now()->diffInYears($inmate->date_of_birth) : null,
                'status' => $inmate->status,
                'cell' => $cell ? ['id' => $cell->id, 'cell_number' => $cell->cell_number] : null,
                'dormitory' => $dormitory ? ['id' => $dormitory->id, 'name' => $dormitory->name, 'type' => $dormitory->type] : null,
                'annex' => $annex ? ['id' => $annex->id, 'name' => $annex->name] : null,
                'jail' => $jail ? ['id' => $jail->id, 'name' => $jail->name, 'code' => $jail->code] : null,
                'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code] : null,
                'region' => $region ? ['id' => $region->id, 'name' => $region->name, 'code' => $region->code] : null,
                'created_at' => $inmate->created_at?->format('Y-m-d'),
            ];
        });

        return Inertia::render('NationalOffice/Pdls/Index', [
            'records' => $pdls,
            'cells' => Cell::active()->with('dormitory:id,name')->orderBy('cell_number')->get(['id', 'dormitory_id', 'cell_number'])->map(fn ($cell) => ['id' => $cell->id, 'cell_number' => $cell->cell_number, 'label' => $cell->dormitory ? "Cell {$cell->cell_number} ({$cell->dormitory->name})" : "Cell {$cell->cell_number}"]),
            'analytics' => [
                'cards' => [
                    ['label' => 'PDLs', 'value' => Inmate::count(), 'detail' => 'Registry records'],
                    ['label' => 'Active PDLs', 'value' => Inmate::where('status', 'active')->count(), 'detail' => 'Currently active'],
                    ['label' => 'Cells Used', 'value' => Inmate::distinct('cell_id')->count('cell_id'), 'detail' => 'With assigned PDLs'],
                    ['label' => 'Capacity', 'value' => Cell::sum('capacity'), 'detail' => 'Total housing capacity'],
                ],
                'charts' => [
                    'pdls_per_branch' => DB::table('branches')->leftJoin('jails', 'branches.id', '=', 'jails.branch_id')->leftJoin('annexes', 'jails.id', '=', 'annexes.jail_id')->leftJoin('dormitories', 'annexes.id', '=', 'dormitories.annex_id')->leftJoin('cells', 'dormitories.id', '=', 'cells.dormitory_id')->leftJoin('inmates', 'cells.id', '=', 'inmates.cell_id')->select('branches.name', DB::raw('COUNT(inmates.id) as count'))->groupBy('branches.name')->orderByDesc('count')->limit(20)->get(),
                    'status_distribution' => $this->statusAnalytics('inmates'),
                ],
            ],
            'filters' => $this->filters($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Inmate::create($this->validated($request));

        return back()->with('success', 'PDL created successfully.');
    }

    public function update(Request $request, Inmate $pdl): RedirectResponse
    {
        $pdl->update($this->validated($request, $pdl));

        return back()->with('success', 'PDL updated successfully.');
    }

    public function destroy(Inmate $pdl): RedirectResponse
    {
        $pdl->update(['status' => 'inactive']);

        return back()->with('success', 'PDL marked inactive successfully.');
    }

    private function validated(Request $request, ?Inmate $pdl = null): array
    {
        return $request->validate([
            'cell_id' => ['required', 'exists:cells,id'],
            'inmate_number' => ['required', 'string', 'max:255', Rule::unique('inmates', 'inmate_number')->ignore($pdl)],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'inactive', 'transferred', 'released'])],
        ]);
    }
}
