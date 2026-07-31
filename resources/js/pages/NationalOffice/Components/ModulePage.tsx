import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import type { ElementType } from 'react';
import { useState, useRef } from 'react';
import { AnalyticsCards } from './AnalyticsCards';
import { CrudDialog, type FormField } from './CrudDialog';
import { DataTable, type Column, type RecordRow } from './DataTable';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Plus, Search, X, List, BarChart2, BarChart3, TrendingUp, Users, Database } from 'lucide-react';

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

// KPI card styling cycle — matches the StatCard pattern used across officer/regional dashboards
const KPI_STYLES = [
    { icon: BarChart3, accent: 'bg-primary', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { icon: TrendingUp, accent: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { icon: Users, accent: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { icon: Database, accent: 'bg-sky-500', iconBg: 'bg-sky-50 dark:bg-sky-950/30', iconColor: 'text-sky-600 dark:text-sky-400' },
];

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number | string;
    label: string;
    accent: string;
    iconBg: string;
    iconColor: string;
}> = ({
    icon, value, label, accent, iconBg, iconColor,
}) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground leading-none">{Number(value ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

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
}: ModulePageProps) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<RecordRow | null>(null);
    const [formOpen, setFormOpen] = useState(false);
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

    const kpiCards = analytics?.cards ?? [];
    const hasCharts = Boolean(analytics?.charts && Object.keys(analytics.charts).length > 0);
    const totalRecords = records.total ?? records.data.length;

    // Registry panel (header + search + table) rendered inside the Records tab
    const renderRegistryPanel = () => (
        <Card className="border-0 shadow-sm">
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">{entityName} Registry</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {totalRecords > 0
                            ? `${totalRecords.toLocaleString()} record${totalRecords !== 1 ? 's' : ''} found`
                            : 'No records yet'}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder={`Search ${entityName.toLowerCase()}s…`}
                            className="h-9 w-full sm:w-64 rounded-lg border border-border bg-muted pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {search && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={applySearch}
                        className="h-9 px-4 text-sm border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
                    >
                        Search
                    </Button>
                </div>
            </div>

            <DataTable
                records={records}
                columns={columns}
                onEdit={openEdit}
                onDelete={setDeletingRecord}
            />
        </Card>
    );

    return (
        <AppLayout breadcrumbs={[{ title, href: routeBase }]}>
            <Head title={title} />

            <div className="min-h-screen bg-background">
                {/* Page Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            {Icon && (
                                <div className="p-2 bg-primary rounded-xl shrink-0">
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold text-foreground leading-tight truncate">{title}</h1>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                            </div>
                        </div>

                        <Button
                            onClick={openCreate}
                            className="shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5 text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add {entityName}
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    {kpiCards.length > 0 && (
                        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {kpiCards.slice(0, 4).map((card, index) => {
                                const style = KPI_STYLES[index % KPI_STYLES.length];
                                const KpiIcon = style.icon;
                                return (
                                    <StatCard
                                        key={card.label}
                                        icon={<KpiIcon className="w-5 h-5" />}
                                        value={card.value}
                                        label={card.label}
                                        accent={style.accent}
                                        iconBg={style.iconBg}
                                        iconColor={style.iconColor}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Tabs: Records ↔ Reports & Analytics */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger
                                value="records"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <List className="w-4 h-4" />
                                Records
                            </TabsTrigger>
                            {hasCharts && (
                                <TabsTrigger
                                    value="analytics"
                                    className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    Reports & Analytics
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="records">
                            {renderRegistryPanel()}
                        </TabsContent>

                        {hasCharts && (
                            <TabsContent value="analytics">
                                <AnalyticsCards charts={analytics?.charts} />
                            </TabsContent>
                        )}
                    </Tabs>
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
