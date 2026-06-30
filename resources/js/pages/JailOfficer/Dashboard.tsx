import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Columns3,
    Download,
    Filter,
    Flag,
    Heart,
    LayoutDashboard,
    PersonStanding,
    ShieldAlert,
    TrendingUp,
    UserCheck,
    Users,
    UserX,
    Video,
    Warehouse,
    XCircle,
} from 'lucide-react';
import type { ElementType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

interface DashboardProps {
    scopeSummary: {
        total_dormitories: number;
        total_buildings: number;
        total_cells: number;
        total_pdls: number;
    };
    kpis: {
        total_pdls: number;
        occupied_cells: number;
        available_cells: number;
        pending_visits: number;
        pending_eburols: number;
        active_sessions: number;
        today_visits: number;
    };
    visitVolume: Array<{ date: string; count: number }>;
    pdlDistribution: Array<{ name: string; count: number; capacity: number }>;
    cellOccupancy: Array<{
        cell: string;
        occupied: number;
        capacity: number;
        percentage: number;
    }>;
    sessionStats: { completed: number; active: number; flagged: number };
    recentActivities: Array<{
        id: number;
        type: string;
        title: string;
        description: string;
        status: string;
        created_at: string;
    }>;
    upcomingVisits: Array<{
        id: number;
        visitor_name: string;
        inmate_name: string;
        scheduled_date: string;
        scheduled_time: string;
        visit_type: string;
    }>;
    upcomingEburols: Array<{
        id: number;
        visitor_name: string;
        scheduled_date: string;
        scheduled_time: string;
    }>;
    pendingApprovals: Array<{
        id: number;
        visitor_name: string;
        inmate_name: string;
        scheduled_date: string;
        scheduled_time: string;
    }>;
    flaggedItems: Array<{
        id: number;
        message: string;
        severity: string;
        visitor_name: string;
        created_at: string;
    }>;
    facilityAlerts: Array<{
        type: string;
        title: string;
        description: string;
        severity: string;
    }>;
}

type MetricTone =
    | 'cyan'
    | 'green'
    | 'pink'
    | 'amber'
    | 'blue'
    | 'violet'
    | 'slate';

type MetricCardProps = {
    label: string;
    value: number | string;
    detail: string;
    icon: ElementType;
    tone: MetricTone;
};

const toneStyles: Record<MetricTone, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100',
    green: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100',
    pink: 'border-pink-200 bg-pink-50 text-pink-900 dark:border-pink-900 dark:bg-pink-950/30 dark:text-pink-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100',
    slate: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
};

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
    tone,
}: MetricCardProps) {
    return (
        <Card
            className={`overflow-hidden border ${toneStyles[tone]} shadow-none`}
        >
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium opacity-75">
                            {label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight">
                            {value}
                        </p>
                        <p className="mt-2 text-xs opacity-70">{detail}</p>
                    </div>
                    <div className="rounded-xl bg-background/70 p-2 shadow-sm">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
            {message}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: 'border-amber-200 bg-amber-50 text-amber-700',
        approved: 'border-green-200 bg-green-50 text-green-700',
        rejected: 'border-red-200 bg-red-50 text-red-700',
        completed: 'border-blue-200 bg-blue-50 text-blue-700',
        high: 'border-red-200 bg-red-50 text-red-700',
        medium: 'border-amber-200 bg-amber-50 text-amber-700',
        low: 'border-blue-200 bg-blue-50 text-blue-700',
    };

    return (
        <Badge
            variant="outline"
            className={`capitalize ${map[status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
        >
            {status}
        </Badge>
    );
}

function ActivityList({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: ElementType;
    children: React.ReactNode;
}) {
    return (
        <Card className="shadow-none">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export default function Dashboard({
    scopeSummary,
    kpis,
    visitVolume,
    pdlDistribution,
    cellOccupancy,
    sessionStats,
    recentActivities,
    upcomingVisits,
    upcomingEburols,
    pendingApprovals,
    flaggedItems,
    facilityAlerts,
}: DashboardProps) {
    const page = usePage<SharedData>();
    const user = page.props.auth?.user;
    const userName =
        (user?.name as string | undefined) ||
        [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
        'Officer';
    const [visitTypeFilter, setVisitTypeFilter] = useState('all');
    const [activityStatusFilter, setActivityStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');

    const {
        notifications: realTimeNotifications,
        requestNotificationPermission,
    } = useRealTimeNotifications();

    useEffect(() => {
        if (realTimeNotifications.length > 0) {
            const latestNotification = realTimeNotifications[0];

            toast.info(latestNotification.title, {
                description: latestNotification.message,
                duration: 8000,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.href = '/jail-officer/notifications';
                    },
                },
            });
        }
    }, [realTimeNotifications]);

    useEffect(() => {
        requestNotificationPermission();
    }, [requestNotificationPermission]);

    const today = new Date().toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const urgentAlertCount =
        facilityAlerts.filter((alert) => alert.severity === 'high').length +
        flaggedItems.filter((flag) => flag.severity === 'high').length;
    const maxVisit = Math.max(...visitVolume.map((item) => item.count), 1);
    const filteredVisits = useMemo(
        () =>
            upcomingVisits.filter(
                (visit) =>
                    visitTypeFilter === 'all' ||
                    visit.visit_type === visitTypeFilter,
            ),
        [upcomingVisits, visitTypeFilter],
    );
    const filteredActivities = useMemo(
        () =>
            recentActivities.filter(
                (activity) =>
                    activityStatusFilter === 'all' ||
                    activity.status === activityStatusFilter,
            ),
        [recentActivities, activityStatusFilter],
    );
    const filteredFlags = useMemo(
        () =>
            flaggedItems.filter(
                (item) =>
                    severityFilter === 'all' ||
                    item.severity === severityFilter,
            ),
        [flaggedItems, severityFilter],
    );
    const filteredAlerts = useMemo(
        () =>
            facilityAlerts.filter(
                (alert) =>
                    severityFilter === 'all' ||
                    alert.severity === severityFilter,
            ),
        [facilityAlerts, severityFilter],
    );

    const metrics: MetricCardProps[] = [
        {
            label: 'Total PDLs',
            value: kpis.total_pdls,
            detail: 'Assigned scope population',
            icon: Users,
            tone: 'cyan',
        },
        {
            label: 'Occupied Cells',
            value: kpis.occupied_cells,
            detail: 'Cells with active PDLs',
            icon: UserCheck,
            tone: 'green',
        },
        {
            label: 'Available Cells',
            value: kpis.available_cells,
            detail: 'Cells available in scope',
            icon: UserX,
            tone: 'blue',
        },
        {
            label: 'Pending Visits',
            value: kpis.pending_visits,
            detail: 'Awaiting review',
            icon: Calendar,
            tone: 'amber',
        },
        {
            label: 'Pending E-Burol',
            value: kpis.pending_eburols,
            detail: 'Requests needing action',
            icon: Heart,
            tone: 'pink',
        },
        {
            label: 'Active Sessions',
            value: kpis.active_sessions,
            detail: 'Live monitoring sessions',
            icon: Video,
            tone: 'violet',
        },
        {
            label: "Today's Visits",
            value: kpis.today_visits,
            detail: 'Scheduled today',
            icon: Clock,
            tone: 'slate',
        },
    ];

    return (
        <AppLayout>
            <Head title="Jail Officer Dashboard" />

            <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
                <div className="mx-auto max-w-[1600px] space-y-6">
                    <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <LayoutDashboard className="h-4 w-4" />
                                Operational dashboard
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Hello, {userName}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {today}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className="rounded-xl px-3 py-2"
                            >
                                Last 7 days analytics
                            </Badge>
                            {urgentAlertCount > 0 && (
                                <Badge
                                    variant="outline"
                                    className="rounded-xl border-red-200 bg-red-50 px-3 py-2 text-red-700"
                                >
                                    <ShieldAlert className="h-4 w-4" />
                                    {urgentAlertCount} urgent
                                </Badge>
                            )}
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4" />
                                Filters
                            </Button>
                            <Button size="sm">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border bg-card p-1 sm:w-fit">
                            <TabsTrigger
                                value="overview"
                                className="rounded-xl"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="rounded-xl">
                                Reports
                            </TabsTrigger>
                            <TabsTrigger
                                value="activities"
                                className="rounded-xl"
                            >
                                Activities
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                                {metrics.map((metric) => (
                                    <MetricCard
                                        key={metric.label}
                                        {...metric}
                                    />
                                ))}
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <TrendingUp className="h-4 w-4" />
                                            Visit volume trend
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {visitVolume.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <LineChart data={visitVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(value) =>
                                                            new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                        }
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        allowDecimals={false}
                                                    />
                                                    <Tooltip
                                                        labelFormatter={(value) =>
                                                            new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                                        }
                                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={2}
                                                        dot={{ fill: '#8b5cf6', r: 4 }}
                                                        activeDot={{ r: 6, fill: '#7c3aed' }}
                                                        name="Visits"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <EmptyState message="No visit data for this period" />
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Building2 className="h-4 w-4" />
                                            Assigned jurisdiction
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 sm:grid-cols-2">
                                        {[
                                            {
                                                icon: Building2,
                                                label: 'Dormitories',
                                                value: scopeSummary.total_dormitories,
                                            },
                                            {
                                                icon: Warehouse,
                                                label: 'Buildings',
                                                value: scopeSummary.total_buildings,
                                            },
                                            {
                                                icon: Columns3,
                                                label: 'Cells',
                                                value: scopeSummary.total_cells,
                                            },
                                            {
                                                icon: PersonStanding,
                                                label: 'PDLs',
                                                value: scopeSummary.total_pdls,
                                            },
                                        ].map(
                                            ({ icon: Icon, label, value }) => (
                                                <div
                                                    key={label}
                                                    className="rounded-2xl border bg-background p-4"
                                                >
                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                    <div className="mt-4 text-3xl font-semibold">
                                                        {value}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {label}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="reports" className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Card className="shadow-none lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Columns3 className="h-4 w-4" />
                                            Cell occupancy overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {cellOccupancy.length > 0 ? (
                                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                {cellOccupancy
                                                    .slice(0, 12)
                                                    .map((cell) => {
                                                        const barColor =
                                                            cell.percentage >=
                                                            90
                                                                ? 'bg-red-500'
                                                                : cell.percentage >=
                                                                    70
                                                                  ? 'bg-amber-500'
                                                                  : 'bg-green-500';
                                                        return (
                                                            <div
                                                                key={cell.cell}
                                                                className="rounded-2xl border bg-background p-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-medium">
                                                                        {
                                                                            cell.cell
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm font-semibold">
                                                                        {
                                                                            cell.percentage
                                                                        }
                                                                        %
                                                                    </p>
                                                                </div>
                                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className={`h-full rounded-full ${barColor}`}
                                                                        style={{
                                                                            width: `${cell.percentage}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <p className="mt-2 text-xs text-muted-foreground">
                                                                    {
                                                                        cell.occupied
                                                                    }{' '}
                                                                    of{' '}
                                                                    {
                                                                        cell.capacity
                                                                    }{' '}
                                                                    occupied
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <EmptyState message="No cell occupancy data" />
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Video className="h-4 w-4" />
                                            Session monitoring
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            {
                                                label: 'Completed',
                                                value: sessionStats.completed,
                                                tone: 'green' as MetricTone,
                                            },
                                            {
                                                label: 'Active',
                                                value: sessionStats.active,
                                                tone: 'blue' as MetricTone,
                                            },
                                            {
                                                label: 'Flagged',
                                                value: sessionStats.flagged,
                                                tone: 'amber' as MetricTone,
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className={`rounded-2xl border p-4 ${toneStyles[item.tone]}`}
                                            >
                                                <p className="text-sm opacity-70">
                                                    {item.label}
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold">
                                                    {item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <ActivityList
                                    title="PDL distribution by cell"
                                    icon={PersonStanding}
                                >
                                    {pdlDistribution.length > 0 ? (
                                        <div className="space-y-3">
                                            {pdlDistribution.map((cell) => {
                                                const pct = Math.round(
                                                    (cell.count /
                                                        Math.max(
                                                            cell.capacity,
                                                            1,
                                                        )) *
                                                        100,
                                                );
                                                return (
                                                    <div key={cell.name}>
                                                        <div className="mb-1 flex justify-between text-sm">
                                                            <span className="font-medium">
                                                                {cell.name}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {cell.count}/
                                                                {cell.capacity}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-foreground"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <EmptyState message="No distribution data" />
                                    )}
                                </ActivityList>

                                <ActivityList
                                    title="Facility alerts"
                                    icon={AlertTriangle}
                                >
                                    <div className="mb-4 flex gap-2">
                                        {['all', 'high', 'medium', 'low'].map(
                                            (severity) => (
                                                <Button
                                                    key={severity}
                                                    size="sm"
                                                    variant={
                                                        severityFilter ===
                                                        severity
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setSeverityFilter(
                                                            severity,
                                                        )
                                                    }
                                                >
                                                    {severity}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                    {filteredAlerts.length > 0 ? (
                                        <div className="space-y-3">
                                            {filteredAlerts.map(
                                                (alert, index) => (
                                                    <div
                                                        key={`${alert.title}-${index}`}
                                                        className="rounded-2xl border bg-background p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {
                                                                        alert.title
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    {
                                                                        alert.description
                                                                    }
                                                                </p>
                                                            </div>
                                                            <StatusBadge
                                                                status={
                                                                    alert.severity
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState message="No facility alerts for this filter" />
                                    )}
                                </ActivityList>
                            </div>
                        </TabsContent>

                        <TabsContent value="activities" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                                <ActivityList
                                    title="Recent activity"
                                    icon={Activity}
                                >
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {[
                                            'all',
                                            'pending',
                                            'approved',
                                            'completed',
                                            'rejected',
                                        ].map((status) => (
                                            <Button
                                                key={status}
                                                size="sm"
                                                variant={
                                                    activityStatusFilter ===
                                                    status
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    setActivityStatusFilter(
                                                        status,
                                                    )
                                                }
                                            >
                                                {status}
                                            </Button>
                                        ))}
                                    </div>
                                    {filteredActivities.length > 0 ? (
                                        <div className="space-y-3">
                                            {filteredActivities
                                                .slice(0, 10)
                                                .map((activity) => (
                                                    <div
                                                        key={activity.id}
                                                        className="rounded-2xl border bg-background p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {
                                                                        activity.title
                                                                    }
                                                                </p>
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    {
                                                                        activity.description
                                                                    }
                                                                </p>
                                                                <p className="mt-2 text-xs text-muted-foreground">
                                                                    {
                                                                        activity.created_at
                                                                    }
                                                                </p>
                                                            </div>
                                                            <StatusBadge
                                                                status={
                                                                    activity.status
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No recent activity for this filter" />
                                    )}
                                </ActivityList>

                                <ActivityList
                                    title="Upcoming visits"
                                    icon={Calendar}
                                >
                                    <div className="mb-4 flex gap-2">
                                        {['all', 'physical', 'virtual'].map(
                                            (type) => (
                                                <Button
                                                    key={type}
                                                    size="sm"
                                                    variant={
                                                        visitTypeFilter === type
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setVisitTypeFilter(type)
                                                    }
                                                >
                                                    {type}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                    {filteredVisits.length > 0 ? (
                                        <div className="space-y-3">
                                            {filteredVisits.map((visit) => (
                                                <Link
                                                    key={visit.id}
                                                    href={`/jail-officer/assigned-visit-sessions/${visit.id}`}
                                                    className="block rounded-2xl border bg-background p-4 transition hover:bg-muted/50"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-medium">
                                                                {
                                                                    visit.visitor_name
                                                                }
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                to{' '}
                                                                {
                                                                    visit.inmate_name
                                                                }
                                                            </p>
                                                            <p className="mt-2 text-xs text-muted-foreground">
                                                                {
                                                                    visit.scheduled_date
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    visit.scheduled_time
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <StatusBadge
                                                                status={
                                                                    visit.visit_type
                                                                }
                                                            />
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No upcoming visits for this filter" />
                                    )}
                                </ActivityList>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                <ActivityList
                                    title="Pending approvals"
                                    icon={UserCheck}
                                >
                                    {pendingApprovals.length > 0 ? (
                                        <div className="space-y-3">
                                            {pendingApprovals.map(
                                                (approval) => (
                                                    <div
                                                        key={approval.id}
                                                        className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                                                    >
                                                        <p className="font-medium text-amber-950">
                                                            {
                                                                approval.visitor_name
                                                            }
                                                        </p>
                                                        <p className="text-sm text-amber-800">
                                                            to{' '}
                                                            {
                                                                approval.inmate_name
                                                            }
                                                        </p>
                                                        <p className="mt-2 text-xs text-amber-700">
                                                            {
                                                                approval.scheduled_date
                                                            }{' '}
                                                            ·{' '}
                                                            {
                                                                approval.scheduled_time
                                                            }
                                                        </p>
                                                        <div className="mt-3 flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState message="All approvals are up to date" />
                                    )}
                                </ActivityList>

                                <ActivityList title="Flagged chats" icon={Flag}>
                                    {filteredFlags.length > 0 ? (
                                        <div className="space-y-3">
                                            {filteredFlags.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-2xl border bg-background p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {item.message}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {
                                                                    item.visitor_name
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    item.created_at
                                                                }
                                                            </p>
                                                        </div>
                                                        <StatusBadge
                                                            status={
                                                                item.severity
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No flagged incidents" />
                                    )}
                                </ActivityList>

                                <ActivityList
                                    title="Upcoming e-Burol"
                                    icon={Heart}
                                >
                                    {upcomingEburols.length > 0 ? (
                                        <div className="space-y-3">
                                            {upcomingEburols.map((eburol) => (
                                                <div
                                                    key={eburol.id}
                                                    className="rounded-2xl border bg-background p-4"
                                                >
                                                    <p className="font-medium">
                                                        {eburol.visitor_name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {eburol.scheduled_date}{' '}
                                                        ·{' '}
                                                        {eburol.scheduled_time}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No upcoming e-Burol schedules" />
                                    )}
                                </ActivityList>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}

interface LegacyOfficerDashboardProps {
    scopeSummary: {
        total_dormitories: number;
        total_buildings: number;
        total_cells: number;
        total_pdls: number;
    };
    kpis: {
        total_pdls: number;
        occupied_cells: number;
        available_cells: number;
        pending_visits: number;
        pending_eburols: number;
        active_sessions: number;
        today_visits: number;
    };
    visitVolume: Array<{ date: string; count: number }>;
    pdlDistribution: Array<{ name: string; count: number; capacity: number }>;
    cellOccupancy: Array<{
        cell: string;
        occupied: number;
        capacity: number;
        percentage: number;
    }>;
    sessionStats: { completed: number; active: number; flagged: number };
    recentActivities: Array<{
        id: number;
        type: string;
        title: string;
        description: string;
        status: string;
        created_at: string;
    }>;
    upcomingVisits: Array<{
        id: number;
        visitor_name: string;
        inmate_name: string;
        scheduled_date: string;
        scheduled_time: string;
        visit_type: string;
    }>;
    upcomingEburols: Array<{
        id: number;
        visitor_name: string;
        scheduled_date: string;
        scheduled_time: string;
    }>;
    pendingApprovals: Array<{
        id: number;
        visitor_name: string;
        inmate_name: string;
        scheduled_date: string;
        scheduled_time: string;
    }>;
    flaggedItems: Array<{
        id: number;
        message: string;
        severity: string;
        visitor_name: string;
        created_at: string;
    }>;
    facilityAlerts: Array<{
        type: string;
        title: string;
        description: string;
        severity: string;
    }>;
}

const SeverityDot = ({ severity }: { severity: string }) => {
    const map: Record<string, string> = {
        high: 'bg-red-500',
        medium: 'bg-amber-400',
        low: 'bg-blue-400',
    };
    return (
        <span
            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${map[severity] ?? 'bg-gray-400'}`}
        />
    );
};

const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
        case 'high':
            return 'bg-red-50 text-red-700 border border-red-200';
        case 'medium':
            return 'bg-amber-50 text-amber-700 border border-amber-200';
        case 'low':
            return 'bg-blue-50 text-blue-700 border border-blue-200';
        default:
            return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
};

const getStatusClass = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-amber-50 text-amber-700 border border-amber-200';
        case 'approved':
            return 'bg-green-50 text-green-700 border border-green-200';
        case 'rejected':
            return 'bg-red-50 text-red-700 border border-red-200';
        case 'completed':
            return 'bg-blue-50 text-blue-700 border border-blue-200';
        default:
            return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
};

function LegacyOfficerDashboard({
    scopeSummary,
    kpis,
    visitVolume,
    pdlDistribution,
    cellOccupancy,
    sessionStats,
    recentActivities,
    upcomingVisits,
    upcomingEburols,
    pendingApprovals,
    flaggedItems,
    facilityAlerts,
}: LegacyOfficerDashboardProps) {
    const page = usePage<SharedData>();
    const userName = (page.props.auth?.user?.name as string) ?? 'Officer';

    // Initialize real-time notifications
    const {
        notifications: realTimeNotifications,
        unreadCount: realTimeUnreadCount,
        setUnreadCount: setRealTimeUnreadCount,
        requestNotificationPermission,
    } = useRealTimeNotifications();

    // Show toast for new real-time notifications
    useEffect(() => {
        if (realTimeNotifications.length > 0) {
            const latestNotification = realTimeNotifications[0];

            // Show toast notification
            toast.info(latestNotification.title, {
                description: latestNotification.message,
                duration: 8000,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.href = '/jail-officer/notifications';
                    },
                },
            });
        }
    }, [realTimeNotifications]);

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    const maxVisit =
        visitVolume.length > 0
            ? Math.max(...visitVolume.map((v) => v.count), 1)
            : 1;
    const today = new Date().toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const urgentAlertCount =
        facilityAlerts.filter((a) => a.severity === 'high').length +
        flaggedItems.filter((f) => f.severity === 'high').length;

    return (
        <AppLayout>
            <Head title="Jail Officer Dashboard" />

            <div className="min-h-screen bg-gray-50">
                {/* ── Top Bar ── */}
                <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
                        <div>
                            <h1 className="text-lg font-medium text-gray-900">
                                Hello, {userName}
                            </h1>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {today}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {urgentAlertCount > 0 && (
                                <span className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    {urgentAlertCount}
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-gray-300 text-xs hover:bg-gray-50"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
                    {/* ── Jurisdiction Summary ── */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-medium tracking-wide text-gray-700 uppercase">
                                Assigned Jurisdiction
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {[
                                {
                                    icon: Building2,
                                    label: 'Dormitories',
                                    value: scopeSummary.total_dormitories,
                                },
                                {
                                    icon: Warehouse,
                                    label: 'Buildings',
                                    value: scopeSummary.total_buildings,
                                },
                                {
                                    icon: Columns3,
                                    label: 'Cells',
                                    value: scopeSummary.total_cells,
                                },
                                {
                                    icon: PersonStanding,
                                    label: 'PDLs',
                                    value: scopeSummary.total_pdls,
                                },
                            ].map(({ icon: Icon, label, value }) => (
                                <div
                                    key={label}
                                    className="border-l-2 border-gray-300 pl-4"
                                >
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {value}
                                    </div>
                                    <div className="mt-0.5 text-xs text-gray-600">
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── KPI Strip ── */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                        {[
                            {
                                label: 'Total PDLs',
                                value: kpis.total_pdls,
                                icon: Users,
                                color: 'text-blue-600',
                                bg: 'bg-blue-50',
                                border: 'border-blue-200',
                            },
                            {
                                label: 'Occupied Cells',
                                value: kpis.occupied_cells,
                                icon: UserCheck,
                                color: 'text-green-600',
                                bg: 'bg-green-50',
                                border: 'border-green-200',
                            },
                            {
                                label: 'Available Cells',
                                value: kpis.available_cells,
                                icon: UserX,
                                color: 'text-emerald-600',
                                bg: 'bg-emerald-50',
                                border: 'border-emerald-200',
                            },
                            {
                                label: 'Pending Visits',
                                value: kpis.pending_visits,
                                icon: Calendar,
                                color: 'text-amber-600',
                                bg: 'bg-amber-50',
                                border: 'border-amber-200',
                            },
                            {
                                label: 'Pending E-Burol',
                                value: kpis.pending_eburols,
                                icon: Heart,
                                color: 'text-rose-600',
                                bg: 'bg-rose-50',
                                border: 'border-rose-200',
                            },
                            {
                                label: 'Active Sessions',
                                value: kpis.active_sessions,
                                icon: Video,
                                color: 'text-purple-600',
                                bg: 'bg-purple-50',
                                border: 'border-purple-200',
                            },
                            {
                                label: "Today's Visits",
                                value: kpis.today_visits,
                                icon: Clock,
                                color: 'text-cyan-600',
                                bg: 'bg-cyan-50',
                                border: 'border-cyan-200',
                            },
                        ].map(
                            ({
                                label,
                                value,
                                icon: Icon,
                                color,
                                bg,
                                border,
                            }) => (
                                <div
                                    key={label}
                                    className={`border bg-white ${border} rounded-lg p-4`}
                                >
                                    <div
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg} mb-2.5`}
                                    >
                                        <Icon className={`h-4 w-4 ${color}`} />
                                    </div>
                                    <div className="mb-0.5 text-2xl font-semibold text-gray-900">
                                        {value}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {label}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>

                    {/* ── Analytics Row ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Visit Volume */}
                        <div className="rounded-lg border border-gray-200 bg-white p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-700" />
                                <h2 className="text-sm font-medium text-gray-900">
                                    Visit Volume — Last 7 Days
                                </h2>
                            </div>
                            {visitVolume.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={visitVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) =>
                                                new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            }
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            labelFormatter={(value) =>
                                                new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                            }
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#475569"
                                            strokeWidth={2}
                                            dot={{ fill: '#475569', r: 3 }}
                                            activeDot={{ r: 5, fill: '#334155' }}
                                            name="Visits"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="No visit data for this period" />
                            )}
                        </div>

                        {/* Session Stats */}
                        <div className="rounded-lg border border-gray-200 bg-white p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <Video className="h-4 w-4 text-gray-700" />
                                <h2 className="text-sm font-medium text-gray-900">
                                    Session Monitoring — Last 7 Days
                                </h2>
                            </div>
                            <div className="mb-5 grid grid-cols-3 gap-3">
                                {[
                                    {
                                        label: 'Completed',
                                        value: sessionStats.completed,
                                        color: 'text-green-600',
                                        bg: 'bg-green-50',
                                        border: 'border-green-200',
                                    },
                                    {
                                        label: 'Active',
                                        value: sessionStats.active,
                                        color: 'text-blue-600',
                                        bg: 'bg-blue-50',
                                        border: 'border-blue-200',
                                    },
                                    {
                                        label: 'Flagged',
                                        value: sessionStats.flagged,
                                        color: 'text-red-600',
                                        bg: 'bg-red-50',
                                        border: 'border-red-200',
                                    },
                                ].map(({ label, value, color, bg, border }) => (
                                    <div
                                        key={label}
                                        className={`${bg} ${border} rounded-lg border p-4 text-center`}
                                    >
                                        <div
                                            className={`text-3xl font-semibold ${color}`}
                                        >
                                            {value}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-600">
                                            {label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* PDL Distribution inside same card to fill space */}
                            <div className="border-t border-gray-200 pt-4">
                                <p className="mb-3 text-xs font-medium tracking-wide text-gray-700 uppercase">
                                    PDL Distribution by Cell
                                </p>
                                <div className="max-h-36 space-y-2.5 overflow-y-auto pr-1">
                                    {pdlDistribution.length > 0 ? (
                                        pdlDistribution.map((cell) => {
                                            const pct = Math.round(
                                                (cell.count /
                                                    Math.max(
                                                        cell.capacity,
                                                        1,
                                                    )) *
                                                    100,
                                            );
                                            const barColor =
                                                pct >= 90
                                                    ? 'bg-red-500'
                                                    : pct >= 70
                                                      ? 'bg-amber-500'
                                                      : 'bg-blue-500';
                                            return (
                                                <div
                                                    key={cell.name}
                                                    className="space-y-1"
                                                >
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium text-gray-700">
                                                            {cell.name}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            {cell.count}/
                                                            {cell.capacity}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                        <div
                                                            className={`${barColor} h-full rounded-full transition-all`}
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-gray-500">
                                            No distribution data
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Cell Occupancy ── */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Columns3 className="h-4 w-4 text-gray-700" />
                            <h2 className="text-sm font-medium text-gray-900">
                                Cell Occupancy Overview
                            </h2>
                            <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-600">
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400" />{' '}
                                    Normal
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-600" />{' '}
                                    High
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-900" />{' '}
                                    Critical
                                </span>
                            </div>
                        </div>
                        {cellOccupancy.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {cellOccupancy.slice(0, 8).map((cell) => {
                                    const fillColor =
                                        cell.percentage >= 90
                                            ? 'bg-red-500'
                                            : cell.percentage >= 70
                                              ? 'bg-amber-400'
                                              : 'bg-green-500';
                                    const textColor =
                                        cell.percentage >= 90
                                            ? 'text-red-600'
                                            : cell.percentage >= 70
                                              ? 'text-amber-600'
                                              : 'text-green-600';
                                    return (
                                        <div
                                            key={cell.cell}
                                            className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                                        >
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {cell.cell}
                                                </span>
                                                <span
                                                    className={`text-xs font-bold ${textColor}`}
                                                >
                                                    {cell.percentage}%
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className={`${fillColor} h-full rounded-full transition-all`}
                                                    style={{
                                                        width: `${cell.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-1.5 text-[11px] text-gray-400">
                                                {cell.occupied} /{' '}
                                                {cell.capacity} occupied
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState message="No cell occupancy data" />
                        )}
                    </div>

                    {/* ── Activity + Upcoming Split ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Recent Activity — wider */}
                        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-orange-50 p-1.5">
                                    <Activity className="h-4 w-4 text-orange-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Recent Activity
                                </h2>
                            </div>
                            {recentActivities.length > 0 ? (
                                <div className="max-h-80 space-y-1.5 overflow-y-auto">
                                    {recentActivities
                                        .slice(0, 10)
                                        .map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50"
                                            >
                                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="truncate text-sm font-medium text-gray-800">
                                                            {activity.title}
                                                        </p>
                                                        <span
                                                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusClass(activity.status)}`}
                                                        >
                                                            {activity.status}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs leading-snug text-gray-500">
                                                        {activity.description}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-gray-400">
                                                        {activity.created_at}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <EmptyState message="No recent activity to show" />
                            )}
                        </div>

                        {/* Upcoming Visits */}
                        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-blue-50 p-1.5">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Upcoming Visits
                                </h2>
                            </div>
                            {upcomingVisits.length > 0 ? (
                                <div className="max-h-80 space-y-2 overflow-y-auto">
                                    {upcomingVisits.map((visit) => (
                                        <Link
                                            key={visit.id}
                                            href={`/jail-officer/assigned-visit-sessions/${visit.id}`}
                                            className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-800">
                                                    {visit.visitor_name}
                                                </p>
                                                <p className="truncate text-xs text-gray-500">
                                                    → {visit.inmate_name}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
                                                    <Clock className="h-3 w-3" />
                                                    {visit.scheduled_date} ·{' '}
                                                    {visit.scheduled_time}
                                                </div>
                                            </div>
                                            <div className="flex flex-shrink-0 flex-col items-end gap-2">
                                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                    {visit.visit_type}
                                                </span>
                                                <ChevronRight className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-orange-500" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No upcoming visits scheduled" />
                            )}
                        </div>
                    </div>

                    {/* ── Action + Alerts Row ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Pending Approvals */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-amber-50 p-1.5">
                                    <UserCheck className="h-4 w-4 text-amber-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Pending Approvals
                                </h2>
                                {pendingApprovals.length > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                                        {pendingApprovals.length}
                                    </span>
                                )}
                            </div>
                            {pendingApprovals.length > 0 ? (
                                <div className="max-h-72 space-y-3 overflow-y-auto">
                                    {pendingApprovals.map((approval) => (
                                        <div
                                            key={approval.id}
                                            className="rounded-xl border border-amber-100 bg-amber-50 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-gray-900">
                                                        {approval.visitor_name}
                                                    </p>
                                                    <p className="truncate text-xs text-gray-500">
                                                        → {approval.inmate_name}
                                                    </p>
                                                </div>
                                                <span className="flex-shrink-0 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                    Pending
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                {approval.scheduled_date} ·{' '}
                                                {approval.scheduled_time}
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                                                    Approve
                                                </button>
                                                <button className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
                                                    <XCircle className="h-3.5 w-3.5" />{' '}
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="All approvals are up to date" />
                            )}
                        </div>

                        {/* Flagged Chats */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-red-50 p-1.5">
                                    <Flag className="h-4 w-4 text-red-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Flagged Chats & Incidents
                                </h2>
                                {flaggedItems.length > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                                        {flaggedItems.length}
                                    </span>
                                )}
                            </div>
                            {flaggedItems.length > 0 ? (
                                <div className="max-h-72 space-y-2.5 overflow-y-auto">
                                    {flaggedItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                                        >
                                            <div className="flex items-start gap-2">
                                                <SeverityDot
                                                    severity={item.severity}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs leading-snug font-medium text-gray-800">
                                                        {item.message}
                                                    </p>
                                                    <div className="mt-1.5 flex items-center justify-between">
                                                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                                            <Users className="h-3 w-3" />{' '}
                                                            {item.visitor_name}
                                                        </span>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${getSeverityBadgeClass(item.severity)}`}
                                                        >
                                                            {item.severity}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[10px] text-gray-400">
                                                        {item.created_at}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No flagged incidents" />
                            )}
                        </div>

                        {/* Facility Alerts */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-red-50 p-1.5">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Facility Alerts
                                </h2>
                                {facilityAlerts.length > 0 && (
                                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                                        {facilityAlerts.length}
                                    </span>
                                )}
                            </div>
                            {facilityAlerts.length > 0 ? (
                                <div className="max-h-72 space-y-2.5 overflow-y-auto">
                                    {facilityAlerts.map((alert, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-start gap-3 rounded-xl border p-3 ${getSeverityBadgeClass(alert.severity)}`}
                                        >
                                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold">
                                                    {alert.title}
                                                </p>
                                                <p className="mt-0.5 text-[11px] leading-snug opacity-80">
                                                    {alert.description}
                                                </p>
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] font-medium capitalize opacity-80">
                                                {alert.severity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No facility alerts" />
                            )}
                        </div>
                    </div>

                    {/* ── E-Burol Row ── */}
                    {upcomingEburols.length > 0 && (
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-lg bg-pink-50 p-1.5">
                                    <Heart className="h-4 w-4 text-pink-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800">
                                    Upcoming E-Burol Schedules
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {upcomingEburols.map((eburol) => (
                                    <div
                                        key={eburol.id}
                                        className="rounded-xl border border-pink-100 bg-pink-50 p-3"
                                    >
                                        <p className="text-sm font-medium text-gray-800">
                                            {eburol.visitor_name}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" />
                                            {eburol.scheduled_date} ·{' '}
                                            {eburol.scheduled_time}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}

function LegacyOfficerEmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <span className="text-lg leading-none text-gray-400">·</span>
            </div>
            <p className="text-xs text-gray-400">{message}</p>
        </div>
    );
}
