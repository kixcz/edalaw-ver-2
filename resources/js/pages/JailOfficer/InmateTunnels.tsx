import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Filter, Search, List, BarChart2, Key, CheckCircle, XCircle, Clock, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

type TunnelRow = {
    id: number;
    visit_session_id: number;
    tunnel_token: string;
    short_code: string | null;
    tunnel_link: string;
    expires_at: string;
    expires_at_human: string;
    is_used: boolean;
    status: string;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string | null;
    created_at: string;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type Props = {
    tunnels: { data: TunnelRow[]; links: PaginationLink[]; current_page: number; last_page: number; total: number };
    stats: { total_tunnels: number; valid_tunnels: number; used_tunnels: number; expired_tunnels: number };
    chartData: { tunnels_by_status: { status: string; count: number }[]; tunnels_by_day: { day: string; count: number }[] };
    filters: { search?: string; date_from?: string; date_to?: string; status: string };
};

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { className: string; label: string }> = {
        valid: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Valid' },
        used: { className: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Used' },
        expired: { className: 'bg-red-50 text-red-700 border-red-200', label: 'Expired' },
    };
    const { className, label } = config[status] ?? { className: 'bg-slate-100 text-slate-600 border-slate-200', label: status };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>{label}</span>;
}

export default function InmateTunnels({ tunnels, stats, chartData, filters: initialFilters }: Props) {
    const [, copy] = useClipboard();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search ?? '');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from ?? '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to ?? '');
    const [statusFilter, setStatusFilter] = useState(initialFilters.status ?? 'all');

    const columns: ColumnDef<TunnelRow>[] = useMemo(
        () => [
            { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => row.original.created_at.slice(0, 19).replace('T', ' ') },
            { accessorKey: 'visit_session_id', header: 'Session ID', cell: ({ row }) => <span className="font-mono text-sm">{row.original.visit_session_id}</span> },
            { accessorKey: 'session_type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.session_type}</span> },
            {
                accessorKey: 'short_code',
                header: 'Inmate tunnel code',
                cell: ({ row }) => {
                    const code = row.original.short_code;
                    const link = row.original.tunnel_link ?? '';
                    if (!code && !link) return <span className="text-slate-400">—</span>;
                    const display = code ?? (link.length > 45 ? `${link.slice(0, 42)}…` : link);
                    const toCopy = code ?? link;
                    return (
                        <div className="flex items-center gap-2">
                            <code className="font-mono text-sm tracking-wider rounded bg-slate-100 px-1.5 py-0.5" title={link || undefined}>
                                {display}
                            </code>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => copy(toCopy)}
                                title={code ? 'Copy code' : 'Copy link'}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
            { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
            { accessorKey: 'inmate_name', header: 'Inmate', cell: ({ row }) => row.original.inmate_name ?? '—' },
            { accessorKey: 'expires_at', header: 'Expires', cell: ({ row }) => <div><div className="text-sm">{row.original.expires_at.slice(0, 16).replace('T', ' ')}</div><div className="text-xs text-slate-500">{row.original.expires_at_human}</div></div> },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        ],
        [copy]
    );

    const handleFilter = () => {
        router.get('/jail-officer/inmate-tunnels', {
            search: searchQuery || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, { preserveScroll: true });
    };

    const prevLink = tunnels.links?.find((l) => l.label === '&laquo; Previous');
    const nextLink = tunnels.links?.find((l) => l.label === 'Next &raquo;');

    return (
        <AppLayout>
            <Head title="Inmate Tunnels" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-amber-600 rounded-xl"><Key className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Inmate Tunnels</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Inmate join links you have generated for your assigned sessions</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Key className="w-5 h-5" />} value={stats.total_tunnels} label="Total Tunnels" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.valid_tunnels} label="Valid" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<Link2 className="w-5 h-5" />} value={stats.used_tunnels} label="Used" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<XCircle className="w-5 h-5" />} value={stats.expired_tunnels} label="Expired" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Tunnels
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div className="relative flex-1 min-w-[200px]">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input placeholder="Search by token or session ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter()} className="pl-9" />
                                        </div>
                                        <div className="flex flex-col gap-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                                        <div className="flex flex-col gap-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="valid">Valid</SelectItem>
                                                <SelectItem value="used">Used</SelectItem>
                                                <SelectItem value="expired">Expired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={handleFilter} variant="outline" className="gap-2"><Filter className="h-4 w-4" />Apply</Button>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Tunnel Records</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{tunnels.total} total tunnels</p>
                                </div>
                                <div className="p-6">
                                    <DataTable columns={columns} data={tunnels.data} enableGlobalFilter={false} />
                                    {tunnels.last_page > 1 && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-sm text-slate-500">Page {tunnels.current_page} of {tunnels.last_page} ({tunnels.total} total)</p>
                                            <div className="flex gap-2">
                                                {prevLink?.url ? <Button variant="outline" size="sm" asChild><Link href={prevLink.url} preserveScroll>Previous</Link></Button> : <Button variant="outline" size="sm" disabled>Previous</Button>}
                                                {nextLink?.url ? <Button variant="outline" size="sm" asChild><Link href={nextLink.url} preserveScroll>Next</Link></Button> : <Button variant="outline" size="sm" disabled>Next</Button>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Tunnels by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution of tunnel statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.tunnels_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.tunnels_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Tunnels by Day</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Creation trend (last 7 days)</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.tunnels_by_day} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#d97706" radius={[4, 4, 0, 0]} name="Tunnels" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
