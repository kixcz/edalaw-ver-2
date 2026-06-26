import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import type { ElementType } from 'react';
import { useState } from 'react';
import { AnalyticsCards } from './AnalyticsCards';
import { CrudDialog, type FormField } from './CrudDialog';
import { DataTable, type Column, type RecordRow } from './DataTable';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ModuleHeader } from './ModuleHeader';

type Analytics = {
    cards?: Array<{ label: string; value: number | string; detail?: string }>;
    charts?: Record<string, Array<{ name: string; count: number }>>;
};

type Paginator = {
    data: RecordRow[];
    from?: number | null;
    to?: number | null;
    total?: number;
    links?: Array<{ url: string | null; label: string; active: boolean }>;
};

type ModulePageProps = {
    title: string;
    description: string;
    entityName: string;
    routeBase: string;
    records: Paginator;
    columns: Column[];
    fields: FormField[];
    analytics?: Analytics;
    filters?: { search?: string };
    icon?: ElementType;
    softDeleteLabel?: string;
};

export function ModulePage({
    title,
    description,
    entityName,
    routeBase,
    records,
    columns,
    fields,
    analytics,
    filters,
    icon,
    softDeleteLabel,
}: ModulePageProps) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<RecordRow | null>(
        null,
    );
    const [formOpen, setFormOpen] = useState(false);

    const applySearch = () => {
        router.get(
            routeBase,
            { search },
            { preserveState: true, preserveScroll: true },
        );
    };

    const openCreate = () => {
        setEditingRecord(null);
        setFormOpen(true);
    };

    const openEdit = (record: RecordRow) => {
        setEditingRecord(record);
        setFormOpen(true);
    };

    return (
        <AppLayout breadcrumbs={[{ title, href: routeBase }]}>
            <Head title={title} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                <ModuleHeader
                    title={title}
                    description={description}
                    icon={icon}
                />
                <AnalyticsCards
                    cards={analytics?.cards}
                    charts={analytics?.charts}
                />

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-sm font-medium">
                            {entityName} Registry
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Search, add, edit, and review analytics for this
                            National Office module.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    applySearch();
                                }
                            }}
                            placeholder="Search records..."
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/40 sm:w-72"
                        />
                        <Button variant="outline" onClick={applySearch}>
                            Search
                        </Button>
                        <Button onClick={openCreate}>Add {entityName}</Button>
                    </div>
                </div>

                <DataTable
                    title={`${entityName} Management`}
                    description={description}
                    records={records}
                    columns={columns}
                    onEdit={openEdit}
                    onDelete={setDeletingRecord}
                />

                <CrudDialog
                    open={formOpen}
                    title={entityName}
                    routeBase={routeBase}
                    fields={fields}
                    record={editingRecord}
                    onClose={() => setFormOpen(false)}
                />
                <DeleteConfirmDialog
                    open={Boolean(deletingRecord)}
                    routeBase={routeBase}
                    record={deletingRecord}
                    entityName={entityName}
                    softDeleteLabel={softDeleteLabel}
                    onClose={() => setDeletingRecord(null)}
                />
            </div>
        </AppLayout>
    );
}
