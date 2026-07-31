import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Heart, List, BarChart2, CheckCircle, Clock, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

type Eburol = {
    id: number;
    visitor_name: string;
    visitor_email: string;
    inmate_name: string;
    deceased_name: string;
    wake_start_date: string;
    wake_end_date: string;
    wake_location: string;
    status: string;
    created_at: string;
    inmate_tunnel_code?: string | null;
    inmate_tunnel_status?: 'active' | 'expired' | 'used' | null;
};

type Props = {
    eburols: Eburol[];
    stats: { total_eburols: number; pending_eburols: number; approved_eburols: number; rejected_eburols: number; completed_eburols: number; active_tunnels: number };
    chartData: { eburols_by_status: { status: string; count: number }[]; eburols_by_period: { period: string; count: number }[] };
};

function getStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
        completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    };
    const config = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.className}`}>{config.label}</span>;
}

export default function EburolMonitoring({ eburols, stats, chartData }: Props) {
    const eburolColumns: ColumnDef<Eburol>[] = useMemo(() => [
        {
            accessorKey: 'visitor_name',
            header: 'Visitor',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="font-medium">{row.original.visitor_name}</div>
                    <div className="text-xs text-muted-foreground">{row.original.visitor_email}</div>
                </div>
            ),
        },
        { accessorKey: 'inmate_name', header: 'Inmate' },
        { accessorKey: 'deceased_name', header: 'Deceased' },
        {
            accessorKey: 'wake_start_date',
            header: 'Wake period',
            cell: ({ row }) => `${row.original.wake_start_date} – ${row.original.wake_end_date}`,
        },
        {
            accessorKey: 'wake_location',
            header: 'Location',
            cell: ({ row }) => (
                <span className="block max-w-[200px] truncate" title={row.original.wake_location}>
                    {row.original.wake_location}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: 'inmate_tunnel',
            header: 'Inmate tunnel',
            cell: ({ row }) => {
                const code = row.original.inmate_tunnel_code;
                const status = row.original.inmate_tunnel_status;
                if (!code) return <span className="text-muted-foreground">—</span>;
                const statusLabel = status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : status === 'used' ? 'Used' : '—';
                const statusVariant = status === 'active' ? 'default' : status === 'expired' ? 'destructive' : 'secondary';
                return (
                    <div className="flex flex-col gap-1">
                        <code className="font-mono text-sm tracking-wider">{code}</code>
                        {status && (
                            <Badge variant={statusVariant} className="text-xs w-fit">
                                {statusLabel}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
    ], []);

    return (
        <AppLayout>
            <Head title="E-Burol Monitoring" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><Heart className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">E-Burol Monitoring</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">E-burol schedules you are responsible for overseeing</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Heart className="w-5 h-5" />} value={stats.total_eburols} label="Total E-Burols" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<Clock className="w-5 h-5" />} value={stats.pending_eburols} label="Pending" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.approved_eburols} label="Approved" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<AlertCircle className="w-5 h-5" />} value={stats.rejected_eburols} label="Rejected" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />E-Burols
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">E-Burol Records</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{eburols.length} e-burol schedules</p>
                                </div>
                                <div className="p-6">
                                    <DataTable columns={eburolColumns} data={eburols} />
                                    {eburols.length === 0 && (
                                        <p className="py-8 text-center text-muted-foreground">
                                            No e-burol schedules assigned to you yet.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">E-Burols by Status</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of e-burol statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.eburols_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.eburols_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">E-Burols by Period</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Timeline distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.eburols_by_period} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} name="E-Burols" />
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
