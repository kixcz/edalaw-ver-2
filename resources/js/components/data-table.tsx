import type {
    ColumnDef,
    ColumnFiltersState,
    SortingState} from '@tanstack/react-table';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ReactNode} from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    headerActions?: ReactNode;
    enableGlobalFilter?: boolean;
    globalFilterFn?: (row: any, columnId: string, filterValue: string) => boolean;
    /** Default sort: e.g. [{ id: 'created_at', desc: true }] for latest first */
    initialSorting?: SortingState;
    emptyStateAction?: ReactNode; // Custom action button for empty state
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    headerActions,
    enableGlobalFilter = true,
    globalFilterFn: customGlobalFilterFn,
    initialSorting = [],
    emptyStateAction,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>(initialSorting);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: customGlobalFilterFn || ((row, columnId, filterValue) => {
            if (!enableGlobalFilter || !filterValue) {
                return true;
            }

            // Default search across all values
            const searchValue = filterValue.toLowerCase();
            const searchableValues = Object.values(row.original as Record<string, unknown>)
                .filter((val) => val !== null && val !== undefined)
                .map((val) => String(val).toLowerCase());

            return searchableValues.some((val) => val.includes(searchValue));
        }),
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
            sorting: initialSorting,
        },
    });

    return (
        <div className="space-y-4">
            {/* Header with Search, Filters, and Actions */}
            {(enableGlobalFilter && searchKey) || headerActions ? (
                <div className="flex flex-wrap items-center gap-4">
                    {enableGlobalFilter && searchKey && (
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    )}
                    {headerActions && (
                        <div className="flex flex-wrap items-center gap-2">
                            {headerActions}
                        </div>
                    )}
                </div>
            ) : null}

            {data.length === 0 ? (
                // Empty state - no data at all
                <div className="rounded-md border bg-muted/50 p-8 text-center">
                    <p className="text-muted-foreground mb-4">No data available.</p>
                    {emptyStateAction && (
                        <div className="flex justify-center gap-2">
                            {emptyStateAction}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && 'selected'}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No results found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Pagination - only show if there are rows */}
                    {table.getRowModel().rows.length > 0 && (
                        <div className="flex items-center justify-end space-x-2">
                            <div className="flex-1 text-sm text-muted-foreground">
                                Showing {table.getRowModel().rows.length} of{' '}
                                {data.length} row(s)
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                                    {table.getPageCount()}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

