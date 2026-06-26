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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Building2,
    CalendarDays,
    Database,
    DoorClosed,
    Download,
    Filter,
    Home,
    Landmark,
    Search,
    ShieldCheck,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type Row = { id: number; [key: string]: unknown };
type Column<T extends Row> = {
    key: string;
    label: string;
    align?: 'right';
    render?: (row: T) => ReactNode;
};
type ChartItem = { name: string; count: number };
type MetricTone = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';

type Props = {
    overviewStats: Record<string, number>;
    regions: Row[];
    branches: Row[];
    jailOfficers: Row[];
    annexes: Row[];
    dormitories: Row[];
    cells: Row[];
    pdls: Row[];
    analytics: Record<string, ChartItem[]>;
    filters: { date_from: string; date_to: string };
};

const ITEMS_PER_PAGE = 10;
const chartFill = '#2563eb';
const mutedChartFill = '#64748b';
const accentChartFill = '#0f766e';
const breadcrumbs = [
    { title: 'National Office Dashboard', href: '/dashboard/national-office' },
];

const toneStyles: Record<MetricTone, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-300',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300',
    rose: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300',
    violet: 'border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-950 dark:bg-violet-950/30 dark:text-violet-300',
    slate: 'border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
};

function formatNumber(value: unknown) {
    return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

function getValue(row: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value && typeof value === 'object' && key in value) {
            return (value as Record<string, unknown>)[key];
        }

        return undefined;
    }, row);
}

function textValue(row: Row, path: string) {
    const value = getValue(row, path);
    return value === null || value === undefined || value === ''
        ? '—'
        : String(value);
}

