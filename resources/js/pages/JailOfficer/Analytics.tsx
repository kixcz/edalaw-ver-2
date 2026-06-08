import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Activity,
    BarChart3,
    Calendar,
    Download,
    MessageSquare,
    PieChart as PieChartIcon,
    Radio,
    Shield,
    Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isDashboard = path === '/dashboard/jail-officer' || path === '/dashboard';
    return [
        { title: 'Dashboard', href: '/dashboard' },
        { title: isDashboard ? 'Dashboard' : 'Analytics', href: '#' },
    ];
};

type OverviewCards = {
    active_sessions: number;
    pending_scheduled: number;
    tunnels_generated_today: number;
    currently_recording: number;
};

type VolumeItem = { period: string; visit: number; eburol: number };
type DurationDay = { date: string; avg_seconds: number; min_seconds: number; max_seconds: number };
type DurationType = { typ: string; avg_sec: number; min_sec: number; max_sec: number };
type FlaggedItem = { date: string; auto: number; manual: number };
type TerminationRow = {
    id: number;
    session_type: string;
    visitor_name: string | null;
    ended_at: string | null;
    end_reason: string | null;
    status: string;
    flagged_messages: number;
};
type EnforcementRow = {
    id: number;
    visit_session_id: number;
    action: string;
    performed_by: number | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
};

type Props = {
    filters: { date_from?: string; date_to?: string; group_by?: string; visit_type?: string };
    overviewCards: OverviewCards;
    volumeOverTime: VolumeItem[];
    statusDistribution: Record<string, number>;
    durationByDay: DurationDay[];
    durationByType: DurationType[];
    flaggedTrend: FlaggedItem[];
    terminations: TerminationRow[];
    recordingSummary: { total_count: number; total_duration_hours: number };
    chatHeatmap: number[];
    enforcementLogs: EnforcementRow[];
    compliance: { percent: number; sessions_with_recording: number; completed_total: number };
};

const STATUS_COLORS: Record<string, string> = {
    scheduled: '#eab308',
    active: '#22c55e',
    completed: '#3b82f6',
    terminated: '#ef4444',
    locked: '#6b7280',
};

const ACTION_LABELS: Record<string, string> = {
    generate_inmate_tunnel: 'Tunnel generated',
    start_session: 'Session started',
    end_session: 'Session ended',
    lock_chat: 'Chat locked',
    unlock_chat: 'Chat unlocked',
    chat_message_flagged: 'Message flagged',
    chat_auto_flagged: 'Auto-flagged',
};

