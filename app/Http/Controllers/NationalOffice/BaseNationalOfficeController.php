<?php

namespace App\Http\Controllers\NationalOffice;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

abstract class BaseNationalOfficeController extends Controller
{
    protected int $perPage = 15;

    protected function search(Request $request, Builder $query, array $columns): Builder
    {
        $term = trim((string) $request->input('search', ''));

        if ($term === '') {
            return $query;
        }

        return $query->where(function (Builder $builder) use ($columns, $term) {
            foreach ($columns as $column) {
                $builder->orWhere($column, 'like', "%{$term}%");
            }
        });
    }

    protected function paginated(Request $request, Builder $query): LengthAwarePaginator
    {
        return $query->paginate($this->perPage)->withQueryString();
    }

    protected function statusAnalytics(string $table): array
    {
        return DB::table($table)
            ->select('status as name', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(fn ($item) => ['name' => ucfirst((string) $item->name), 'count' => (int) $item->count])
            ->values()
            ->all();
    }

    protected function filters(Request $request): array
    {
        return [
            'search' => (string) $request->input('search', ''),
        ];
    }
}
