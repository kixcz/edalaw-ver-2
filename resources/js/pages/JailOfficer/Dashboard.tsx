import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Heart,
    Maximize2,
    MessageSquare,
    Monitor,
    Radio,
    ShieldAlert,
    TrendingUp,
    Users,
    Video,
    Warehouse,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
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
    todayActivities?: Array<{
        id: number;
        title: string;
        subtitle: string;
        time: string;
        type: 'physical' | 'virtual' | 'eburol';
        status: string;
    }>;
    activeSessionsList?: Array<{
        id: number;
        pdl_name: string;
        visitor_name: string;
        cell: string;
        started_at: string;
        visit_type: string;
    }>;
    completedSessionsList?: Array<{
        id: number;
        pdl_name: string;
        visitor_name: string;
        cell: string;
        ended_at: string;
        visit_type: string;
    }>;
    currentPeriod?: 'today' | 'week' | 'month';
    volumeTrend?: Array<{
        date: string;
        physical: number;
        virtual: number;
        eburol: number;
        total: number;
    }>;
    weekStatusCounts?: {
        completed: number;
        in_progress: number;
        approved: number;
        cancelled: number;
        missed: number;
    };
    totalWeekVisits?: number;
    attentionCounts?: {
        pending_visits: number;
        pending_eburols: number;
        flagged_communications: number;
        unresolved_incidents: number;
        scheduling_conflicts: number;
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

export default function Dashboard({
    scopeSummary,
    kpis,
    currentPeriod = 'week',
    todayActivities = [],
    activeSessionsList = [],
    completedSessionsList = [],
    upcomingVisits = [],
    upcomingEburols = [],
    volumeTrend = [],
    weekStatusCounts = {
        completed: 0,
        in_progress: 0,
        approved: 0,
        cancelled: 0,
        missed: 0,
    },
    totalWeekVisits = 0,
    attentionCounts,
    cellOccupancy = [],
    facilityAlerts = [],
    flaggedItems = [],
}: DashboardProps) {
    const page = usePage<SharedData>();
    const user = page.props.auth?.user;

    // Filters for today's operations tabs
    const [operationFilter, setOperationFilter] = useState<'all' | 'physical' | 'virtual' | 'eburol'>('all');
    const [liveSessionTab, setLiveSessionTab] = useState<'active' | 'upcoming' | 'completed'>('active');

    // Live clock ticker
    const [currentTime, setCurrentTime] = useState<string>('');
    const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentDateFormatted(
                now.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                })
            );
            setCurrentTime(
                `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })}`
            );
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Real-time notifications
    const {
        notifications: realTimeNotifications,
        requestNotificationPermission,
    } = useRealTimeNotifications();

    useEffect(() => {
        if (realTimeNotifications.length > 0) {
            const latest = realTimeNotifications[0];
            toast.info(latest.title, {
                description: latest.message,
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

    // Compute Requires Attention counts
    const attention = attentionCounts ?? {
        pending_visits: kpis.pending_visits,
        pending_eburols: kpis.pending_eburols,
        flagged_communications: flaggedItems.length,
        unresolved_incidents: facilityAlerts.length,
        scheduling_conflicts: 0,
    };

    // Filter today's operations
    const filteredTodayActivities = useMemo(() => {
        if (operationFilter === 'all') return todayActivities;
        return todayActivities.filter((act) => act.type === operationFilter);
    }, [todayActivities, operationFilter]);

    // Counts for pill buttons
    const todayCounts = useMemo(() => {
        return {
            all: todayActivities.length,
            physical: todayActivities.filter((a) => a.type === 'physical').length,
            virtual: todayActivities.filter((a) => a.type === 'virtual').length,
            eburol: todayActivities.filter((a) => a.type === 'eburol').length,
        };
    }, [todayActivities]);

    // Safe occupancy metrics
    const totalCells = Math.max(scopeSummary.total_cells, 1);
    const occupiedCells = kpis.occupied_cells;
    const occupancyPercentage = Math.round((occupiedCells / totalCells) * 100);

    // Live session tab counts
    const liveSessionCounts = useMemo(() => {
        return {
            active: activeSessionsList.length,
            upcoming: upcomingVisits.length + upcomingEburols.length,
            completed: completedSessionsList.length,
        };
    }, [activeSessionsList, upcomingVisits, upcomingEburols, completedSessionsList]);

    // Handle Period Change for Volume Trend, Visitation Status, and Header
    const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month') => {
        router.get(
            '/dashboard/jail-officer',
            { period: newPeriod },
            { preserveState: true, preserveScroll: true }
        );
    };

    const periodLabels: Record<string, string> = {
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
    };

    // Chart data fallback
    const chartData = useMemo(() => {
        if (volumeTrend && volumeTrend.length > 0) return volumeTrend;
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map((day) => ({
            date: day,
            physical: 0,
            virtual: 0,
            eburol: 0,
            total: 0,
        }));
    }, [volumeTrend]);

    // Visitation Status percentages for donut breakdown
    const statusItems = useMemo(() => {
        const total = totalWeekVisits > 0 ? totalWeekVisits : 0;
        const calcPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);
        return [
            {
                label: 'Completed',
                count: weekStatusCounts.completed,
                pct: calcPct(weekStatusCounts.completed),
                color: 'bg-emerald-500',
                textColor: 'text-emerald-700 dark:text-emerald-400',
            },
            {
                label: 'In Progress',
                count: weekStatusCounts.in_progress,
                pct: calcPct(weekStatusCounts.in_progress),
                color: 'bg-blue-500',
                textColor: 'text-blue-700 dark:text-blue-400',
            },
            {
                label: 'Approved',
                count: weekStatusCounts.approved,
                pct: calcPct(weekStatusCounts.approved),
                color: 'bg-amber-400',
                textColor: 'text-amber-700 dark:text-amber-400',
            },
            {
                label: 'Cancelled',
                count: weekStatusCounts.cancelled,
                pct: calcPct(weekStatusCounts.cancelled),
                color: 'bg-red-500',
                textColor: 'text-red-700 dark:text-red-400',
            },
            {
                label: 'Missed',
                count: weekStatusCounts.missed,
                pct: calcPct(weekStatusCounts.missed),
                color: 'bg-slate-400',
                textColor: 'text-slate-600 dark:text-slate-400',
            },
        ];
    }, [weekStatusCounts, totalWeekVisits]);

    // Donut stroke-dasharray values for SVG ring
    const donutSegments = useMemo(() => {
        const circumference = 2 * Math.PI * 38; // r = 38 => ~238.76
        let accumulatedPct = 0;

        return statusItems.map((item) => {
            const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPct / 100) * circumference);
            accumulatedPct += item.pct;

            const strokeColor =
                item.label === 'Completed'
                    ? '#10b981'
                    : item.label === 'In Progress'
                      ? '#3b82f6'
                      : item.label === 'Approved'
                        ? '#f59e0b'
                        : item.label === 'Cancelled'
                          ? '#ef4444'
                          : '#94a3b8';

            return {
                ...item,
                strokeDasharray,
                strokeDashoffset,
                strokeColor,
            };
        });
    }, [statusItems]);

    return (
        <AppLayout>
            <Head title="Operations Overview · Jail Officer Workspace" />

            <div className="min-h-screen bg-[#f8f9fa] dark:bg-background text-foreground pb-12">
                <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
                    {/* ──────────────────────────────────────────────────────────
                        TOP HEADER ROW: Title + Info Chips + Week Dropdown + Bell
                       ────────────────────────────────────────────────────────── */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground leading-tight">
                                Operations Overview
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                Visitation, monitoring and facility operations
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Today Date & Time Card */}
                            <div className="flex items-center gap-3 bg-white dark:bg-card border border-border/70 rounded-2xl px-4 py-2 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Today
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {currentDateFormatted || 'Today'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {currentTime || 'Philippine Standard Time'}
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Scope Pill */}
                            <div className="flex items-center gap-3 bg-white dark:bg-card border border-border/70 rounded-2xl px-4 py-2 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                                    <Radio className="w-4 h-4" />
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Assigned Scope
                                    </div>
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                            {scopeSummary.total_dormitories} Dormitory
                                        </span>
                                        <span className="text-muted-foreground">·</span>
                                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                            {scopeSummary.total_buildings} Building
                                        </span>
                                        <span className="text-muted-foreground">·</span>
                                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                            {scopeSummary.total_cells} Cell
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Week Selector Dropdown Button */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2.5 bg-white dark:bg-card border border-border/70 rounded-2xl px-4 py-2 shadow-xs hover:border-border cursor-pointer transition text-left"
                                    >
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <div className="leading-tight">
                                            <div className="text-xs font-bold text-foreground flex items-center gap-1">
                                                {periodLabels[currentPeriod] || 'This Week'}
                                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                Current Cycle
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-36">
                                    <DropdownMenuItem
                                        onClick={() => handlePeriodChange('today')}
                                        className={currentPeriod === 'today' ? 'font-bold text-orange-600' : ''}
                                    >
                                        Today
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handlePeriodChange('week')}
                                        className={currentPeriod === 'week' ? 'font-bold text-orange-600' : ''}
                                    >
                                        This Week
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handlePeriodChange('month')}
                                        className={currentPeriod === 'month' ? 'font-bold text-orange-600' : ''}
                                    >
                                        This Month
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Launch TV Queue Display Shortcut Button */}
                            <Link
                                href="/jail-officer/visit-queue-tv"
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs rounded-2xl px-4 py-2.5 shadow-sm transition active:scale-95"
                            >
                                <Monitor className="w-4 h-4" />
                                <span className="hidden sm:inline">TV Queue</span>
                            </Link>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────
                        ROW 1: 6 KPI CARDS WITH PASTEL BACKGROUNDS & ACTION LINKS
                       ────────────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                        {/* 1. Pending Visit Approvals (Peach) */}
                        <div className="bg-[#fff9f6] dark:bg-orange-950/15 border border-orange-100/90 dark:border-orange-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-orange-100/80 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.pending_visits}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Pending Visit
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    Approvals
                                </div>
                                <Link
                                    href="/jail-officer/assigned-visit-sessions"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline mt-2.5"
                                >
                                    Review applications <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* 2. Pending e-Burol Requests (Light Peach / Coral) */}
                        <div className="bg-[#fff9f6] dark:bg-orange-950/15 border border-orange-100/90 dark:border-orange-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-orange-100/80 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.pending_eburols}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Pending e-Burol
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    Requests
                                </div>
                                <Link
                                    href="/jail-officer/eburol-monitoring"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline mt-2.5"
                                >
                                    Review requests <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* 3. Today's Scheduled Visits (Light Sky Blue) */}
                        <div className="bg-[#f5faff] dark:bg-blue-950/15 border border-blue-100/90 dark:border-blue-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.today_visits}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Today's Scheduled
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    Visits
                                </div>
                                <Link
                                    href="/jail-officer/assigned-visit-sessions"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2.5"
                                >
                                    View schedule <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* 4. Active Monitoring Sessions (Mint Green) */}
                        <div className="bg-[#f3fbf7] dark:bg-emerald-950/15 border border-emerald-100/90 dark:border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.active_sessions}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Active Monitoring
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    Sessions
                                </div>
                                <Link
                                    href="/jail-officer/assigned-sessions"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-2.5"
                                >
                                    Open live sessions <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* 5. Total PDLs (Lilac / Soft Violet) */}
                        <div className="bg-[#f9f8ff] dark:bg-purple-950/15 border border-purple-100/90 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-purple-100/80 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.total_pdls}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Total PDLs
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    In Assigned Scope
                                </div>
                                <Link
                                    href="/jail-officer/inmates-hierarchical"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline mt-2.5"
                                >
                                    View PDLs <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* 6. Occupied Cells (Rose / Soft Pink) */}
                        <div className="bg-[#fff6f6] dark:bg-rose-950/15 border border-rose-100/90 dark:border-rose-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition hover:shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-rose-100/80 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
                                    <Warehouse className="w-5 h-5" />
                                </div>
                                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                                    {kpis.occupied_cells}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-xs font-bold text-foreground">
                                    Occupied Cells
                                </div>
                                <div className="text-[11px] text-muted-foreground -mt-0.5">
                                    {kpis.occupied_cells} / {scopeSummary.total_cells} capacity
                                </div>
                                <Link
                                    href="/jail-officer/cells-hierarchical"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline mt-2.5"
                                >
                                    View facility <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────
                        ROW 2: THREE-COLUMN MIDDLE SECTION
                        Col 1: Requires Attention
                        Col 2: Today's Operations
                        Col 3: Live Session Monitoring
                       ────────────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* ── CARD 1: Requires Attention (3.5 cols) ── */}
                        <div className="lg:col-span-4 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                            !
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Requires Attention
                                        </h2>
                                    </div>
                                    <Link
                                        href="/jail-officer/assigned-visit-sessions"
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/80 rounded-xl px-2.5 py-1 transition"
                                    >
                                        View All
                                    </Link>
                                </div>

                                <div className="divide-y divide-border/60">
                                    {/* Item 1: Visit Approvals */}
                                    <Link
                                        href="/jail-officer/assigned-visit-sessions"
                                        className="flex items-center justify-between py-3.5 hover:bg-muted/40 px-2 rounded-xl transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center shrink-0">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition">
                                                    Visit Approvals
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    New visitation applications for review
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {attention.pending_visits}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>

                                    {/* Item 2: e-Burol Requests */}
                                    <Link
                                        href="/jail-officer/eburol-monitoring"
                                        className="flex items-center justify-between py-3.5 hover:bg-muted/40 px-2 rounded-xl transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center shrink-0">
                                                <Heart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition">
                                                    e-Burol Requests
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Compassionate visitation requests
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {attention.pending_eburols}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>

                                    {/* Item 3: Flagged Communications */}
                                    <Link
                                        href="/jail-officer/chat-recordings"
                                        className="flex items-center justify-between py-3.5 hover:bg-muted/40 px-2 rounded-xl transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center shrink-0">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition">
                                                    Flagged Communications
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Messages that require review
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {attention.flagged_communications}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>

                                    {/* Item 4: Unresolved Incidents */}
                                    <Link
                                        href="/jail-officer/audit-logs"
                                        className="flex items-center justify-between py-3.5 hover:bg-muted/40 px-2 rounded-xl transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center shrink-0">
                                                <ShieldAlert className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition">
                                                    Unresolved Incidents
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Monitoring incidents for investigation
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {attention.unresolved_incidents}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>

                                    {/* Item 5: Scheduling Conflicts */}
                                    <Link
                                        href="/jail-officer/cell-schedules"
                                        className="flex items-center justify-between py-3.5 hover:bg-muted/40 px-2 rounded-xl transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 flex items-center justify-center shrink-0">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition">
                                                    Scheduling Conflicts
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Conflicting or overlapping schedules
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {attention.scheduling_conflicts}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* ── CARD 2: Today's Operations (4 cols) ── */}
                        <div className="lg:col-span-4 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Today's Operations
                                        </h2>
                                    </div>
                                    <Link
                                        href="/jail-officer/assigned-visit-sessions"
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/80 rounded-xl px-2.5 py-1 transition"
                                    >
                                        View Schedule
                                    </Link>
                                </div>

                                {/* Filter Pills */}
                                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl mb-4 overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setOperationFilter('all')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            operationFilter === 'all'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        All{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${operationFilter === 'all' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {todayCounts.all}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setOperationFilter('physical')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            operationFilter === 'physical'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Physical{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${operationFilter === 'physical' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {todayCounts.physical}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setOperationFilter('virtual')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            operationFilter === 'virtual'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Virtual{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${operationFilter === 'virtual' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {todayCounts.virtual}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setOperationFilter('eburol')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            operationFilter === 'eburol'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        e-Burol{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${operationFilter === 'eburol' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {todayCounts.eburol}
                                        </span>
                                    </button>
                                </div>

                                {/* Content or Empty State */}
                                {filteredTodayActivities.length > 0 ? (
                                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                        {filteredTodayActivities.map((act) => (
                                            <div
                                                key={`${act.type}-${act.id}`}
                                                className="p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/60 transition flex items-center justify-between"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="text-xs font-bold text-foreground truncate">
                                                        {act.title}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {act.subtitle}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[11px] font-bold text-foreground">
                                                        {act.time}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] uppercase font-semibold mt-0.5 border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                                                    >
                                                        {act.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                                            <Calendar className="w-7 h-7 stroke-1" />
                                        </div>
                                        <div className="text-sm font-bold text-foreground">
                                            No scheduled activities today
                                        </div>
                                        <p className="text-xs text-muted-foreground max-w-[260px] mt-1">
                                            There are no visits, virtual sessions, or e-Burol sessions scheduled for today.
                                        </p>
                                        <Link
                                            href="/jail-officer/assigned-visit-sessions"
                                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 rounded-xl px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition shadow-2xs"
                                        >
                                            View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── CARD 3: Live Session Monitoring (4.5 cols) ── */}
                        <div className="lg:col-span-4 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Video className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Live Session Monitoring
                                        </h2>
                                    </div>
                                    <Link
                                        href="/jail-officer/assigned-sessions"
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/80 rounded-xl px-2.5 py-1 transition"
                                    >
                                        View All
                                    </Link>
                                </div>

                                {/* Active / Upcoming / Completed Filter Pills */}
                                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setLiveSessionTab('active')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            liveSessionTab === 'active'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Active{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${liveSessionTab === 'active' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {liveSessionCounts.active}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setLiveSessionTab('upcoming')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            liveSessionTab === 'upcoming'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Upcoming{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${liveSessionTab === 'upcoming' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {liveSessionCounts.upcoming}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setLiveSessionTab('completed')}
                                        className={`px-3 py-1 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                                            liveSessionTab === 'completed'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Completed{' '}
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${liveSessionTab === 'completed' ? 'bg-orange-600/70 text-white' : 'bg-muted text-foreground'}`}>
                                            {liveSessionCounts.completed}
                                        </span>
                                    </button>
                                </div>

                                {/* Tab Content: Active Sessions */}
                                {liveSessionTab === 'active' && (
                                    activeSessionsList.length > 0 ? (
                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                            {activeSessionsList.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className="p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/60 transition flex items-center justify-between"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-xs font-bold text-foreground truncate">
                                                                {session.pdl_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                                            Visitor: {session.visitor_name} · Cell {session.cell}
                                                        </div>
                                                    </div>
                                                    <Link
                                                        href="/jail-officer/assigned-sessions"
                                                        className="shrink-0 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-2xs transition"
                                                    >
                                                        Monitor
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                                                <Video className="w-7 h-7 stroke-1" />
                                            </div>
                                            <div className="text-sm font-bold text-foreground">
                                                No active sessions
                                            </div>
                                            <p className="text-xs text-muted-foreground max-w-[260px] mt-1">
                                                There are no ongoing virtual visitation or e-Burol sessions at the moment.
                                            </p>
                                            <Link
                                                href="/jail-officer/assigned-sessions"
                                                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 rounded-xl px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition shadow-2xs"
                                            >
                                                Go to Live Sessions <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )
                                )}

                                {/* Tab Content: Upcoming Sessions */}
                                {liveSessionTab === 'upcoming' && (
                                    (upcomingVisits.length > 0 || upcomingEburols.length > 0) ? (
                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                            {upcomingVisits.map((item) => (
                                                <div
                                                    key={`visit-${item.id}`}
                                                    className="p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/60 transition flex items-center justify-between"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                            <span className="text-xs font-bold text-foreground truncate">
                                                                {item.inmate_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                            Visitor: {item.visitor_name} · {item.scheduled_date}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-[11px] font-bold text-foreground">
                                                            {item.scheduled_time}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] uppercase font-semibold mt-0.5 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                                        >
                                                            {item.visit_type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                            {upcomingEburols.map((eburol) => (
                                                <div
                                                    key={`eburol-${eburol.id}`}
                                                    className="p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/60 transition flex items-center justify-between"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            <span className="text-xs font-bold text-foreground truncate">
                                                                e-Burol: {eburol.visitor_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                            Date: {eburol.scheduled_date}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-[11px] font-bold text-foreground">
                                                            {eburol.scheduled_time}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] uppercase font-semibold mt-0.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                        >
                                                            e-burol
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                                                <Calendar className="w-7 h-7 stroke-1" />
                                            </div>
                                            <div className="text-sm font-bold text-foreground">
                                                No upcoming sessions
                                            </div>
                                            <p className="text-xs text-muted-foreground max-w-[260px] mt-1">
                                                There are no scheduled visits or e-Burol sessions in the upcoming queue.
                                            </p>
                                            <Link
                                                href="/jail-officer/assigned-visit-sessions"
                                                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 rounded-xl px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition shadow-2xs"
                                            >
                                                View Schedule <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )
                                )}

                                {/* Tab Content: Completed Sessions */}
                                {liveSessionTab === 'completed' && (
                                    completedSessionsList.length > 0 ? (
                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                            {completedSessionsList.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className="p-3 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/60 transition flex items-center justify-between"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                            <span className="text-xs font-bold text-foreground truncate">
                                                                {session.pdl_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                            Visitor: {session.visitor_name} · Cell {session.cell}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-[11px] font-bold text-muted-foreground">
                                                            {session.ended_at}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] uppercase font-semibold mt-0.5 border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
                                                        >
                                                            {session.visit_type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                                                <Clock className="w-7 h-7 stroke-1" />
                                            </div>
                                            <div className="text-sm font-bold text-foreground">
                                                No completed sessions yet
                                            </div>
                                            <p className="text-xs text-muted-foreground max-w-[260px] mt-1">
                                                Completed visit records and finished monitoring logs will appear here.
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────
                        ROW 3: BOTTOM ANALYTICS ROW
                        Col 1: Facility Snapshot (3.5 cols)
                        Col 2: Visit Volume Trend (5 cols)
                        Col 3: Visitation Status (3.5 cols)
                       ────────────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* ── CARD 1: Facility Snapshot ── */}
                        <div className="lg:col-span-4 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Facility Snapshot
                                        </h2>
                                    </div>
                                    <Link
                                        href="/jail-officer/cells-hierarchical"
                                        className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/80 rounded-xl px-2.5 py-1 transition"
                                    >
                                        View Facilities
                                    </Link>
                                </div>

                                {/* 4 Pastel Scope Badges */}
                                <div className="grid grid-cols-4 gap-2 mb-5">
                                    {/* Dormitories */}
                                    <div className="bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100/80 dark:border-orange-900/40 rounded-2xl p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 text-orange-600 font-extrabold text-base">
                                            <Warehouse className="w-3.5 h-3.5" />
                                            {scopeSummary.total_dormitories}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                                            Dormitories
                                        </div>
                                    </div>

                                    {/* Buildings */}
                                    <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/40 rounded-2xl p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 text-blue-600 font-extrabold text-base">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {scopeSummary.total_buildings}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                                            Buildings
                                        </div>
                                    </div>

                                    {/* Cells */}
                                    <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 rounded-2xl p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 text-emerald-600 font-extrabold text-base">
                                            <Radio className="w-3.5 h-3.5" />
                                            {scopeSummary.total_cells}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                                            Cells
                                        </div>
                                    </div>

                                    {/* PDLs */}
                                    <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100/80 dark:border-purple-900/40 rounded-2xl p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1 text-purple-600 font-extrabold text-base">
                                            <Users className="w-3.5 h-3.5" />
                                            {scopeSummary.total_pdls}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                                            PDLs
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Split: Cell Occupancy progress bar vs Available Cells count */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                    <div>
                                        <div className="text-[11px] font-semibold text-muted-foreground">
                                            Cell Occupancy
                                        </div>
                                        <div className="text-2xl font-black text-foreground mt-0.5">
                                            {occupancyPercentage}%
                                        </div>
                                        {/* Red indicator bar matching image */}
                                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-1.5">
                                            {occupiedCells}/{totalCells} cells occupied
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] font-semibold text-muted-foreground">
                                            Available Cells
                                        </div>
                                        <div className="text-2xl font-black text-foreground mt-0.5">
                                            {kpis.available_cells}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-5">
                                            {kpis.available_cells} cells available
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── CARD 2: Visit Volume Trend ── */}
                        <div className="lg:col-span-5 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Visit Volume Trend
                                        </h2>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-muted-foreground border border-border/80 rounded-xl px-2.5 py-1 flex items-center gap-1 hover:border-border cursor-pointer transition"
                                            >
                                                {periodLabels[currentPeriod] || 'This Week'} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl w-32">
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('today')}
                                                className={currentPeriod === 'today' ? 'font-bold text-orange-600' : ''}
                                            >
                                                Today
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('week')}
                                                className={currentPeriod === 'week' ? 'font-bold text-orange-600' : ''}
                                            >
                                                This Week
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('month')}
                                                className={currentPeriod === 'month' ? 'font-bold text-orange-600' : ''}
                                            >
                                                This Month
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Responsive Line Chart */}
                                <div className="h-[185px] w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={{ stroke: '#e2e8f0' }}
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                domain={[0, 'dataMax + 2']}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                    fontSize: '11px',
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="physical"
                                                stroke="#f97316"
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: '#f97316' }}
                                                name="Physical Visits"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="virtual"
                                                stroke="#3b82f6"
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: '#3b82f6' }}
                                                name="Virtual Visits"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="eburol"
                                                stroke="#10b981"
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: '#10b981' }}
                                                name="e-Burol Sessions"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Custom Legend */}
                                <div className="flex items-center justify-center gap-6 pt-2 text-[11px] font-medium text-muted-foreground border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                        Physical Visits
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                        Virtual Visits
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        e-Burol Sessions
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── CARD 3: Visitation Status ── */}
                        <div className="lg:col-span-3 bg-white dark:bg-card border border-border/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-base font-bold text-foreground">
                                            Visitation Status
                                        </h2>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-muted-foreground border border-border/80 rounded-xl px-2.5 py-1 flex items-center gap-1 hover:border-border cursor-pointer transition"
                                            >
                                                {periodLabels[currentPeriod] || 'This Week'} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl w-32">
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('today')}
                                                className={currentPeriod === 'today' ? 'font-bold text-orange-600' : ''}
                                            >
                                                Today
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('week')}
                                                className={currentPeriod === 'week' ? 'font-bold text-orange-600' : ''}
                                            >
                                                This Week
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handlePeriodChange('month')}
                                                className={currentPeriod === 'month' ? 'font-bold text-orange-600' : ''}
                                            >
                                                This Month
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="grid grid-cols-12 gap-3 items-center">
                                    {/* Left: Donut Chart with Total Visits in Center */}
                                    <div className="col-span-5 flex items-center justify-center">
                                        <div className="relative w-28 h-28 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                {/* Background Track */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="38"
                                                    fill="transparent"
                                                    stroke="#f1f5f9"
                                                    strokeWidth="10"
                                                />
                                                {/* Colored Segments */}
                                                {donutSegments.map((seg) => (
                                                    <circle
                                                        key={seg.label}
                                                        cx="50"
                                                        cy="50"
                                                        r="38"
                                                        fill="transparent"
                                                        stroke={seg.strokeColor}
                                                        strokeWidth="10"
                                                        strokeDasharray={seg.strokeDasharray}
                                                        strokeDashoffset={seg.strokeDashoffset}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-700"
                                                    />
                                                ))}
                                            </svg>
                                            {/* Center Label */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                                                <span className="text-2xl font-black text-foreground">
                                                    {totalWeekVisits}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-semibold mt-1">
                                                    Total Visits
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status Table Breakdown */}
                                    <div className="col-span-7 space-y-1.5 pl-1">
                                        {statusItems.map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-sm ${item.color} shrink-0`} />
                                                    <span className="text-[11px] font-medium text-foreground">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-foreground">
                                                        {item.count}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground w-7 text-right">
                                                        {item.pct}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
