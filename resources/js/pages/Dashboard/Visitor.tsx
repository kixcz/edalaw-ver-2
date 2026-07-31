import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppearance } from '@/hooks/use-appearance';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    Bell,
    Calendar,
    CheckCircle2,
    Download,
    Heart,
    LayoutGrid,
    List,
    MessageSquare,
    Moon,
    PhoneIncoming,
    PhoneOutgoing,
    Scale,
    Search,
    Sun,
    Video,
    XCircle,
} from 'lucide-react';
import type { ElementType } from 'react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Visitor', href: '/dashboard/visitor' },
];

type RecentSchedule = {
    id: number;
    scheduled_date: string;
    scheduled_time: string | null;
    visit_type: 'virtual' | 'physical';
    inmate_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'missed' | 'completed';
    meeting_link: string | null;
    join_url: string | null;
    created_at: string;
    can_join_video?: boolean;
    session_ended?: boolean;
};

type RecentCallLog = {
    id: number;
    phone_number: string;
    call_type: 'incoming' | 'outgoing' | 'video';
    call_date: string;
    duration: number | null;
    status: string;
};

type Props = {
    stats: {
        total_schedules: number;
        pending_schedules: number;
        approved_schedules: number;
        rejected_schedules: number;
        completed_schedules: number;
        missed_schedules: number;
    };
    visit_types: { physical: number; virtual: number };
    recent_schedules: RecentSchedule[];
    call_logs_stats: {
        total_calls: number;
        incoming_calls: number;
        outgoing_calls: number;
        video_calls: number;
        completed_calls: number;
        missed_calls: number;
        failed_calls: number;
    };
    recent_call_logs: RecentCallLog[];
    eburol_stats: {
        total_eburols: number;
        pending_eburols: number;
        approved_eburols: number;
        rejected_eburols: number;
        completed_eburols: number;
    };
    recent_eburols: Array<{
        id: number;
        deceased_name: string;
        inmate_name: string;
        relationship: string;
        wake_start_date: string;
        wake_end_date: string;
        status: 'pending' | 'approved' | 'rejected' | 'completed';
        created_at: string;
    }>;
    appeals_stats: {
        total_appeals: number;
        pending_appeals: number;
        approved_appeals: number;
        rejected_appeals: number;
    };
    feedback_stats: {
        total_feedback: number;
        pending_feedback: number;
        reviewed_feedback: number;
        resolved_feedback: number;
        in_progress_feedback: number;
        dismissed_feedback: number;
    };
    feedback_types: { complaints: number; suggestions: number };
};

const chartColors = ['#111827', '#6b7280', '#10b981', '#f59e0b', '#ef4444'];

