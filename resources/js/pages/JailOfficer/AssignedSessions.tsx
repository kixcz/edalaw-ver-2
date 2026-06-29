import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Camera, Eye, Lock, Mic, MicOff, MoreVertical, Power, Video, VideoOff, List, BarChart2, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
                        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
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
        terminated: { label: 'Terminated', className: 'bg-slate-100 text-slate-500 border-slate-200' },
        no_show: { label: 'No show', className: 'bg-orange-50 text-orange-700 border-orange-200' },
        unsuccessful: { label: 'Unsuccessful', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const config = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-500 border-slate-200' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.className}`}>{config.label}</span>;
}

type Props = {
    sessions: Session[];
    stats: { total_sessions: number; active_sessions: number; scheduled_sessions: number; completed_sessions: number; visit_sessions: number; eburol_sessions: number };
    chartData: { sessions_by_status: { status: string; count: number }[]; sessions_by_type: { type: string; count: number }[] };
    filters?: { type: string };
};

export default function AssignedSessions({ sessions, stats, chartData, filters: initialFilters }: Props) {
    useToast();
    const [typeFilter, setTypeFilter] = useState(initialFilters?.type ?? 'all');
    const [beforeScheduleSession, setBeforeScheduleSession] = useState<Session | null>(null);

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
                const { dateLabel, timeLabel } = s.scheduled_date && s.scheduled_time && s.visit_type
                    ? formatVisitSchedule(s.scheduled_date, s.scheduled_time, s.visit_type as 'virtual' | 'physical')
                    : formatSessionSchedule(s.scheduled_start, s.scheduled_end);
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{dateLabel}</div>
                        <div className="text-sm text-slate-500">{timeLabel}</div>
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
                    const now = Date.now();
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
            <Head title="Assigned Sessions" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-violet-600 rounded-xl"><Calendar className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Assigned Sessions</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Monitor virtual visits and e-burol sessions in your assigned areas</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <StatCard icon={<Calendar className="w-5 h-5" />} value={stats.total_sessions} label="Total Sessions" accent="bg-violet-600" iconBg="bg-violet-50" iconColor="text-violet-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_sessions} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<Clock className="w-5 h-5" />} value={stats.scheduled_sessions} label="Scheduled" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.completed_sessions} label="Completed" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<Video className="w-5 h-5" />} value={stats.visit_sessions} label="Visits" accent="bg-sky-600" iconBg="bg-sky-50" iconColor="text-sky-600" />
                        <StatCard icon={<Camera className="w-5 h-5" />} value={stats.eburol_sessions} label="E-Burols" accent="bg-purple-600" iconBg="bg-purple-50" iconColor="text-purple-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Sessions
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Session Records</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{filteredSessions.length} of {sessions.length} sessions</p>
                                    </div>
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Sessions by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution of session statuses</p>
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
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Sessions by Type</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Visit vs E-Burol distribution</p>
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
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <Dialog open={!!beforeScheduleSession} onOpenChange={(open) => !open && setBeforeScheduleSession(null)}>
                <DialogContent>
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
        </AppLayout>
    );
}
