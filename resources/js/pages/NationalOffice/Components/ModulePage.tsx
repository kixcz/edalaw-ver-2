import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import type { ElementType } from 'react';
import { useState, useRef } from 'react';
import { AnalyticsCards } from './AnalyticsCards';
import { CrudDialog, type FormField } from './CrudDialog';
import { DataTable, type Column, type RecordRow } from './DataTable';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ModuleHeader } from './ModuleHeader';
import { Plus, Search, X, SlidersHorizontal, List, BarChart3 } from 'lucide-react';

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
    /**
     * When true, analytics renders as a separate "Reports & Analytics" tab
     * alongside the default "Records" tab. Useful for management modules
     * that want to distinguish data entry from reporting views.
     */
    showReportsTab?: boolean;
    /**
     * Optional description shown in the Reports & Analytics tab header.
     * Defaults to a generic message when not provided.
     */
    reportsDescription?: string;
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
    icon: Icon,
    softDeleteLabel,
    showReportsTab = false,
    reportsDescription,
}: ModulePageProps) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<RecordRow | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'records' | 'reports'>('records');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const applySearch = () => {
        router.get(routeBase, { search }, { preserveState: true, preserveScroll: true });
    };

    const clearSearch = () => {
        setSearch('');
        router.get(routeBase, { search: '' }, { preserveState: true, preserveScroll: true });
    };

    const openCreate = () => {
        setEditingRecord(null);
        setFormOpen(true);
    };

    const openEdit = (record: RecordRow) => {
        setEditingRecord(record);
        setFormOpen(true);
    };

    const hasAnalytics = Boolean(
        analytics?.cards?.length || (analytics?.charts && Object.keys(analytics.charts).length > 0)
    );
    const totalRecords = records.total ?? records.data.length;

    // When the tabbed layout is enabled but no analytics exist, fall back to records view
    const useTabbedLayout = showReportsTab && hasAnalytics;

    // Registry panel (header + search + table) — shared by both layouts
    const renderRegistryPanel = () => (
        <>
            {/* Panel Header */}
            <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-orange-500 shrink-0" />
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">{entityName} Registry</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {totalRecords > 0
                                ? `${totalRecords.toLocaleString()} record${totalRecords !== 1 ? 's' : ''} found`
                                : 'No records yet'}
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder={`Search ${entityName.toLowerCase()}s…`}
                            className="h-9 w-full sm:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                        />
                        {search && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={applySearch}
                        className="h-9 px-4 text-sm border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
                    >
                        Search
                    </Button>
                </div>
            </div>

            {/* Data Table — rendered inside the panel, no extra card wrapper */}
            <DataTable
                title={`${entityName} Management`}
                description={description}
                records={records}
                columns={columns}
                onEdit={openEdit}
                onDelete={setDeletingRecord}
            />
        </>
    );

    return (
        <AppLayout breadcrumbs={[{ title, href: routeBase }]}>
            <Head title={title} />

            <div className="flex h-full flex-1 flex-col overflow-x-auto bg-slate-50">

                {/* Page Header — orange accent bar on the left, clean white bg */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            {Icon && (
                                <div className="shrink-0 p-2.5 rounded-xl bg-orange-500 shadow-sm shadow-orange-200">
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">{title}</h1>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
                            </div>
                        </div>

                        <Button
                            onClick={openCreate}
                            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200 gap-1.5 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add {entityName}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-5 p-6">

                    {useTabbedLayout ? (
                        /* Tabbed layout: Records ↔ Reports & Analytics */
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => setActiveTab(value as 'records' | 'reports')}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                                    <TabsTrigger
                                        value="records"
                                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all inline-flex items-center"
                                    >
                                        <List className="w-4 h-4" />
                                        Records
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reports"
                                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all inline-flex items-center"
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        Reports & Analytics
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="records" className="mt-0 focus-visible:outline-none">
                                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    {renderRegistryPanel()}
                                </div>
                            </TabsContent>

                            <TabsContent value="reports" className="mt-0 focus-visible:outline-none space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                                        <div className="w-1 h-8 rounded-full bg-orange-500 shrink-0" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-800">Reports & Analytics</h2>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {reportsDescription ?? `Aggregated metrics and distribution for ${entityName.toLowerCase()}s in your scope.`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <AnalyticsCards
                                            cards={analytics?.cards}
                                            charts={analytics?.charts}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        /* Default layout: analytics on top, registry below */
                        <>
                            {hasAnalytics && (
                                <div className="space-y-4">
                                    <AnalyticsCards
                                        cards={analytics?.cards}
                                        charts={analytics?.charts}
                                    />
                                </div>
                            )}

                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                {renderRegistryPanel()}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dialogs */}
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
        </AppLayout>
    );
}
