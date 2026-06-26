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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Link } from '@inertiajs/react';
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
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEdit(row)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        onDelete(row)
                                                    }
                                                >
                                                    Delete
                                                </Button>
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
