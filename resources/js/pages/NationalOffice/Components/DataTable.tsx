import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { Circle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type RecordRow = { id: number; [key: string]: unknown };

export type Column = {
    key: string;
    label: string;
    align?: 'right';
    render?: (row: RecordRow) => ReactNode;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Paginator = {
    data: RecordRow[];
    from?: number | null;
    to?: number | null;
    total?: number;
    links?: PaginationLink[];
};

type DataTableProps = {
    title: string;
    description: string;
    records: Paginator;
    columns: Column[];
    onEdit: (row: RecordRow) => void;
    onDelete: (row: RecordRow) => void;
};

/**
 * RowActions — three-vertical-dots trigger that opens a small menu with
 * Edit and Delete options. Replaces the old row of two separate buttons.
 */
function RowActions({
    row,
    onEdit,
    onDelete,
}: {
    row: RecordRow;
    onEdit: (row: RecordRow) => void;
    onDelete: (row: RecordRow) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-700 transition-colors"
                    aria-label={`Open actions for record ${row.id}`}
                >
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                    onClick={() => onEdit(row)}
                    className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"
                >
                    <Pencil className="h-4 w-4" />
                    <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => onDelete(row)}
                    className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"
                >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function getValue(row: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value && typeof value === 'object' && key in value) {
            return (value as Record<string, unknown>)[key];
        }

        return undefined;
    }, row);
}

export function displayValue(row: RecordRow, path: string) {
    const value = getValue(row, path);

    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return String(value);
}

export function StatusBadge({ value }: { value: unknown }) {
    const status = String(value || 'unknown');
    const isActive = ['active', 'approved'].includes(status.toLowerCase());

    return <Badge variant={isActive ? 'default' : 'secondary'}>{status}</Badge>;
}

export function ActiveStatusBadge({ value }: { value: unknown }) {
    const state = String(value || 'Unknown');
    const normalized = state.toLowerCase();

    let dotClass = 'fill-slate-300 text-slate-300';
    let pillClass =
        'border-slate-200 bg-slate-50 text-slate-600';

    if (normalized === 'online') {
        dotClass = 'fill-emerald-500 text-emerald-500';
        pillClass = 'border-emerald-200 bg-emerald-50 text-emerald-700';
    } else if (normalized === 'active') {
        dotClass = 'fill-amber-500 text-amber-500';
        pillClass = 'border-amber-200 bg-amber-50 text-amber-700';
    } else if (normalized === 'inactive') {
        dotClass = 'fill-rose-500 text-rose-500';
        pillClass = 'border-rose-200 bg-rose-50 text-rose-700';
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${pillClass}`}
        >
            <Circle className={`h-2 w-2 ${dotClass}`} />
            <span>{state}</span>
        </span>
    );
}

export function DataTable({
    title,
    description,
    records,
    columns,
    onEdit,
    onDelete,
}: DataTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.key}
                                        className={
                                            column.align === 'right'
                                                ? 'text-right'
                                                : undefined
                                        }
                                    >
                                        {column.label}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.data.length > 0 ? (
                                records.data.map((row) => (
                                    <TableRow key={row.id}>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column.key}
                                                className={
                                                    column.align === 'right'
                                                        ? 'text-right'
                                                        : undefined
                                                }
                                            >
                                                {column.render
                                                    ? column.render(row)
                                                    : displayValue(
                                                          row,
                                                          column.key,
                                                      )}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <RowActions
                                                    row={row}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + 1}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        Showing {records.from ?? 0} to {records.to ?? 0} of{' '}
                        {records.total ?? records.data.length} records
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(records.links ?? []).map((link, index) =>
                            link.url ? (
                                <Button
                                    key={`${link.label}-${index}`}
                                    variant={
                                        link.active ? 'default' : 'outline'
                                    }
                                    size="sm"
                                    asChild
                                >
                                    <Link
                                        href={link.url}
                                        preserveScroll
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                </Button>
                            ) : (
                                <Button
                                    key={`${link.label}-${index}`}
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ),
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