export default function Analytics({
    filters,
    overviewCards,
    volumeOverTime,
    statusDistribution,
    durationByDay,
    durationByType,
    flaggedTrend,
    terminations,
    recordingSummary,
    chatHeatmap,
    enforcementLogs,
    compliance,
}: Props) {
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [groupBy, setGroupBy] = useState(filters.group_by ?? 'day');
    const [visitType, setVisitType] = useState(filters.visit_type ?? 'all');

    const filterUrl = typeof window !== 'undefined' && window.location.pathname === '/dashboard/jail-officer'
        ? '/dashboard/jail-officer'
        : '/jail-officer/analytics';

    const applyFilters = () => {
        router.get(filterUrl, {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            group_by: groupBy,
            visit_type: visitType === 'all' ? undefined : visitType,
        }, { preserveState: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        window.location.href = `/jail-officer/analytics/export/csv?${params.toString()}`;
    };

    const statusPieData = useMemo(() => {
        return Object.entries(statusDistribution).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? '#94a3b8' }));
    }, [statusDistribution]);

    const volumeChartData = useMemo(() => {
        return volumeOverTime.map((v) => ({
            period: v.period,
            Visit: v.visit,
            'E-Burol': v.eburol,
        }));
    }, [volumeOverTime]);

    const durationChartData = useMemo(() => {
        return durationByDay.map((d) => ({
            date: d.date,
            'Avg (min)': Math.round(d.avg_seconds / 60),
            'Min (min)': Math.round(d.min_seconds / 60),
            'Max (min)': Math.round(d.max_seconds / 60),
        }));
    }, [durationByDay]);

    const enforcementColumns: ColumnDef<EnforcementRow>[] = useMemo(() => [
        { accessorKey: 'visit_session_id', header: 'Session ID', cell: ({ row }) => `#${row.original.visit_session_id}` },
        { accessorKey: 'action', header: 'Action', cell: ({ row }) => ACTION_LABELS[row.original.action] ?? row.original.action },
        { accessorKey: 'created_at', header: 'When', cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
    ], []);

    const terminationsColumns: ColumnDef<TerminationRow>[] = useMemo(() => [
        { accessorKey: 'id', header: 'Session', cell: ({ row }) => `#${row.original.id}` },
        { accessorKey: 'session_type', header: 'Type', cell: ({ row }) => row.original.session_type === 'visit' ? 'Visit' : 'E-Burol' },
        { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
        { accessorKey: 'ended_at', header: 'Ended', cell: ({ row }) => row.original.ended_at ? new Date(row.original.ended_at).toLocaleString() : '—' },
        { accessorKey: 'end_reason', header: 'End reason', cell: ({ row }) => row.original.end_reason ?? '—' },
        { accessorKey: 'flagged_messages', header: 'Flagged', cell: ({ row }) => row.original.flagged_messages },
    ], []);

    return (
        <AppLayout breadcrumbs={getBreadcrumbs()}>
            <Head title="Dashboard Analytics" />
            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Dashboard Analytics</h1>
                        <p className="text-muted-foreground">Real-time oversight and historical performance</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="grid gap-1">
                            <Label className="text-xs">From</Label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">To</Label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
                        </div>
                        <Button variant="outline" size="sm" onClick={applyFilters}>
                            <Calendar className="mr-1 h-4 w-4" />
                            Apply
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const today = new Date().toISOString().slice(0, 10);
                                const monthAgo = new Date();
                                monthAgo.setDate(monthAgo.getDate() - 30);
                                setDateFrom(monthAgo.toISOString().slice(0, 10));
                                setDateTo(today);
                            }}
                        >
                            Clear
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportCsv}>
                            <Download className="mr-1 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* (1) Overview Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overviewCards.active_sessions}</div>
                            <p className="text-xs text-muted-foreground">Currently in progress</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Scheduled</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overviewCards.pending_scheduled}</div>
                            <p className="text-xs text-muted-foreground">Upcoming assigned</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tunnels Today</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overviewCards.tunnels_generated_today}</div>
                            <p className="text-xs text-muted-foreground">PDL links generated</p>
                        </CardContent>
                    </Card>
                </div>



                <div className="grid gap-6 lg:grid-cols-2">
                    {/* (4) Call Duration Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Call Duration (minutes) by Day</CardTitle>
                            <CardDescription>Avg, min, max per day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={durationChartData}>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Avg (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Min (min)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Max (min)" fill="#eab308" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* (5) Call Duration by Type */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Call Duration (minutes) by Type</CardTitle>
                            <CardDescription>Avg, min, max per type</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={durationByType.map((d) => ({
                                        typ: d.typ,
                                        'Avg (min)': Math.round(d.avg_sec / 60),
                                        'Min (min)': Math.round(d.min_sec / 60),
                                        'Max (min)': Math.round(d.max_sec / 60),
                                    }))}>
                                        <XAxis dataKey="typ" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Avg (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Min (min)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Max (min)" fill="#eab308" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* (6) Chat Activity Heatmap */}
                <Card>
                    <CardHeader>
                        <CardTitle>Chat Activity by Hour</CardTitle>
                        <CardDescription>Peak messaging hours (0–23)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1">
                            {chatHeatmap.map((count, hour) => {
                                const max = Math.max(...chatHeatmap, 1);
                                const intensity = count / max;
                                return (
                                    <div
                                        key={hour}
                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-xs"
                                        style={{
                                            backgroundColor: `rgb(59 130 246 / ${0.2 + intensity * 0.8})`,
                                            color: intensity > 0.5 ? 'white' : 'inherit',
                                        }}
                                        title={`${hour}:00 – ${count} messages`}
                                    >
                                        {hour}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* (7) Violations & Terminations Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Violations & Terminations</CardTitle>
                        <CardDescription>Sessions ended with end reason and flagged count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={terminationsColumns} data={terminations} />
                    </CardContent>
                </Card>

                {/* (8) Monitor Enforcement Activity Log */}
                <Card>
                    <CardHeader>
                        <CardTitle>Enforcement Activity Log</CardTitle>
                        <CardDescription>Mute, removals, tunnels, exports, terminations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={enforcementColumns} data={enforcementLogs} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
