import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Head, router } from '@inertiajs/react';
import {
    Landmark,
    GitBranch,
    Columns4,
    Grid3X3,
    Users,
    List,
    BarChart2,
    Calendar,
} from 'lucide-react';

type ChartItem = { name: string; count: number };

type RegionRow = {
    id: number;
    code: string;
    name: string;
    status: string;
    total_branches: number;
    total_jails: number;
    total_dormitories: number;
    total_cells: number;
    total_pdls: number;
};

type BranchRow = {
    id: number;
    code: string;
    name: string;
    type: string;
    status: string;
    region: { code: string; name: string };
    jail_warden: { id: number; name: string; email: string } | null;
    total_jails: number;
    total_dormitories: number;
    total_annexes: number;
    total_cells: number;
    total_pdls: number;
};

type Props = {
    overviewStats: Record<string, number>;
    regions: RegionRow[];
    branches: BranchRow[];
    analytics: Record<string, ChartItem[]>;
    filters: { date_from: string; date_to: string };
};

function formatNumber(value: unknown) {
    return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

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
                        <div className="text-2xl font-bold text-foreground leading-none">{formatNumber(value)}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, totalItems, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsis = totalPages > 5;
        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
                <span className="font-medium text-foreground">{totalPages}</span>
                <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs"
                >
                    Previous
                </Button>
                {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className={`h-8 w-8 p-0 text-xs ${page === currentPage ? 'bg-primary hover:bg-primary/90 border-primary' : ''}`}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-1 text-muted-foreground text-sm">…</span>
                    )
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs"
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

function statusBadgeClass(status: string) {
    const map: Record<string, string> = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        inactive: 'bg-muted text-muted-foreground border-border',
        maintenance: 'bg-primary/10 text-primary border-primary/20',
    };
    return map[status?.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border';
}

function branchTypeBadgeClass(type: string) {
    const map: Record<string, string> = {
        provincial: 'bg-violet-50 text-violet-700 border-violet-200',
        district: 'bg-sky-50 text-sky-700 border-sky-200',
        'sub-provincial': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[type?.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border';
}

const chartTooltipStyle = {
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    fontSize: 12,
} as const;

function AnalyticsChart({ title, description, data }: { title: string; description: string; data?: ChartItem[] }) {
    const chartData = data ?? [];
    return (
        <Card className="border-0 shadow-sm">
            <div className="px-6 pt-5 pb-2 border-b border-border">
                <h4 className="font-semibold text-foreground text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <CardContent className="p-4 pt-5">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                angle={-40}
                                textAnchor="end"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                        No analytics data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function NationalOfficeDashboard({ overviewStats, regions, branches, analytics, filters }: Props) {
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({ regions: 1, branches: 1 });
    const ITEMS_PER_PAGE = 10;

    const paginate = <T,>(data: T[], pageKey: string) => {
        const page = currentPage[pageKey] || 1;
        const start = (page - 1) * ITEMS_PER_PAGE;
        return {
            data: data.slice(start, start + ITEMS_PER_PAGE),
            totalPages: Math.ceil(data.length / ITEMS_PER_PAGE),
            totalItems: data.length,
        };
    };

    const handlePageChange = (key: string, page: number) =>
        setCurrentPage(prev => ({ ...prev, [key]: page }));

    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters?.date_to ?? '');

    const applyDateFilter = () => {
        router.get('/dashboard/national-office', { date_from: dateFrom, date_to: dateTo }, { preserveState: true, preserveScroll: true });
    };

    const paginatedRegions = paginate(regions, 'regions');
    const paginatedBranches = paginate(branches, 'branches');

    return (
        <AppLayout>
            <Head title="National Office Dashboard" />

            <div className="min-h-screen bg-background">
                {/* Page Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl">
                                <Landmark className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">National Office</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Nationwide BJMP Oversight & Analytics</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Columns4 className="w-5 h-5" />} value={overviewStats.total_regions} label="Total Regions" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<GitBranch className="w-5 h-5" />} value={overviewStats.total_branches} label="Total Branches" accent="bg-amber-500" iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600 dark:text-amber-400" />
                        <StatCard icon={<Grid3X3 className="w-5 h-5" />} value={overviewStats.total_cells} label="Total Cells" accent="bg-emerald-500" iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600 dark:text-emerald-400" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={overviewStats.total_pdls} label="Total PDLs" accent="bg-sky-500" iconBg="bg-sky-50 dark:bg-sky-950/30" iconColor="text-sky-600 dark:text-sky-400" />
                    </div>

                    {/* Main Tabs */}
                    <Tabs defaultValue="regions" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger
                                value="regions"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <Columns4 className="w-4 h-4" />
                                Regions
                            </TabsTrigger>
                            <TabsTrigger
                                value="branches"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <List className="w-4 h-4" />
                                Branches
                            </TabsTrigger>
                            <TabsTrigger
                                value="analytics"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <BarChart2 className="w-4 h-4" />
                                Reports & Analytics
                            </TabsTrigger>
                        </TabsList>

                        {/* REGIONS TAB */}
                        <TabsContent value="regions">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Regional Offices</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{regions.length} regions nationwide — manage them in the Regions module</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-6">Code</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Region</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Branches</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Jails</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Dorms</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cells</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right pr-6">PDLs</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedRegions.data.map((region) => (
                                                <TableRow key={region.id} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="pl-6">
                                                        <span className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded">{region.code}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-foreground text-sm">{region.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusBadgeClass(region.status)}`}>
                                                            {region.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(region.total_branches)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(region.total_jails)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(region.total_dormitories)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(region.total_cells)}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <span className="text-sm font-bold text-foreground">{formatNumber(region.total_pdls)}</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {paginatedRegions.data.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                                                        No regions found. Create regions in the Regions module.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls
                                    currentPage={currentPage.regions}
                                    totalPages={paginatedRegions.totalPages}
                                    totalItems={paginatedRegions.totalItems}
                                    onPageChange={(page) => handlePageChange('regions', page)}
                                />
                            </Card>
                        </TabsContent>

                        {/* BRANCHES TAB */}
                        <TabsContent value="branches">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">BJMP Branches</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{branches.length} branches — manage them in the Branches module</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-6">Code</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branch Name</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Region</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jail Warden</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Annexes</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Dorms</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cells</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">PDLs</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedBranches.data.map((branch) => (
                                                <TableRow key={branch.id} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="pl-6">
                                                        <span className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded">{branch.code}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-foreground text-sm">{branch.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${branchTypeBadgeClass(branch.type)}`}>
                                                            {branch.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{branch.region?.name ?? '—'}</TableCell>
                                                    <TableCell>
                                                        {branch.jail_warden ? (
                                                            <div>
                                                                <div className="text-sm font-medium text-foreground">{branch.jail_warden.name}</div>
                                                                <div className="text-xs text-muted-foreground">{branch.jail_warden.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(branch.total_annexes)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(branch.total_dormitories)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{formatNumber(branch.total_cells)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-sm font-bold text-foreground">{formatNumber(branch.total_pdls)}</span>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusBadgeClass(branch.status)}`}>
                                                            {branch.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {paginatedBranches.data.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                                                        No branches found. Create branches in the Branches module.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls
                                    currentPage={currentPage.branches}
                                    totalPages={paginatedBranches.totalPages}
                                    totalItems={paginatedBranches.totalItems}
                                    onPageChange={(page) => handlePageChange('branches', page)}
                                />
                            </Card>
                        </TabsContent>

                        {/* ANALYTICS TAB */}
                        <TabsContent value="analytics" className="space-y-4">
                            {/* Date Range Filter (applies to visit-based charts) */}
                            <Card className="border-0 shadow-sm">
                                <CardContent className="px-6 py-4 flex flex-wrap items-end gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">From</label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">To</label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <Button onClick={applyDateFilter} className="h-9 bg-primary hover:bg-primary/90 text-white gap-1.5 text-sm">
                                        <Calendar className="w-4 h-4" />
                                        Apply
                                    </Button>
                                    <p className="text-xs text-muted-foreground pb-2.5">Date range applies to visit-based charts.</p>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 md:grid-cols-2">
                                <AnalyticsChart
                                    title="PDLs per Branch"
                                    description="Population of persons deprived of liberty"
                                    data={analytics.pdl_per_branch}
                                />
                                <AnalyticsChart
                                    title="Branches per Region"
                                    description="Branch distribution across regions"
                                    data={analytics.branch_per_region}
                                />
                                <AnalyticsChart
                                    title="Cells per Branch"
                                    description="Cell capacity distribution"
                                    data={analytics.cell_per_branch}
                                />
                                <AnalyticsChart
                                    title="Visits per Region"
                                    description="Visit activity within the selected date range"
                                    data={analytics.visits_per_region}
                                />
                                <AnalyticsChart
                                    title="Visits per Branch"
                                    description="Visit activity within the selected date range"
                                    data={analytics.visits_per_branch}
                                />
                                <AnalyticsChart
                                    title="Visits per Dormitory"
                                    description="Visit activity within the selected date range"
                                    data={analytics.visits_per_dormitory}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
