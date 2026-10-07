import { Head, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Camera, Eye, Lock, Mic, MicOff, MoreVertical, Power, Video, VideoOff, List, BarChart2, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { formatVisitSchedule, formatSessionSchedule } from '@/lib/formatVisitSchedule';
import axios from 'axios';

function formatTimeUntil(startIso: string): string {
    const now = Date.now();
    const start = new Date(startIso).getTime();
    if (start <= now) return '';
    const diffMs = start - now;
    const totalMinutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

type Session = {
    id: number;
    visit_id: number | null;
    eburol_id: number | null;
    room_id: string;
    tunnel_short_code: string | null;
    visitor_name: string | null;
    inmate_name: string;
    type: string;
    cell_number: string;
    scheduled_start: string;
    scheduled_end: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    visit_type: string | null;
    schedule_ended: boolean;
    status: string;
    recording_status: string;
    started_at: string | null;
    ended_at: string | null;
    has_active_tunnel: boolean;
    has_tunnel: boolean;
    chat_locked: boolean;
};

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#94a3b8'];

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

function getStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        scheduled: { label: 'Scheduled', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        terminated: { label: 'Terminated', className: 'bg-muted text-muted-foreground border-border' },
        no_show: { label: 'No show', className: 'bg-orange-50 text-orange-700 border-orange-200' },
        unsuccessful: { label: 'Unsuccessful', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const config = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.className}`}>{config.label}</span>;
}

type Props = {
    sessions: Session[];
    stats: { total_sessions: number; active_sessions: number; scheduled_sessions: number; completed_sessions: number; visit_sessions: number; eburol_sessions: number };
    chartData: { 
        sessions_by_status: { status: string; count: number }[]; 
        sessions_by_type: { type: string; count: number }[];
        pdl_visitation: { status: string; count: number }[];
    };
    pdlList: { id: number; inmate_number: string; name: string; status: 'visited' | 'unvisited' }[];
    filters?: { type: string; start_date: string; end_date: string; month: string; year: string };
};

export default function AssignedSessions({ sessions, stats, chartData, pdlList = [], filters: initialFilters }: Props) {
    useToast();
    const { auth } = usePage().props as any;
    const userFullName = auth?.user ? `${auth.user.first_name || ''} ${auth.user.last_name || ''}`.trim() : 'System User';
    
    const [typeFilter, setTypeFilter] = useState(initialFilters?.type ?? 'all');
    const [startDateFilter, setStartDateFilter] = useState(initialFilters?.start_date ?? '');
    const [endDateFilter, setEndDateFilter] = useState(initialFilters?.end_date ?? '');
    const [monthFilter, setMonthFilter] = useState(initialFilters?.month ?? '');
    const [yearFilter, setYearFilter] = useState(initialFilters?.year ?? '');
    const [beforeScheduleSession, setBeforeScheduleSession] = useState<Session | null>(null);

    const [pdlStatusFilter, setPdlStatusFilter] = useState<'all' | 'visited' | 'unvisited'>('all');

    const handleApplyFilters = () => {
        router.get('/jail-officer/assigned-sessions', {
            type: typeFilter !== 'all' ? typeFilter : undefined,
            start_date: startDateFilter || undefined,
            end_date: endDateFilter || undefined,
            month: monthFilter || undefined,
            year: yearFilter || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const filteredPdls = useMemo(() => {
        if (pdlStatusFilter === 'all') return pdlList;
        return pdlList.filter(p => p.status === pdlStatusFilter);
    }, [pdlList, pdlStatusFilter]);

    const columns: ColumnDef<Session>[] = useMemo(() => [
        {
            accessorKey: 'tunnel_short_code',
            header: 'Tunnel code',
            cell: ({ row }) => (
                <span className="font-mono text-sm tracking-wider">{row.original.tunnel_short_code || '—'}</span>
            ),
        },
        { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => <span className="font-medium">{row.original.visitor_name ?? '—'}</span> },
        { accessorKey: 'inmate_name', header: 'PDL' },
        { accessorKey: 'type', header: 'Type', cell: ({ row }) => row.original.type === 'visit' ? 'Visit' : 'E-Burol' },
        {
            accessorKey: 'scheduled_start',
            header: 'Schedule',
            cell: ({ row }) => {
                const s = row.original;
                const { dateLabel, timeLabel } = formatSessionSchedule(s.scheduled_start, s.scheduled_end);
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{dateLabel}</div>
                        <div className="text-sm text-muted-foreground">{timeLabel}</div>
                    </div>
                );
            },
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => getStatusBadge(row.original.status) },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const s = row.original;
                const isCompleted = s.status === 'completed' || s.status === 'terminated';
                const joinDisabled = s.schedule_ended || s.status === 'no_show' || s.status === 'missed' || isCompleted;
                const joinReason = joinDisabled
                    ? (s.status === 'no_show' ? 'No show' : s.status === 'missed' ? 'Missed' : s.schedule_ended ? 'Session has ended' : 'Session ended')
                    : '';
                const handleJoinClick = () => {
                    if (joinDisabled) return;
                    const now = Date.now() + (5 * 60 * 1000); // 5-minute buffer for slow clocks
                    const start = new Date(s.scheduled_start).getTime();
                    if (start > now) {
                        setBeforeScheduleSession(s);
                        return;
                    }
                    window.open(`/jail-officer/assigned-sessions/${s.id}/join`, '_blank');
                };
                
                return (
                    <div className="flex items-center gap-2">
                        {!isCompleted && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-block">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={joinDisabled}
                                                onClick={handleJoinClick}
                                            >
                                                <Eye className="mr-1 h-4 w-4" />
                                                Join as observer
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {joinDisabled && <TooltipContent>{joinReason}</TooltipContent>}
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        
                        {s.status === 'active' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Session Controls</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleKillSession(s)} className="text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white">
                                        <Power className="mr-2 h-4 w-4" />
                                        Kill Session
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleMuteAudio(s)} className="gap-2 cursor-pointer">
                                        <MicOff className="mr-2 h-4 w-4" />
                                        Mute Audio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUnmuteAudio(s)} className="gap-2 cursor-pointer">
                                        <Mic className="mr-2 h-4 w-4" />
                                        Unmute Audio
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDisableCamera(s)} className="gap-2 cursor-pointer">
                                        <VideoOff className="mr-2 h-4 w-4" />
                                        Disable Camera
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEnableCamera(s)} className="gap-2 cursor-pointer">
                                        <Video className="mr-2 h-4 w-4" />
                                        Enable Camera
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => s.chat_locked ? handleUnlockChat(s) : handleLockChat(s)} className="gap-2 cursor-pointer">
                                        <Lock className="mr-2 h-4 w-4" />
                                        {s.chat_locked ? 'Unlock Chat' : 'Lock Chat'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                );
            },
        },
    ], []);

    const timeUntilStr = beforeScheduleSession ? formatTimeUntil(beforeScheduleSession.scheduled_start) : '';

    const handleKillSession = async (session: Session) => {
        if (!confirm('Are you sure you want to TERMINATE this active session? This action cannot be undone.')) return;
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/kill`);
            window.location.reload();
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to kill session');
        }
    };

    const handleMuteAudio = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/mute-audio`);
            alert('Audio mute command sent to all participants');
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to mute audio');
        }
    };

    const handleUnmuteAudio = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/unmute-audio`);
            alert('Audio unmute command sent to all participants');
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to unmute audio');
        }
    };

    const handleDisableCamera = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/disable-camera`);
            alert('Camera disable command sent to all participants');
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to disable camera');
        }
    };

    const handleEnableCamera = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/enable-camera`);
            alert('Camera enable command sent to all participants');
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to enable camera');
        }
    };

    const handleLockChat = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/lock-chat`);
            alert('Chat has been locked');
            window.location.reload();
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to lock chat');
        }
    };

    const handleUnlockChat = async (session: Session) => {
        try {
            await axios.post(`/jail-officer/assigned-sessions/${session.id}/unlock-chat`);
            alert('Chat has been unlocked');
            window.location.reload();
        } catch (error: any) {
            alert(error?.response?.data?.error || 'Failed to unlock chat');
        }
    };

    const filteredSessions = useMemo(() => {
        if (typeFilter === 'all') return sessions;
        return sessions.filter((s) => s.type === typeFilter);
    }, [sessions, typeFilter]);

    return (
        <AppLayout>
            <Head title="Virtual Sessions" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><CalendarIcon className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Virtual Sessions</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Monitor virtual visits and e-burol sessions in your assigned areas</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1 hidden sm:inline-block">From:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-[140px] h-9 justify-start text-left font-normal bg-white", !startDateFilter && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDateFilter ? format(new Date(startDateFilter + 'T12:00:00'), "PPP") : <span>Select date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={startDateFilter ? new Date(startDateFilter + 'T12:00:00') : undefined} onSelect={(date) => setStartDateFilter(date ? format(date, "yyyy-MM-dd") : '')} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1 hidden sm:inline-block">To:</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-[140px] h-9 justify-start text-left font-normal bg-white", !endDateFilter && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDateFilter ? format(new Date(endDateFilter + 'T12:00:00'), "PPP") : <span>Select date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={endDateFilter ? new Date(endDateFilter + 'T12:00:00') : undefined} onSelect={(date) => setEndDateFilter(date ? format(date, "yyyy-MM-dd") : '')} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
                            <Select value={monthFilter} onValueChange={setMonthFilter}>
                                <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Month" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Any Month</SelectItem>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <SelectItem key={i + 1} value={String(i + 1)}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={yearFilter} onValueChange={setYearFilter}>
                                <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Any Year</SelectItem>
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <SelectItem key={i} value={String(new Date().getFullYear() - i)}>{new Date().getFullYear() - i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={() => {
                                if (monthFilter === 'none') setMonthFilter('');
                                if (yearFilter === 'none') setYearFilter('');
                                handleApplyFilters();
                            }} className="h-9 bg-primary text-white">Filter</Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<CalendarIcon className="w-5 h-5" />} value={stats.total_sessions} label="Total Sessions" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_sessions} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<Clock className="w-5 h-5" />} value={stats.scheduled_sessions} label="Scheduled" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.completed_sessions} label="Completed" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Sessions
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Session Records</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{filteredSessions.length} of {sessions.length} sessions</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 hidden sm:flex">
                                            <Printer className="w-4 h-4 mr-2" />
                                            Print Visits
                                        </Button>
                                        <Select value={typeFilter} onValueChange={(val) => {
                                            setTypeFilter(val);
                                            router.get('/jail-officer/assigned-sessions', {
                                                type: val !== 'all' ? val : undefined,
                                                start_date: startDateFilter || undefined,
                                                end_date: endDateFilter || undefined,
                                                month: monthFilter || undefined,
                                                year: yearFilter || undefined,
                                            }, { preserveState: true, preserveScroll: true });
                                        }}>
                                            <SelectTrigger className="w-[180px] h-9">
                                                <SelectValue placeholder="Session type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All sessions</SelectItem>
                                                <SelectItem value="visit">Virtual visit</SelectItem>
                                                <SelectItem value="eburol">E-Burol</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <DataTable
                                        columns={columns}
                                        data={filteredSessions}
                                        searchKey="session_search"
                                        searchPlaceholder="Search by visitor, inmate, type..."
                                        initialSorting={[{ id: 'scheduled_start', desc: true }]}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">PDL Visitation</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Visited vs Unvisited PDLs in scope</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie 
                                                    data={chartData.pdl_visitation} 
                                                    dataKey="count" 
                                                    nameKey="status" 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    outerRadius={90}
                                                    label={({ value, percent }) => value > 0 ? `${value} (${(percent * 100).toFixed(0)}%)` : ''}
                                                >
                                                    <RechartsCell key="0" fill="#10b981" />
                                                    <RechartsCell key="1" fill="#3b82f6" />
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Sessions by Status</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of session statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.sessions_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.sessions_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Sessions by Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Visit vs E-Burol distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.sessions_by_type} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Sessions" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-0 shadow-sm mt-4">
                                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm">PDL Visitation List</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">List of PDLs and their visitation status</p>
                                    </div>
                                    <Select value={pdlStatusFilter} onValueChange={(val: any) => setPdlStatusFilter(val)}>
                                        <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All PDLs</SelectItem>
                                            <SelectItem value="visited">Visited</SelectItem>
                                            <SelectItem value="unvisited">Unvisited</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="p-0 overflow-auto max-h-[400px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="text-left font-medium p-3 pl-6 text-muted-foreground">PDL Name</th>
                                                <th className="text-left font-medium p-3 text-muted-foreground">Inmate Number</th>
                                                <th className="text-right font-medium p-3 pr-6 text-muted-foreground">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPdls.map(pdl => (
                                                <tr key={pdl.id} className="border-b border-border hover:bg-muted/30">
                                                    <td className="p-3 pl-6 font-medium">{pdl.name}</td>
                                                    <td className="p-3 font-mono text-xs text-muted-foreground">{pdl.inmate_number || '—'}</td>
                                                    <td className="p-3 pr-6 text-right">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${pdl.status === 'visited' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground border-border'}`}>
                                                            {pdl.status === 'visited' ? 'Visited' : 'Unvisited'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredPdls.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-6 text-center text-muted-foreground">No PDLs found for this filter.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <Dialog open={!!beforeScheduleSession} onOpenChange={(open) => !open && setBeforeScheduleSession(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Session not started yet</DialogTitle>
                        <DialogDescription>
                            {timeUntilStr
                                ? `This session starts in ${timeUntilStr}. You can wait and try again when it's time, or cancel.`
                                : 'This session has not started yet.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBeforeScheduleSession(null)}>
                            Wait
                        </Button>
                        <Button variant="secondary" onClick={() => setBeforeScheduleSession(null)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Print View */}
            <style type="text/css">
                {`
                    @media print {
                        /* Hide the main UI wrapper completely */
                        .min-h-screen {
                            display: none !important;
                        }
                        
                        /* Hide common layout wrappers from AppLayout */
                        nav, aside, header, footer, .sidebar {
                            display: none !important;
                        }

                        /* Ensure layout containers shrink to fit only the print section */
                        html, body, #app, main {
                            display: block !important;
                            height: auto !important;
                            min-height: 0 !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }

                        /* Print section dictates the page flow */
                        #print-section {
                            display: block !important;
                            position: static !important;
                            width: 100%;
                            padding: 20px;
                        }
                        
                        @page { 
                            margin: 10mm; 
                        }
                    }
                `}
            </style>
            <div id="print-section" className="hidden print:block bg-white text-black">
                <div
                    style={{ padding: '0 0 20px 0', borderBottom: '2px solid #111827', marginBottom: '20px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                                src="/edalaw_logo.png"
                                alt="EDALaw"
                                style={{ height: '36px', width: 'auto' }}
                            />
                            <div style={{ width: '1px', height: '32px', background: '#D1D5DB' }} />
                            <img
                                src="/bjmp_logo.png"
                                alt="BJMP"
                                style={{ height: '36px', width: 'auto' }}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '3px' }}>
                                Print Date
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '0.06em' }}>
                                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '0.02em' }}>
                            Assigned Visits Report
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                            List of all {typeFilter === 'all' ? '' : typeFilter} sessions assigned to you.
                        </div>
                    </div>
                </div>

                <table className="w-full text-sm border-collapse mt-4">
                    <thead>
                        <tr>
                            <th className="border p-2 text-left font-bold bg-muted/50">Cell number</th>
                            <th className="border p-2 text-left font-bold bg-muted/50">PDL name</th>
                            <th className="border p-2 text-left font-bold bg-muted/50">Date</th>
                            <th className="border p-2 text-left font-bold bg-muted/50">Start time</th>
                            <th className="border p-2 text-left font-bold bg-muted/50">End time</th>
                            <th className="border p-2 text-left font-bold bg-muted/50">Visitor name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSessions.map((session) => (
                            <tr key={session.id}>
                                <td className="border p-2">{session.cell_number}</td>
                                <td className="border p-2">{session.inmate_name}</td>
                                <td className="border p-2">{session.scheduled_date || '—'}</td>
                                <td className="border p-2">{session.scheduled_start ? new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                <td className="border p-2">{session.scheduled_end ? new Date(session.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                <td className="border p-2">{session.visitor_name || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Prepared By Footer */}
                <div style={{ marginTop: '40px', paddingTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Prepared By
                        </div>
                        <div style={{ borderBottom: '1px solid #111827', margin: '0 auto 4px', width: '100%', height: '24px' }}></div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                            {userFullName}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