function StatusBadge({ value }: { value: unknown }) {
    const status = String(value || 'Unknown');
    const isActive = status.toLowerCase() === 'active';

    return (
        <Badge variant={isActive ? 'default' : 'secondary'} className="w-fit">
            {status}
        </Badge>
    );
}

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
    tone = 'slate',
}: {
    label: string;
    value: number;
    detail: string;
    icon: ElementType;
    tone?: MetricTone;
}) {
    return (
        <Card className="overflow-hidden border-0 shadow-none ring-1 ring-border/70">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            {label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {formatNumber(value)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {detail}
                        </p>
                    </div>
                    <div
                        className={`rounded-2xl border p-3 ${toneStyles[tone]}`}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function HighlightCard({
    title,
    value,
    detail,
    icon: Icon,
}: {
    title: string;
    value: number;
    detail: string;
    icon: ElementType;
}) {
    return (
        <div className="rounded-2xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                    {title}
                </p>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{formatNumber(value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
    );
}

function RegistryTable<T extends Row>({
    title,
    description,
    rows,
    columns,
    page,
    pageKey,
    searchTerm,
    onPageChange,
}: {
    title: string;
    description: string;
    rows: T[];
    columns: Column<T>[];
    page: number;
    pageKey: string;
    searchTerm: string;
    onPageChange: (pageKey: string, page: number) => void;
}) {
    const filteredRows = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return rows;

        return rows.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(query),
        );
    }, [rows, searchTerm]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRows.length / ITEMS_PER_PAGE),
    );
    const safePage = Math.min(page, totalPages);
    const visibleRows = filteredRows.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE,
    );

    return (
        <Card className="overflow-hidden border-0 shadow-none ring-1 ring-border/70">
            <CardHeader className="border-b pb-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit">
                        {formatNumber(filteredRows.length)} records
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.length > 0 ? (
                                visibleRows.map((row) => (
                                    <TableRow key={row.id}>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={`${row.id}-${column.key}`}
                                                className={
                                                    column.align === 'right'
                                                        ? 'text-right'
                                                        : undefined
                                                }
                                            >
                                                {column.render
                                                    ? column.render(row)
                                                    : textValue(
                                                          row,
                                                          column.key,
                                                      )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-28 text-center text-muted-foreground"
                                    >
                                        No records found for this view.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {safePage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={safePage === 1}
                                onClick={() =>
                                    onPageChange(pageKey, safePage - 1)
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={safePage === totalPages}
                                onClick={() =>
                                    onPageChange(pageKey, safePage + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ChartCard({
    title,
    description,
    data,
    fill = chartFill,
}: {
    title: string;
    description: string;
    data?: ChartItem[];
    fill?: string;
}) {
    const rows = data ?? [];

    return (
        <Card className="border-0 shadow-none ring-1 ring-border/70">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Badge variant="outline">
                        Top {Math.min(rows.length, 12)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {rows.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={rows.slice(0, 12)}
                            margin={{ top: 8, right: 16, left: 0, bottom: 72 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="name"
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                                height={90}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar
                                dataKey="count"
                                fill={fill}
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        No analytics data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MiniBarList({ title, data }: { title: string; data?: ChartItem[] }) {
    const rows = (data ?? []).slice(0, 5);
    const maxValue = Math.max(...rows.map((row) => Number(row.count)), 1);

    return (
        <Card className="border-0 shadow-none ring-1 ring-border/70">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>
                    Highest-volume national records.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {rows.length > 0 ? (
                    rows.map((row) => (
                        <div key={row.name} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium">
                                    {row.name}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatNumber(row.count)}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{
                                        width: `${Math.max(8, (row.count / maxValue) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        No ranking data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function NationalOfficeDashboard({
    overviewStats,
    regions,
    branches,
    jailOfficers,
    annexes,
    dormitories,
    cells,
    pdls,
    analytics,
    filters,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [pages, setPages] = useState<Record<string, number>>({
        regions: 1,
        branches: 1,
        officers: 1,
        annexes: 1,
        dormitories: 1,
        cells: 1,
        pdls: 1,
    });

    const setPage = (pageKey: string, page: number) =>
        setPages((current) => ({ ...current, [pageKey]: page }));
    const resetPages = () =>
        setPages({
            regions: 1,
            branches: 1,
            officers: 1,
            annexes: 1,
            dormitories: 1,
            cells: 1,
            pdls: 1,
        });

    const dateWindow =
        filters.date_from && filters.date_to
            ? `${filters.date_from} - ${filters.date_to}`
            : 'Current analytics window';

    const metrics = [
        {
            label: 'Regions',
            value: overviewStats.total_regions,
            detail: 'National coverage areas',
            icon: Landmark,
            tone: 'blue' as const,
        },
        {
            label: 'Branches',
            value: overviewStats.total_branches,
            detail: 'BJMP operating branches',
            icon: Building2,
            tone: 'green' as const,
        },
        {
            label: 'Jails',
            value: overviewStats.total_jails,
            detail: 'Facilities in hierarchy',
            icon: ShieldCheck,
            tone: 'violet' as const,
        },
        {
            label: 'PDLs',
            value: overviewStats.total_pdls,
            detail: 'Persons deprived of liberty',
            icon: Users,
            tone: 'amber' as const,
        },
    ];

    const registryMetrics = [
        {
            label: 'Dormitories',
            value: overviewStats.total_dormitories,
            detail: 'Housing units tracked',
            icon: Home,
            tone: 'slate' as const,
        },
        {
            label: 'Annexes',
            value: overviewStats.total_annexes,
            detail: 'Buildings under jails',
            icon: DoorClosed,
            tone: 'slate' as const,
        },
        {
            label: 'Visits',
            value: overviewStats.total_visits,
            detail: 'Submitted schedules',
            icon: CalendarDays,
            tone: 'rose' as const,
        },
        {
            label: 'Active Sessions',
            value: overviewStats.active_visit_sessions,
            detail: 'Currently open monitoring',
            icon: Activity,
            tone: 'green' as const,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="National Office Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 sm:p-6">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <Badge variant="secondary" className="mb-4 gap-2">
                                <BarChart3 className="h-4 w-4" />
                                National Command Center
                            </Badge>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                National Office Dashboard
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Consolidated operational visibility across
                                regions, BJMP branches, facilities, personnel
                                assignments, PDL housing, and visit activity.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="rounded-xl bg-background p-2 text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        Analytics window
                                    </p>
                                    <p className="text-muted-foreground">
                                        {dateWindow}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border bg-card p-1 sm:w-fit">
                        <TabsTrigger value="overview" className="rounded-xl">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="rounded-xl">
                            Reports
                        </TabsTrigger>
                        <TabsTrigger value="registry" className="rounded-xl">
                            Registry
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {metrics.map((metric) => (
                                <MetricCard key={metric.label} {...metric} />
                            ))}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                            <ChartCard
                                title="PDLs per Branch"
                                description="Top branch-level PDL distribution across the national registry."
                                data={analytics.pdl_per_branch}
                            />

                            <Card className="border-0 shadow-none ring-1 ring-border/70">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        National Highlights
                                    </CardTitle>
                                    <CardDescription>
                                        Facility and visit signals for the
                                        selected reporting window.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                    {registryMetrics.map((metric) => (
                                        <HighlightCard
                                            key={metric.label}
                                            title={metric.label}
                                            value={metric.value}
                                            detail={metric.detail}
                                            icon={metric.icon}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <MiniBarList
                                title="Branches by PDL Population"
                                data={analytics.pdl_per_branch}
                            />
                            <MiniBarList
                                title="Visits by Region"
                                data={analytics.visits_per_region}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-6">
                        <Card className="border-0 shadow-none ring-1 ring-border/70">
                            <CardContent className="p-4">
                                <form
                                    method="get"
                                    action="/dashboard/national-office"
                                    className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Filter className="h-4 w-4" />
                                            Report filters
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Date filters are handled by the
                                            existing National Office dashboard
                                            request.
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                                        <label className="space-y-1 text-sm">
                                            <span className="text-muted-foreground">
                                                From
                                            </span>
                                            <input
                                                type="date"
                                                name="date_from"
                                                defaultValue={filters.date_from}
                                                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                                            />
                                        </label>
                                        <label className="space-y-1 text-sm">
                                            <span className="text-muted-foreground">
                                                To
                                            </span>
                                            <input
                                                type="date"
                                                name="date_to"
                                                defaultValue={filters.date_to}
                                                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                                            />
                                        </label>
                                        <Button type="submit" className="gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Apply
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {registryMetrics.map((metric) => (
                                <MetricCard key={metric.label} {...metric} />
                            ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <ChartCard
                                title="Branches per Region"
                                description="Regional branch coverage."
                                data={analytics.branch_per_region}
                                fill={mutedChartFill}
                            />
                            <ChartCard
                                title="Cells per Branch"
                                description="Cell inventory by branch."
                                data={analytics.cell_per_branch}
                                fill={accentChartFill}
                            />
                            <ChartCard
                                title="Visits per Region"
                                description="Scheduled visits within selected analytics window."
                                data={analytics.visits_per_region}
                                fill={mutedChartFill}
                            />
                            <ChartCard
                                title="Visits per Branch"
                                description="Branch-level visit volume."
                                data={analytics.visits_per_branch}
                            />
                            <ChartCard
                                title="Top Cells by Visits"
                                description="Cells with the highest linked visit activity."
                                data={analytics.visits_per_cell}
                                fill={accentChartFill}
                            />
                            <ChartCard
                                title="PDLs per Branch"
                                description="National custody distribution by branch."
                                data={analytics.pdl_per_branch}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="registry" className="space-y-6">
                        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Database className="h-4 w-4" />
                                    Facility Registry
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Search applies to the active operational
                                    table.
                                </p>
                            </div>
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => {
                                        setSearchTerm(event.target.value);
                                        resetPages();
                                    }}
                                    placeholder="Search records..."
                                    className="h-10 w-full rounded-md border bg-background pr-3 pl-9 text-sm transition outline-none focus:border-foreground/40"
                                />
                            </div>
                        </div>

                        <Tabs defaultValue="regions" className="space-y-4">
                            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl border bg-card p-1">
                                <TabsTrigger value="regions">
                                    Regions
                                </TabsTrigger>
                                <TabsTrigger value="branches">
                                    Branches
                                </TabsTrigger>
                                <TabsTrigger value="officers">
                                    Officers
                                </TabsTrigger>
                                <TabsTrigger value="annexes">
                                    Annexes
                                </TabsTrigger>
                                <TabsTrigger value="dormitories">
                                    Dormitories
                                </TabsTrigger>
                                <TabsTrigger value="cells">Cells</TabsTrigger>
                                <TabsTrigger value="pdls">PDLs</TabsTrigger>
                            </TabsList>

                            <TabsContent value="regions">
                                <RegistryTable
                                    title="Regional Offices"
                                    description="High-level facility and population distribution per region."
                                    rows={regions}
                                    pageKey="regions"
                                    page={pages.regions}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'code', label: 'Code' },
                                        { key: 'name', label: 'Region' },
                                        {
                                            key: 'status',
                                            label: 'Status',
                                            render: (row) => (
                                                <StatusBadge
                                                    value={row.status}
                                                />
                                            ),
                                        },
                                        {
                                            key: 'total_branches',
                                            label: 'Branches',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_jails',
                                            label: 'Jails',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_dormitories',
                                            label: 'Dormitories',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_cells',
                                            label: 'Cells',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_pdls',
                                            label: 'PDLs',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="branches">
                                <RegistryTable
                                    title="BJMP Branches"
                                    description="Branch-level operational counts with assigned jail wardens."
                                    rows={branches}
                                    pageKey="branches"
                                    page={pages.branches}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'code', label: 'Code' },
                                        { key: 'name', label: 'Branch' },
                                        { key: 'region.name', label: 'Region' },
                                        {
                                            key: 'jail_warden',
                                            label: 'Jail Warden',
                                            render: (row) =>
                                                getValue(
                                                    row,
                                                    'jail_warden.name',
                                                ) ? (
                                                    <div>
                                                        <div className="font-medium">
                                                            {textValue(
                                                                row,
                                                                'jail_warden.name',
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {textValue(
                                                                row,
                                                                'jail_warden.email',
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Not assigned
                                                    </span>
                                                ),
                                        },
                                        {
                                            key: 'total_jails',
                                            label: 'Jails',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_annexes',
                                            label: 'Annexes',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_cells',
                                            label: 'Cells',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_pdls',
                                            label: 'PDLs',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="officers">
                                <RegistryTable
                                    title="Jail Officers"
                                    description="Personnel assignments and active operational scopes."
                                    rows={jailOfficers}
                                    pageKey="officers"
                                    page={pages.officers}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'name', label: 'Officer' },
                                        { key: 'email', label: 'Email' },
                                        {
                                            key: 'branch.name',
                                            label: 'Branch',
                                            render: (row) =>
                                                textValue(row, 'branch.name'),
                                        },
                                        {
                                            key: 'branch.region',
                                            label: 'Region',
                                            render: (row) =>
                                                textValue(row, 'branch.region'),
                                        },
                                        {
                                            key: 'scopes',
                                            label: 'Active Scopes',
                                            render: (row) =>
                                                Array.isArray(row.scopes) &&
                                                row.scopes.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {row.scopes.map(
                                                            (scope, index) => (
                                                                <Badge
                                                                    key={index}
                                                                    variant="outline"
                                                                    className="font-normal"
                                                                >
                                                                    {String(
                                                                        (
                                                                            scope as Record<
                                                                                string,
                                                                                unknown
                                                                            >
                                                                        )
                                                                            .description ??
                                                                            'Scope',
                                                                    )}
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        No active scope
                                                    </span>
                                                ),
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="annexes">
                                <RegistryTable
                                    title="Annexes / Buildings"
                                    description="Building-level registry under jail facilities."
                                    rows={annexes}
                                    pageKey="annexes"
                                    page={pages.annexes}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'name', label: 'Annex' },
                                        { key: 'jail.name', label: 'Jail' },
                                        { key: 'branch.name', label: 'Branch' },
                                        { key: 'region.name', label: 'Region' },
                                        {
                                            key: 'total_dormitories',
                                            label: 'Dormitories',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_cells',
                                            label: 'Cells',
                                            align: 'right',
                                        },
                                        {
                                            key: 'assigned_officers',
                                            label: 'Assigned Officers',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="dormitories">
                                <RegistryTable
                                    title="Dormitories"
                                    description="Housing units mapped to annexes, jails, branches, and regions."
                                    rows={dormitories}
                                    pageKey="dormitories"
                                    page={pages.dormitories}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'name', label: 'Dormitory' },
                                        { key: 'type', label: 'Type' },
                                        { key: 'annex.name', label: 'Annex' },
                                        { key: 'jail.name', label: 'Jail' },
                                        { key: 'branch.name', label: 'Branch' },
                                        { key: 'region.name', label: 'Region' },
                                        {
                                            key: 'total_cells',
                                            label: 'Cells',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_pdls',
                                            label: 'PDLs',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="cells">
                                <RegistryTable
                                    title="Cells"
                                    description="Cell occupancy and officer assignment coverage."
                                    rows={cells}
                                    pageKey="cells"
                                    page={pages.cells}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        { key: 'cell_number', label: 'Cell' },
                                        {
                                            key: 'status',
                                            label: 'Status',
                                            render: (row) => (
                                                <StatusBadge
                                                    value={row.status}
                                                />
                                            ),
                                        },
                                        { key: 'annex.name', label: 'Annex' },
                                        {
                                            key: 'dormitory.name',
                                            label: 'Dormitory',
                                        },
                                        { key: 'jail.name', label: 'Jail' },
                                        { key: 'branch.name', label: 'Branch' },
                                        {
                                            key: 'capacity',
                                            label: 'Capacity',
                                            align: 'right',
                                        },
                                        {
                                            key: 'total_pdls',
                                            label: 'PDLs',
                                            align: 'right',
                                        },
                                        {
                                            key: 'assigned_officers',
                                            label: 'Officers',
                                            align: 'right',
                                        },
                                    ]}
                                />
                            </TabsContent>

                            <TabsContent value="pdls">
                                <RegistryTable
                                    title="Persons Deprived of Liberty"
                                    description="PDL housing location by facility hierarchy."
                                    rows={pdls}
                                    pageKey="pdls"
                                    page={pages.pdls}
                                    searchTerm={searchTerm}
                                    onPageChange={setPage}
                                    columns={[
                                        {
                                            key: 'full_name',
                                            label: 'Full Name',
                                        },
                                        {
                                            key: 'age',
                                            label: 'Age',
                                            align: 'right',
                                        },
                                        { key: 'gender', label: 'Gender' },
                                        {
                                            key: 'cell.cell_number',
                                            label: 'Cell',
                                        },
                                        { key: 'annex.name', label: 'Annex' },
                                        {
                                            key: 'dormitory.name',
                                            label: 'Dormitory',
                                        },
                                        { key: 'jail.name', label: 'Jail' },
                                        { key: 'branch.name', label: 'Branch' },
                                        { key: 'region.name', label: 'Region' },
                                    ]}
                                />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

/*
type Row = { id: number; [key: string]: unknown };
type Column<T extends Row> = {
    key: string;
    label: string;
    align?: 'right';
    render?: (row: T) => ReactNode;
};
type ChartItem = { name: string; count: number };

type Props = {
    overviewStats: Record<string, number>;
    regions: Row[];
    branches: Row[];
    jailOfficers: Row[];
    annexes: Row[];
    dormitories: Row[];
    cells: Row[];
    pdls: Row[];
    analytics: Record<string, ChartItem[]>;
    filters: { date_from: string; date_to: string };
};

const ITEMS_PER_PAGE = 10;
const chartFill = '#374151';
const mutedChartFill = '#6b7280';
const breadcrumbs = [
    { title: 'National Office Dashboard', href: '/dashboard/national-office' },
];

function formatNumber(value: unknown) {
    return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

function getValue(row: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
        if (value && typeof value === 'object' && key in value) {
            return (value as Record<string, unknown>)[key];
        }

        return undefined;
    }, row);
}

function textValue(row: Row, path: string) {
    const value = getValue(row, path);
    return value === null || value === undefined || value === ''
        ? '—'
        : String(value);
}

function StatusBadge({ value }: { value: unknown }) {
    const status = String(value || 'Unknown');
    return (
        <Badge
            variant={
                status.toLowerCase() === 'active' ? 'default' : 'secondary'
            }
        >
            {status}
        </Badge>
    );
}

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: number;
    detail: string;
    icon: ElementType;
}) {
    return (
        <Card className="shadow-none">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            {label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {formatNumber(value)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {detail}
                        </p>
                    </div>
                    <div className="rounded-md border p-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RegistryTable<T extends Row>({
    title,
    description,
    rows,
    columns,
    page,
    pageKey,
    searchTerm,
    onPageChange,
}: {
    title: string;
    description: string;
    rows: T[];
    columns: Column<T>[];
    page: number;
    pageKey: string;
    searchTerm: string;
    onPageChange: (pageKey: string, page: number) => void;
}) {
    const filteredRows = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return rows;

        return rows.filter((row) =>
            JSON.stringify(row).toLowerCase().includes(query),
        );
    }, [rows, searchTerm]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRows.length / ITEMS_PER_PAGE),
    );
    const safePage = Math.min(page, totalPages);
    const visibleRows = filteredRows.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE,
    );

    return (
        <Card className="overflow-hidden shadow-none">
            <CardHeader className="border-b pb-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit">
                        {formatNumber(filteredRows.length)} records
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.length > 0 ? (
                                visibleRows.map((row) => (
                                    <TableRow key={row.id}>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={`${row.id}-${column.key}`}
                                                className={
                                                    column.align === 'right'
                                                        ? 'text-right'
                                                        : undefined
                                                }
                                            >
                                                {column.render
                                                    ? column.render(row)
                                                    : textValue(
                                                          row,
                                                          column.key,
                                                      )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-28 text-center text-muted-foreground"
                                    >
                                        No records found for this view.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {safePage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={safePage === 1}
                                onClick={() =>
                                    onPageChange(pageKey, safePage - 1)
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={safePage === totalPages}
                                onClick={() =>
                                    onPageChange(pageKey, safePage + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ChartCard({
    title,
    description,
    data,
    fill = chartFill,
}: {
    title: string;
    description: string;
    data?: ChartItem[];
    fill?: string;
}) {
    const rows = data ?? [];

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {rows.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={rows.slice(0, 12)}
                            margin={{ top: 8, right: 16, left: 0, bottom: 72 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e5e7eb"
                            />
                            <XAxis
                                dataKey="name"
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                                height={90}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar
                                dataKey="count"
                                fill={fill}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-80 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        No analytics data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function NationalOfficeDashboard({
    overviewStats,
    regions,
    branches,
    jailOfficers,
    annexes,
    dormitories,
    cells,
    pdls,
    analytics,
    filters,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [pages, setPages] = useState<Record<string, number>>({
        regions: 1,
        branches: 1,
        officers: 1,
        annexes: 1,
        dormitories: 1,
        cells: 1,
        pdls: 1,
    });

    const setPage = (pageKey: string, page: number) =>
        setPages((current) => ({ ...current, [pageKey]: page }));
    const resetPages = () =>
        setPages({
            regions: 1,
            branches: 1,
            officers: 1,
            annexes: 1,
            dormitories: 1,
            cells: 1,
            pdls: 1,
        });

    const metrics = [
        {
            label: 'Regions',
            value: overviewStats.total_regions,
            detail: 'National coverage areas',
            icon: Landmark,
        },
        {
            label: 'Branches',
            value: overviewStats.total_branches,
            detail: 'BJMP operating branches',
            icon: Building2,
        },
        {
            label: 'Jails',
            value: overviewStats.total_jails,
            detail: 'Facilities in hierarchy',
            icon: ShieldCheck,
        },
        {
            label: 'PDLs',
            value: overviewStats.total_pdls,
            detail: 'Persons deprived of liberty',
            icon: Users,
        },
        {
            label: 'Dormitories',
            value: overviewStats.total_dormitories,
            detail: 'Housing units tracked',
            icon: Home,
        },
        {
            label: 'Annexes',
            value: overviewStats.total_annexes,
            detail: 'Buildings under jails',
            icon: DoorClosed,
        },
        {
            label: 'Visits',
            value: overviewStats.total_visits,
            detail: 'All submitted schedules',
            icon: CalendarDays,
        },
        {
            label: 'Active Sessions',
            value: overviewStats.active_visit_sessions,
            detail: 'Currently open monitoring',
            icon: Activity,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="National Office Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                National Command Overview
                            </div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                National Office Dashboard
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Consolidated operational visibility across
                                regions, BJMP branches, facilities, personnel
                                assignments, PDL housing, and visit activity.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            Analytics window:{' '}
                            <span className="font-medium text-foreground">
                                {filters.date_from}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium text-foreground">
                                {filters.date_to}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <MetricCard key={metric.label} {...metric} />
                    ))}
                </div>

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-medium">
                            Facility Registry
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Search applies to the active operational table.
                        </p>
                    </div>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                resetPages();
                            }}
                            placeholder="Search records..."
                            className="h-10 w-full rounded-md border bg-background pr-3 pl-9 text-sm transition outline-none focus:border-foreground/40"
                        />
                    </div>
                </div>

                <Tabs defaultValue="regions" className="space-y-4">
                    <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg border bg-card p-1">
                        <TabsTrigger value="regions">Regions</TabsTrigger>
                        <TabsTrigger value="branches">Branches</TabsTrigger>
                        <TabsTrigger value="officers">Officers</TabsTrigger>
                        <TabsTrigger value="annexes">Annexes</TabsTrigger>
                        <TabsTrigger value="dormitories">
                            Dormitories
                        </TabsTrigger>
                        <TabsTrigger value="cells">Cells</TabsTrigger>
                        <TabsTrigger value="pdls">PDLs</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="regions">
                        <RegistryTable
                            title="Regional Offices"
                            description="High-level facility and population distribution per region."
                            rows={regions}
                            pageKey="regions"
                            page={pages.regions}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'code', label: 'Code' },
                                { key: 'name', label: 'Region' },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (row) => (
                                        <StatusBadge value={row.status} />
                                    ),
                                },
                                {
                                    key: 'total_branches',
                                    label: 'Branches',
                                    align: 'right',
                                },
                                {
                                    key: 'total_jails',
                                    label: 'Jails',
                                    align: 'right',
                                },
                                {
                                    key: 'total_dormitories',
                                    label: 'Dormitories',
                                    align: 'right',
                                },
                                {
                                    key: 'total_cells',
                                    label: 'Cells',
                                    align: 'right',
                                },
                                {
                                    key: 'total_pdls',
                                    label: 'PDLs',
                                    align: 'right',
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="branches">
                        <RegistryTable
                            title="BJMP Branches"
                            description="Branch-level operational counts with assigned jail wardens."
                            rows={branches}
                            pageKey="branches"
                            page={pages.branches}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'code', label: 'Code' },
                                { key: 'name', label: 'Branch' },
                                { key: 'region.name', label: 'Region' },
                                {
                                    key: 'jail_warden',
                                    label: 'Jail Warden',
                                    render: (row) =>
                                        getValue(row, 'jail_warden.name') ? (
                                            <div>
                                                <div className="font-medium">
                                                    {textValue(
                                                        row,
                                                        'jail_warden.name',
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {textValue(
                                                        row,
                                                        'jail_warden.email',
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Not assigned
                                            </span>
                                        ),
                                },
                                {
                                    key: 'total_jails',
                                    label: 'Jails',
                                    align: 'right',
                                },
                                {
                                    key: 'total_annexes',
                                    label: 'Annexes',
                                    align: 'right',
                                },
                                {
                                    key: 'total_cells',
                                    label: 'Cells',
                                    align: 'right',
                                },
                                {
                                    key: 'total_pdls',
                                    label: 'PDLs',
                                    align: 'right',
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="officers">
                        <RegistryTable
                            title="Jail Officers"
                            description="Personnel assignments and active operational scopes."
                            rows={jailOfficers}
                            pageKey="officers"
                            page={pages.officers}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'name', label: 'Officer' },
                                { key: 'email', label: 'Email' },
                                {
                                    key: 'branch.name',
                                    label: 'Branch',
                                    render: (row) =>
                                        textValue(row, 'branch.name'),
                                },
                                {
                                    key: 'branch.region',
                                    label: 'Region',
                                    render: (row) =>
                                        textValue(row, 'branch.region'),
                                },
                                {
                                    key: 'scopes',
                                    label: 'Active Scopes',
                                    render: (row) =>
                                        Array.isArray(row.scopes) &&
                                        row.scopes.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {row.scopes.map(
                                                    (scope, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="outline"
                                                            className="font-normal"
                                                        >
                                                            {String(
                                                                (
                                                                    scope as Record<
                                                                        string,
                                                                        unknown
                                                                    >
                                                                ).description ??
                                                                    'Scope',
                                                            )}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                No active scope
                                            </span>
                                        ),
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="annexes">
                        <RegistryTable
                            title="Annexes / Buildings"
                            description="Building-level registry under jail facilities."
                            rows={annexes}
                            pageKey="annexes"
                            page={pages.annexes}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'name', label: 'Annex' },
                                { key: 'jail.name', label: 'Jail' },
                                { key: 'branch.name', label: 'Branch' },
                                { key: 'region.name', label: 'Region' },
                                {
                                    key: 'total_dormitories',
                                    label: 'Dormitories',
                                    align: 'right',
                                },
                                {
                                    key: 'total_cells',
                                    label: 'Cells',
                                    align: 'right',
                                },
                                {
                                    key: 'assigned_officers',
                                    label: 'Assigned Officers',
                                    align: 'right',
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="dormitories">
                        <RegistryTable
                            title="Dormitories"
                            description="Housing units mapped to annexes, jails, branches, and regions."
                            rows={dormitories}
                            pageKey="dormitories"
                            page={pages.dormitories}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'name', label: 'Dormitory' },
                                { key: 'type', label: 'Type' },
                                { key: 'annex.name', label: 'Annex' },
                                { key: 'jail.name', label: 'Jail' },
                                { key: 'branch.name', label: 'Branch' },
                                { key: 'region.name', label: 'Region' },
                                {
                                    key: 'total_cells',
                                    label: 'Cells',
                                    align: 'right',
                                },
                                {
                                    key: 'total_pdls',
                                    label: 'PDLs',
                                    align: 'right',
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="cells">
                        <RegistryTable
                            title="Cells"
                            description="Cell occupancy and officer assignment coverage."
                            rows={cells}
                            pageKey="cells"
                            page={pages.cells}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'cell_number', label: 'Cell' },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (row) => (
                                        <StatusBadge value={row.status} />
                                    ),
                                },
                                { key: 'annex.name', label: 'Annex' },
                                { key: 'dormitory.name', label: 'Dormitory' },
                                { key: 'jail.name', label: 'Jail' },
                                { key: 'branch.name', label: 'Branch' },
                                {
                                    key: 'capacity',
                                    label: 'Capacity',
                                    align: 'right',
                                },
                                {
                                    key: 'total_pdls',
                                    label: 'PDLs',
                                    align: 'right',
                                },
                                {
                                    key: 'assigned_officers',
                                    label: 'Officers',
                                    align: 'right',
                                },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="pdls">
                        <RegistryTable
                            title="Persons Deprived of Liberty"
                            description="PDL housing location by facility hierarchy."
                            rows={pdls}
                            pageKey="pdls"
                            page={pages.pdls}
                            searchTerm={searchTerm}
                            onPageChange={setPage}
                            columns={[
                                { key: 'full_name', label: 'Full Name' },
                                { key: 'age', label: 'Age', align: 'right' },
                                { key: 'gender', label: 'Gender' },
                                { key: 'cell.cell_number', label: 'Cell' },
                                { key: 'annex.name', label: 'Annex' },
                                { key: 'dormitory.name', label: 'Dormitory' },
                                { key: 'jail.name', label: 'Jail' },
                                { key: 'branch.name', label: 'Branch' },
                                { key: 'region.name', label: 'Region' },
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="analytics">
                        <div className="grid gap-4 xl:grid-cols-2">
                            <ChartCard
                                title="PDLs per Branch"
                                description="Top branch-level PDL distribution."
                                data={analytics.pdl_per_branch}
                            />
                            <ChartCard
                                title="Branches per Region"
                                description="Regional branch coverage."
                                data={analytics.branch_per_region}
                                fill={mutedChartFill}
                            />
                            <ChartCard
                                title="Cells per Branch"
                                description="Cell inventory by branch."
                                data={analytics.cell_per_branch}
                            />
                            <ChartCard
                                title="Visits per Region"
                                description="Scheduled visits within selected analytics window."
                                data={analytics.visits_per_region}
                                fill={mutedChartFill}
                            />
                            <ChartCard
                                title="Visits per Branch"
                                description="Branch-level visit volume."
                                data={analytics.visits_per_branch}
                            />
                            <ChartCard
                                title="Top Cells by Visits"
                                description="Cells with the highest linked visit activity."
                                data={analytics.visits_per_cell}
                                fill={mutedChartFill}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
*/