function formatNumber(value: unknown) {
    return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getStatusBadge(status: string) {
    const classes: Record<string, string> = {
        approved: 'border-green-200 bg-green-50 text-green-700',
        rejected: 'border-red-200 bg-red-50 text-red-700',
        missed: 'border-red-200 bg-red-50 text-red-700',
        completed: 'border-blue-200 bg-blue-50 text-blue-700',
        pending: 'border-amber-200 bg-amber-50 text-amber-700',
    };

    return (
        <Badge
            variant="outline"
            className={`capitalize ${classes[status] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}
        >
            {status}
        </Badge>
    );
}

function getVisitTypeBadge(type: string) {
    return (
        <Badge
            variant="outline"
            className={
                type === 'virtual'
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : 'border-orange-200 bg-orange-50 text-orange-700'
            }
        >
            {type}
        </Badge>
    );
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number | string;
    label: string;
    accent: string;
    iconBg: string;
    iconColor: string;
    detail?: string;
}> = ({ icon, value, label, accent, iconBg, iconColor, detail }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground leading-none">
                            {formatNumber(value)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">
                            {label}
                        </div>
                        {detail ? (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                {detail}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {message}
        </div>
    );
}

function ScheduleCard({ schedule }: { schedule: RecentSchedule }) {
    const canJoinVideoCall = schedule.can_join_video === true;

    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-medium">
                        {formatDate(schedule.scheduled_date)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {schedule.scheduled_time
                            ? `at ${schedule.scheduled_time}`
                            : 'Time pending'}{' '}
                        · {schedule.inmate_name}
                    </p>
                    {schedule.visit_type === 'virtual' &&
                        schedule.status === 'approved' && (
                            <div className="mt-3 text-sm">
                                {canJoinVideoCall && schedule.join_url ? (
                                    <Button
                                        size="sm"
                                        asChild
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <a href={schedule.join_url}>
                                            <Video className="h-4 w-4" />
                                            Join Call
                                        </a>
                                    </Button>
                                ) : (
                                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                                        <Video className="h-4 w-4" />
                                        {schedule.session_ended
                                            ? 'Session ended'
                                            : 'Join available at scheduled time'}
                                    </span>
                                )}
                            </div>
                        )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(schedule.status)}
                    {getVisitTypeBadge(schedule.visit_type)}
                </div>
            </div>
        </div>
    );
}

export default function VisitorDashboard({
    stats,
    visit_types,
    recent_schedules,
    call_logs_stats,
    recent_call_logs,
    eburol_stats,
    recent_eburols,
    appeals_stats,
    feedback_stats,
    feedback_types,
}: Props) {
    const page = usePage();
    const unreadNotificationCount =
        (page.props as { unreadNotificationCount?: number })
            .unreadNotificationCount || 0;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const [statusFilter, setStatusFilter] = useState('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    useToast();
    useNotifications();

    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    const filteredSchedules = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return recent_schedules.filter((schedule) => {
            const matchesStatus =
                statusFilter === 'all' || schedule.status === statusFilter;
            const matchesType =
                visitTypeFilter === 'all' ||
                schedule.visit_type === visitTypeFilter;
            const matchesSearch =
                !query ||
                JSON.stringify(schedule).toLowerCase().includes(query);
            return matchesStatus && matchesType && matchesSearch;
        });
    }, [recent_schedules, searchTerm, statusFilter, visitTypeFilter]);

    const nextVisit =
        recent_schedules.find((schedule) => schedule.status === 'approved') ||
        recent_schedules[0];
    const visitTypeChartData = [
        { name: 'Physical', value: visit_types.physical },
        { name: 'Virtual', value: visit_types.virtual },
    ];
    const feedbackTypeChartData = [
        { name: 'Complaints', value: feedback_types.complaints },
        { name: 'Suggestions', value: feedback_types.suggestions },
    ];
    const callLogsChartData = [
        { name: 'Incoming', value: call_logs_stats.incoming_calls },
        { name: 'Outgoing', value: call_logs_stats.outgoing_calls },
        { name: 'Video', value: call_logs_stats.video_calls },
        { name: 'Missed', value: call_logs_stats.missed_calls },
        { name: 'Failed', value: call_logs_stats.failed_calls },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Visitor Dashboard" />

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl">
                                <LayoutGrid className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">
                                    Visitor Dashboard
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Track your visit schedules, e-Burol requests, appeals, calls, and feedback
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleTheme}
                                aria-label="Toggle theme"
                            >
                                {resolvedAppearance === 'dark' ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/visitor/notifications">
                                    <Bell className="h-4 w-4" />
                                    Notifications
                                    {unreadNotificationCount > 0 && (
                                        <Badge className="ml-1">
                                            {unreadNotificationCount}
                                        </Badge>
                                    )}
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                asChild
                                className="bg-primary hover:bg-primary/90 text-white shadow-sm"
                            >
                                <Link href="/visitor/schedule">
                                    <Calendar className="h-4 w-4" />
                                    Apply Visit
                                </Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                                <Link href="/visitor/eburol">
                                    <Heart className="h-4 w-4" />
                                    E-Burol
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={<Calendar className="w-5 h-5" />}
                            value={stats.total_schedules}
                            label="Schedules"
                            detail={`${stats.pending_schedules} pending · ${stats.approved_schedules} approved`}
                            accent="bg-primary"
                            iconBg="bg-primary/10"
                            iconColor="text-primary"
                        />
                        <StatCard
                            icon={<Heart className="w-5 h-5" />}
                            value={eburol_stats.total_eburols}
                            label="E-Burol"
                            detail={`${eburol_stats.pending_eburols} pending · ${eburol_stats.approved_eburols} approved`}
                            accent="bg-amber-500"
                            iconBg="bg-amber-50 dark:bg-amber-950/30"
                            iconColor="text-amber-600 dark:text-amber-400"
                        />
                        <StatCard
                            icon={<Scale className="w-5 h-5" />}
                            value={appeals_stats.total_appeals}
                            label="Appeals"
                            detail={`${appeals_stats.pending_appeals} pending · ${appeals_stats.approved_appeals} approved`}
                            accent="bg-emerald-500"
                            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                        />
                        <StatCard
                            icon={<MessageSquare className="w-5 h-5" />}
                            value={feedback_stats.total_feedback}
                            label="Feedback"
                            detail={`${feedback_stats.resolved_feedback} resolved · ${feedback_stats.pending_feedback} pending`}
                            accent="bg-sky-500"
                            iconBg="bg-sky-50 dark:bg-sky-950/30"
                            iconColor="text-sky-600 dark:text-sky-400"
                        />
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger
                                value="overview"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="activities"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <List className="w-4 h-4" />
                                Activities
                            </TabsTrigger>
                            <TabsTrigger
                                value="reports"
                                className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"
                            >
                                <BarChart2 className="w-4 h-4" />
                                Reports & Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Visit type overview</CardTitle>
                                        <CardDescription>
                                            Physical and virtual visits submitted by your account.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={visitTypeChartData}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    vertical={false}
                                                />
                                                <XAxis dataKey="name" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="value"
                                                    radius={[10, 10, 0, 0]}
                                                >
                                                    {visitTypeChartData.map((_, index) => (
                                                        <Cell
                                                            key={index}
                                                            fill={chartColors[index]}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Next schedule</CardTitle>
                                        <CardDescription>
                                            Your most relevant visit request.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {nextVisit ? (
                                            <ScheduleCard schedule={nextVisit} />
                                        ) : (
                                            <EmptyState message="No schedules yet" />
                                        )}
                                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                            <Button asChild variant="outline">
                                                <Link href="/visitor/schedule">
                                                    Visit management
                                                </Link>
                                            </Button>
                                            <Button asChild variant="outline">
                                                <Link href="/visitor/suggestions">
                                                    Send feedback
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="activities" className="space-y-6">
                            <Card className="border-0 shadow-sm">
                                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="font-semibold">Activity filters</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Filter visible schedules by status, type, or text.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                                            value={statusFilter}
                                            onChange={(event) =>
                                                setStatusFilter(event.target.value)
                                            }
                                        >
                                            <option value="all">All statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="completed">Completed</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="missed">Missed</option>
                                        </select>
                                        <select
                                            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                                            value={visitTypeFilter}
                                            onChange={(event) =>
                                                setVisitTypeFilter(event.target.value)
                                            }
                                        >
                                            <option value="all">All visit types</option>
                                            <option value="physical">Physical</option>
                                            <option value="virtual">Virtual</option>
                                        </select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                className="h-10 rounded-md border border-border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary"
                                                value={searchTerm}
                                                onChange={(event) =>
                                                    setSearchTerm(event.target.value)
                                                }
                                                placeholder="Search activity"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Recent schedules</CardTitle>
                                        <CardDescription>
                                            Your latest visit schedule requests.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {filteredSchedules.length > 0 ? (
                                            <div className="space-y-3">
                                                {filteredSchedules.map((schedule) => (
                                                    <ScheduleCard
                                                        key={schedule.id}
                                                        schedule={schedule}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState message="No schedules match the selected filters" />
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader>
                                            <CardTitle>Recent calls</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {recent_call_logs.length > 0 ? (
                                                <div className="space-y-3">
                                                    {recent_call_logs.map((log) => (
                                                        <div
                                                            key={log.id}
                                                            className="rounded-xl border border-border bg-background p-4"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3">
                                                                    {log.call_type === 'incoming' ? (
                                                                        <PhoneIncoming className="mt-1 h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <PhoneOutgoing className="mt-1 h-4 w-4 text-blue-600" />
                                                                    )}
                                                                    <div>
                                                                        <p className="font-medium">
                                                                            {log.phone_number}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {new Date(
                                                                                log.call_date,
                                                                            ).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="capitalize"
                                                                >
                                                                    {log.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState message="No call logs yet" />
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-sm">
                                        <CardHeader>
                                            <CardTitle>Recent e-Burol requests</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {recent_eburols.length > 0 ? (
                                                <div className="space-y-3">
                                                    {recent_eburols.map((eburol) => (
                                                        <div
                                                            key={eburol.id}
                                                            className="rounded-xl border border-border bg-background p-4"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {eburol.deceased_name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        For {eburol.inmate_name}
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                                        {formatDate(eburol.wake_start_date)}{' '}
                                                                        - {formatDate(eburol.wake_end_date)}
                                                                    </p>
                                                                </div>
                                                                {getStatusBadge(eburol.status)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState message="No e-Burol requests yet" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="reports" className="space-y-6">
                            <div className="grid gap-4 lg:grid-cols-3">
                                <Card className="border-0 shadow-sm lg:col-span-2">
                                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <CardTitle>Call log performance</CardTitle>
                                            <CardDescription>
                                                Call type and status distribution.
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/visitor/call-logs">
                                                <Download className="h-4 w-4" />
                                                View logs
                                            </Link>
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <PieChart>
                                                <Pie
                                                    data={callLogsChartData.filter(
                                                        (item) => item.value > 0,
                                                    )}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={70}
                                                    outerRadius={110}
                                                    paddingAngle={3}
                                                >
                                                    {callLogsChartData.map((_, index) => (
                                                        <Cell
                                                            key={index}
                                                            fill={
                                                                chartColors[
                                                                    index % chartColors.length
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Report highlights</CardTitle>
                                        <CardDescription>
                                            Account totals across modules.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            ['Completed calls', call_logs_stats.completed_calls],
                                            ['Completed visits', stats.completed_schedules],
                                            ['Completed e-Burol', eburol_stats.completed_eburols],
                                            ['Resolved feedback', feedback_stats.resolved_feedback],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {label}
                                                </span>
                                                <span className="font-semibold">
                                                    {formatNumber(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Feedback type distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={feedbackTypeChartData}>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    vertical={false}
                                                />
                                                <XAxis dataKey="name" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="value"
                                                    fill="var(--primary)"
                                                    radius={[10, 10, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>E-Burol and appeals</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid w-full gap-3 sm:grid-cols-2">
                                        {[
                                            ['E-Burol pending', eburol_stats.pending_eburols, Heart],
                                            ['E-Burol approved', eburol_stats.approved_eburols, CheckCircle2],
                                            ['Appeals pending', appeals_stats.pending_appeals, Scale],
                                            ['Appeals rejected', appeals_stats.rejected_appeals, XCircle],
                                        ].map(([label, value, Icon]) => {
                                            const TypedIcon = Icon as ElementType;
                                            return (
                                                <div
                                                    key={String(label)}
                                                    className="rounded-xl border border-border bg-background p-4"
                                                >
                                                    <TypedIcon className="h-4 w-4 text-muted-foreground" />
                                                    <p className="mt-3 text-2xl font-semibold">
                                                        {formatNumber(value)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {String(label)}
                                                    </p>
                                                </div>
                                            );
                                        })}
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
