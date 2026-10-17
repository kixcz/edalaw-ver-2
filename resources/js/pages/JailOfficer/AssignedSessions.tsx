import { Head, usePage, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { 
    Camera, Eye, Lock, Mic, MicOff, MoreVertical, Power, Video, VideoOff, 
    List, BarChart2, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, 
    Printer, ChevronLeft, ChevronRight, CalendarDays, Filter, Settings2, UserCheck, 
    Plus, Trash2, Check, Layout, Columns, Sliders, Maximize2, ZoomIn, ZoomOut, 
    GripVertical, CheckSquare, Square, X, RotateCcw, Video as VideoIcon, Users as UsersIcon,
    Search, Download, Copy, Tv, CheckCircle, Radio, Bell, MapPin, Building2, ChevronDown, FileText, PlaySquare
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    const [activeTab, setActiveTab] = useState('sessions');
    const [selectedSession, setSelectedSession] = useState<Session | null>(() => sessions.length > 0 ? sessions[0] : null);
    const [detailTab, setDetailTab] = useState<'timeline' | 'notes'>('timeline');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusSubFilter, setStatusSubFilter] = useState<'all' | 'scheduled' | 'live' | 'completed' | 'no_show' | 'cancelled'>('all');
    const [dormFilter, setDormFilter] = useState('all');
    const [cellFilter, setCellFilter] = useState('all');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    // Split Screen & Page Layout Controls
    const [paperSize, setPaperSize] = useState<'A4_portrait' | 'A4_landscape' | 'Letter_portrait' | 'Letter_landscape'>('A4_landscape');
    const [zoomScale, setZoomScale] = useState<number>(100);
    const [activeConfigTab, setActiveConfigTab] = useState<'layout' | 'columns' | 'signatories'>('layout');
    const [facilityBranch, setFacilityBranch] = useState(() => auth?.user?.branch?.name || 'Digos City District Jail');
    const [logsheetCustomDate, setLogsheetCustomDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

    // Customizable Columns for Logsheet
    const defaultVisibleColumns = {
        index: true,
        visitor: true,
        mode: true,
        pdl: true,
        cell: true,
        date: true,
        time: true,
        status: true,
        officerInitials: true,
        remarks: false,
    };
    const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

    // Custom Additional Columns
    const [customColumns, setCustomColumns] = useState<{ id: string; title: string; defaultVal: string }[]>([]);
    const [newColTitle, setNewColTitle] = useState('');

    // Dynamic Prepared By
    const [preparedByName, setPreparedByName] = useState(() => userFullName || 'DUTY JAIL OFFICER');
    const [preparedByBadge, setPreparedByBadge] = useState(() => auth?.user?.badge_number || 'JO-00029');
    const [preparedByRole, setPreparedByRole] = useState(() => auth?.user?.role?.name || 'Jail Officer / Session Monitor');

    // Dynamic Additional Signatories
    const [signatories, setSignatories] = useState([
        {
            id: 'warden',
            label: 'Noted by / Facility Warden',
            name: 'JAIL WARDEN / SUPERVISOR',
            title: 'Bureau of Jail Management and Penology',
            enabled: true,
        },
        {
            id: 'regional',
            label: 'Reviewed by (Regional Supervisor)',
            name: 'REGIONAL DIRECTOR / SUPERVISOR',
            title: 'BJMP Regional Office',
            enabled: false,
        },
        {
            id: 'chief',
            label: 'Approved by (Chief, BJMP)',
            name: 'ATTY. CARLOS M. SANTOS',
            title: 'Chief, BJMP (Optional)',
            enabled: false,
        },
    ]);

    // Timetable & Calendar Navigation State
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - day; // Sunday start
        const sunday = new Date(today.setDate(diff));
        sunday.setHours(0, 0, 0, 0);
        return sunday;
    });

    // Sessions grouped by date string (YYYY-MM-DD)
    const sessionsByDate = useMemo(() => {
        const map = new Map<string, Session[]>();
        sessions.forEach((session) => {
            let dateKey = session.scheduled_date;
            if (!dateKey && session.scheduled_start) {
                dateKey = session.scheduled_start.split('T')[0];
            }
            if (dateKey) {
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(session);
            }
        });
        return map;
    }, [sessions]);

    // Week days calculation for weekly timetable
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate(),
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                isSelected: selectedDate === dateStr,
            });
        }
        return days;
    }, [currentWeekStart, selectedDate]);

    // Sessions for selected date
    const selectedDateSessions = useMemo(() => {
        const list = sessionsByDate.get(selectedDate) || [];
        return [...list].sort((a, b) => {
            const timeA = a.scheduled_time || (a.scheduled_start ? a.scheduled_start.substring(11, 16) : '');
            const timeB = b.scheduled_time || (b.scheduled_start ? b.scheduled_start.substring(11, 16) : '');
            return timeA.localeCompare(timeB);
        });
    }, [sessionsByDate, selectedDate]);

    // Calendar month grid calculation
    const monthCalendarGrid = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month filler days
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, daysInPrevMonth - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                dayNumber: d.getDate(),
                isCurrentMonth: false,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                sessions: sessionsByDate.get(dateStr) || [],
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                dayNumber: i,
                isCurrentMonth: true,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                sessions: sessionsByDate.get(dateStr) || [],
            });
        }

        // Next month filler days to complete rows (multiples of 7)
        const remainingDays = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remainingDays; i++) {
            const d = new Date(year, month + 1, i);
            const dateStr = d.toISOString().split('T')[0];
            days.push({
                date: d,
                dateStr,
                dayNumber: i,
                isCurrentMonth: false,
                isToday: new Date().toISOString().split('T')[0] === dateStr,
                sessions: sessionsByDate.get(dateStr) || [],
            });
        }

        return days;
    }, [currentMonth, sessionsByDate]);

    const prevWeek = () => {
        const next = new Date(currentWeekStart);
        next.setDate(next.getDate() - 7);
        setCurrentWeekStart(next);
    };

    const nextWeek = () => {
        const next = new Date(currentWeekStart);
        next.setDate(next.getDate() + 7);
        setCurrentWeekStart(next);
    };

    const goToCurrentWeek = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day;
        const sunday = new Date(today.setDate(diff));
        sunday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(sunday);
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const goToCurrentMonth = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today.toISOString().split('T')[0]);
    };

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
        return sessions.filter((s) => {
            // Type filter
            if (typeFilter !== 'all' && s.type !== typeFilter) return false;
            
            // Status Sub-filter pills (all, scheduled, live, completed, no_show, cancelled)
            if (statusSubFilter !== 'all') {
                if (statusSubFilter === 'live' && s.status !== 'active' && s.status !== 'ongoing') return false;
                if (statusSubFilter === 'scheduled' && s.status !== 'scheduled') return false;
                if (statusSubFilter === 'completed' && s.status !== 'completed') return false;
                if (statusSubFilter === 'no_show' && s.status !== 'no_show') return false;
                if (statusSubFilter === 'cancelled' && s.status !== 'cancelled' && s.status !== 'terminated' && s.status !== 'unsuccessful') return false;
            }

            // Dorm Filter
            if (dormFilter !== 'all' && s.cell_number && !s.cell_number.toLowerCase().includes(dormFilter.toLowerCase())) {
                return false;
            }

            // Cell Filter
            if (cellFilter !== 'all' && s.cell_number && !s.cell_number.toLowerCase().includes(cellFilter.toLowerCase())) {
                return false;
            }

            // Search query filter (visitor, PDL, tunnel code, ref number)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const vName = (s.visitor_name || '').toLowerCase();
                const pName = (s.inmate_name || '').toLowerCase();
                const tCode = (s.tunnel_short_code || '').toLowerCase();
                const rCode = `v-${s.id}`.toLowerCase();
                const cell = (s.cell_number || '').toLowerCase();
                return vName.includes(q) || pName.includes(q) || tCode.includes(q) || rCode.includes(q) || cell.includes(q);
            }

            return true;
        });
    }, [sessions, typeFilter, statusSubFilter, dormFilter, cellFilter, searchQuery]);

    // Unique dorms & cells for dropdown filters
    const availableDorms = useMemo(() => {
        const set = new Set<string>();
        sessions.forEach(s => {
            if (s.cell_number) {
                const parts = s.cell_number.split('•');
                const dormPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                if (dormPart) set.add(dormPart);
            }
        });
        return Array.from(set);
    }, [sessions]);

    const availableCells = useMemo(() => {
        const set = new Set<string>();
        sessions.forEach(s => {
            if (s.cell_number) {
                const parts = s.cell_number.split('•');
                const cellPart = parts[0].trim();
                if (cellPart) set.add(cellPart);
            }
        });
        return Array.from(set);
    }, [sessions]);

    // Status counts for pills
    const statusCounts = useMemo(() => {
        return {
            all: sessions.length,
            scheduled: sessions.filter(s => s.status === 'scheduled').length,
            live: sessions.filter(s => s.status === 'active' || s.status === 'ongoing').length,
            completed: sessions.filter(s => s.status === 'completed').length,
            no_show: sessions.filter(s => s.status === 'no_show').length,
            cancelled: sessions.filter(s => s.status === 'cancelled' || s.status === 'terminated' || s.status === 'unsuccessful').length,
        };
    }, [sessions]);

    return (
        <AppLayout>
            <Head title="Virtual Sessions" />
            <div className="min-h-screen bg-slate-50/60 pb-12">
                {/* Modern Top Bar / Header */}
                <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-30 shadow-xs">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <span className="font-medium text-slate-600">eDalaw+</span>
                                <span>&rsaquo;</span>
                                <span className="text-slate-900 font-semibold">Virtual Sessions</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Virtual Sessions</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Monitor and manage virtual visits with PDLs in your assigned areas.</p>
                        </div>

                        {/* Top Right Badges & Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Today Date Badge */}
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-orange-50/80 border border-orange-200/60 rounded-xl text-xs">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">Today</div>
                                    <div className="font-bold text-slate-900 text-xs">{format(new Date(), 'MMMM d, yyyy')}</div>
                                    <div className="text-[10px] text-slate-500">{format(new Date(), 'EEEE, hh:mm a')}</div>
                                </div>
                            </div>

                            {/* Assigned Scope Badge */}
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                                <div className="w-8 h-8 rounded-lg bg-slate-200/60 text-slate-700 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assigned Scope</div>
                                    <div className="font-bold text-slate-900 text-xs">1 Dormitory • 1 Building • 1 Cell</div>
                                </div>
                            </div>

                            {/* Launch TV Queue Display Button */}
                            <Button
                                onClick={() => window.open('/jail-officer/tv-queue-display', '_blank')}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-sm gap-2 transition-all"
                            >
                                <Tv className="w-4 h-4" />
                                <span>Launch TV Queue Display</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Stat Cards (4-Column) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Total Sessions */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <VideoIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.total_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Total Sessions
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                        <span>&uarr;</span> 2 this week
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Live Now */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Radio className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.active_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Live Now
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                                        Real-time tunnels
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Scheduled */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                    <CalendarIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.scheduled_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Scheduled
                                    </div>
                                    <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1 mt-0.5">
                                        <span>&bull;</span> 1 for today
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Completed */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.completed_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Completed
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                        <span>&uarr;</span> 100% completion rate
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <TabsList className="bg-transparent border-0 p-0 h-auto gap-6">
                                <TabsTrigger 
                                    value="sessions" 
                                    className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-2 py-2 text-sm font-bold text-slate-600 gap-2 transition-all bg-transparent"
                                >
                                    <Layout className="w-4 h-4" />
                                    Sessions
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="timetable" 
                                    className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-2 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                >
                                    <CalendarDays className="w-4 h-4" />
                                    Weekly Schedule & Timetable
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="calendar" 
                                    className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-2 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    Calendar Quick View
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="analytics" 
                                    className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-2 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    Analytics
                                </TabsTrigger>
                            </TabsList>

                            {/* Export / Print Logsheet Button */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsPrintModalOpen(true)} 
                                className="h-9 gap-2 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs"
                            >
                                <Printer className="w-3.5 h-3.5 text-orange-600" />
                                Official Logsheet Preview
                            </Button>
                        </div>

                        {/* SESSIONS TAB CONTENT */}
                        <TabsContent value="sessions" className="space-y-4 m-0">
                            {/* Filter Bar (Search input, Selects, Clear Filters, Export) */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    {/* Search input */}
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by visitor, PDL, tunnel code, or reference number..."
                                            className="pl-9 h-10 bg-slate-50/60 border-slate-200 text-xs rounded-xl focus:bg-white"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Dropdowns row */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Status Filter */}
                                        <Select value={statusSubFilter} onValueChange={(val: any) => setStatusSubFilter(val)}>
                                            <SelectTrigger className="h-9 w-36 text-xs bg-white border-slate-200 rounded-xl">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                                <SelectItem value="live">Live Now</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="no_show">No Show</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Date range picker trigger button */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="h-9 text-xs bg-white border-slate-200 rounded-xl gap-2 text-slate-600">
                                                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    {startDateFilter ? `${startDateFilter} - ${endDateFilter || 'Today'}` : 'Nov 20, 2024 - Nov 27, 2024'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-4 space-y-3" align="start">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Filter by Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={startDateFilter} 
                                                        onChange={(e) => setStartDateFilter(e.target.value)} 
                                                        className="h-8 text-xs" 
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Types dropdown */}
                                        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val)}>
                                            <SelectTrigger className="h-9 w-32 text-xs bg-white border-slate-200 rounded-xl">
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="visit">Virtual Visit</SelectItem>
                                                <SelectItem value="eburol">E-Burol</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Dormitories dropdown */}
                                        <Select value={dormFilter} onValueChange={(val) => setDormFilter(val)}>
                                            <SelectTrigger className="h-9 w-36 text-xs bg-white border-slate-200 rounded-xl">
                                                <SelectValue placeholder="All Dormitories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Dormitories</SelectItem>
                                                {availableDorms.map((d, i) => (
                                                    <SelectItem key={i} value={d}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Cells dropdown */}
                                        <Select value={cellFilter} onValueChange={(val) => setCellFilter(val)}>
                                            <SelectTrigger className="h-9 w-32 text-xs bg-white border-slate-200 rounded-xl">
                                                <SelectValue placeholder="All Cells" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Cells</SelectItem>
                                                {availableCells.map((c, i) => (
                                                    <SelectItem key={i} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Clear & Export Buttons */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setStatusSubFilter('all');
                                                setTypeFilter('all');
                                                setDormFilter('all');
                                                setCellFilter('all');
                                                setStartDateFilter('');
                                                setEndDateFilter('');
                                            }}
                                            className="h-9 text-xs text-slate-500 hover:text-slate-800 gap-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Clear Filters
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsPrintModalOpen(true)}
                                            className="h-9 text-xs font-semibold gap-1.5 bg-white border-slate-200 text-slate-700 rounded-xl shadow-xs"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Status Filter Badges/Pills Row */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('all')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'all'
                                            ? "bg-orange-500 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>All Sessions</span>
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px]",
                                        statusSubFilter === 'all' ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700 font-bold"
                                    )}>
                                        {statusCounts.all}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('scheduled')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'scheduled'
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Scheduled</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                                        {statusCounts.scheduled}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('live')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'live'
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Live</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                        {statusCounts.live}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('completed')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'completed'
                                            ? "bg-blue-600 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Completed</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                                        {statusCounts.completed}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('no_show')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'no_show'
                                            ? "bg-orange-600 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>No Show</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                                        {statusCounts.no_show}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('cancelled')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'cancelled'
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Cancelled</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                                        {statusCounts.cancelled}
                                    </span>
                                </button>
                            </div>

                            {/* Main Two-Column View: Sessions Table (Left) + Session Details Drawer (Right) */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                {/* Left Side: Session Table */}
                                <div className={cn(selectedSession ? "xl:col-span-8" : "xl:col-span-12", "transition-all")}>
                                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px]">
                                                        <th className="py-3 px-3 text-center w-8">
                                                            <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                                                        </th>
                                                        <th className="py-3 px-2 text-center w-8">#</th>
                                                        <th className="py-3 px-3">Tunnel Code</th>
                                                        <th className="py-3 px-3">Visitor</th>
                                                        <th className="py-3 px-3">PDL</th>
                                                        <th className="py-3 px-3">Type</th>
                                                        <th className="py-3 px-3">Schedule</th>
                                                        <th className="py-3 px-3">Status</th>
                                                        <th className="py-3 px-3 text-center">Actions</th>
                                                        <th className="py-3 px-2 text-center w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {filteredSessions.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="py-12 text-center text-slate-400">
                                                                No virtual session records match your search or filters.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSessions.map((s, index) => {
                                                            const isSelected = selectedSession?.id === s.id;
                                                            const isCompleted = s.status === 'completed' || s.status === 'terminated';
                                                            const joinDisabled = s.schedule_ended || s.status === 'no_show' || s.status === 'missed' || isCompleted;

                                                            return (
                                                                <tr 
                                                                    key={s.id}
                                                                    onClick={() => setSelectedSession(s)}
                                                                    className={cn(
                                                                        "hover:bg-slate-50/80 transition-colors cursor-pointer",
                                                                        isSelected && "bg-orange-50/30 font-medium"
                                                                    )}
                                                                >
                                                                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                        <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                                                                    </td>
                                                                    <td className="py-3 px-2 text-center font-mono text-slate-400 text-[11px]">
                                                                        {index + 1}
                                                                    </td>
                                                                    <td className="py-3 px-3 font-mono font-bold text-slate-900 tracking-wider">
                                                                        {s.tunnel_short_code || `TUN-${s.id}`}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                                                {(s.visitor_name || 'V').substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-semibold text-slate-900">{s.visitor_name || 'Remote Visitor'}</div>
                                                                                <div className="text-[10px] text-slate-500">{s.visitor_email || 'visitor@example.com'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="font-semibold text-slate-900">{s.inmate_name}</div>
                                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 text-orange-500" />
                                                                            <span>{s.cell_number || 'Cell 1 • Female Dormitory'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        {s.type === 'eburol' ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                                                                <Radio className="w-3 h-3 text-purple-600" />
                                                                                e-Burol
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                                <VideoIcon className="w-3 h-3 text-blue-600" />
                                                                                Visit
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                                        <div className="font-semibold text-slate-900">
                                                                            {s.scheduled_date ? format(new Date(s.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : 'Oct 19, 2026'}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {s.scheduled_time || '10:45 AM - 10:55 AM'} (10 mins)
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <span className={cn(
                                                                            "px-2.5 py-1 rounded-full text-[10px] font-bold inline-block",
                                                                            s.status === 'completed' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                                            (s.status === 'active' || s.status === 'ongoing') && "bg-blue-50 text-blue-700 border border-blue-200",
                                                                            s.status === 'scheduled' && "bg-amber-50 text-amber-700 border border-amber-200",
                                                                            s.status === 'no_show' && "bg-orange-50 text-orange-700 border border-orange-200",
                                                                            (s.status === 'cancelled' || s.status === 'terminated' || s.status === 'unsuccessful') && "bg-rose-50 text-rose-700 border border-rose-200"
                                                                        )}>
                                                                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                        {isCompleted ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => setSelectedSession(s)}
                                                                                className="h-8 px-3 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs"
                                                                            >
                                                                                View
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                disabled={joinDisabled}
                                                                                onClick={() => {
                                                                                    if (joinDisabled) return;
                                                                                    window.open(`/jail-officer/assigned-sessions/${s.id}/join`, '_blank');
                                                                                }}
                                                                                className="h-8 px-3 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs gap-1.5 disabled:opacity-50"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                                                Join as observer
                                                                            </Button>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                                                                                    <MoreVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem onClick={() => setSelectedSession(s)}>
                                                                                    View Details
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => setIsPrintModalOpen(true)}>
                                                                                    Print Formal Logsheet
                                                                                </DropdownMenuItem>
                                                                                {s.status === 'active' && (
                                                                                    <DropdownMenuItem onClick={() => handleKillSession(s)} className="text-red-600">
                                                                                        Terminate Session
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Table Pagination / Footer */}
                                        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                            <div>
                                                Showing 1 to {filteredSessions.length} of {filteredSessions.length} results
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button className="w-7 h-7 rounded bg-orange-600 text-white font-bold flex items-center justify-center">
                                                        1
                                                    </button>
                                                    <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-400">
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <span>10 per page</span>
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Session Details Panel */}
                                {selectedSession && (
                                    <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
                                        {/* Header */}
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 text-sm">Session Details</h3>
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                                    selectedSession.status === 'completed' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                    selectedSession.status === 'active' && "bg-blue-50 text-blue-700 border border-blue-200",
                                                    selectedSession.status === 'scheduled' && "bg-amber-50 text-amber-700 border border-amber-200",
                                                    selectedSession.status === 'no_show' && "bg-orange-50 text-orange-700 border border-orange-200"
                                                )}>
                                                    {selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedSession(null)}
                                                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                                            >
                                                &times;
                                            </button>
                                        </div>

                                        {/* Visitor Avatar & Name */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                                                {(selectedSession.visitor_name || 'KP').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{selectedSession.visitor_name || 'Visitor Name'}</div>
                                                <div className="text-xs text-slate-500">{selectedSession.visitor_email || 'visitor@gmail.com'}</div>
                                            </div>
                                        </div>

                                        {/* Meta Information List */}
                                        <div className="space-y-2.5 text-xs">
                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Reference Number</span>
                                                <span className="font-mono font-bold text-slate-900">V-2026-00{selectedSession.id}</span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Tunnel Code</span>
                                                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                                    <span>{selectedSession.tunnel_short_code || `TUN-${selectedSession.id}`}</span>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(selectedSession.tunnel_short_code || '');
                                                            alert('Copied tunnel code to clipboard');
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Type</span>
                                                <span className="font-semibold text-blue-600">
                                                    {selectedSession.type === 'eburol' ? 'E-Burol' : 'Virtual Visit'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Schedule</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-slate-900">
                                                        {selectedSession.scheduled_date ? format(new Date(selectedSession.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : 'Oct 19, 2026'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {selectedSession.scheduled_time || '10:45 AM - 10:55 AM'} (10 minutes)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Status</span>
                                                <span className="font-bold text-emerald-600 uppercase text-[11px]">
                                                    {selectedSession.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">PDL</span>
                                                <span className="font-bold text-slate-900">{selectedSession.inmate_name}</span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Location</span>
                                                <span className="font-medium text-slate-800 text-right">
                                                    <MapPin className="w-3.5 h-3.5 text-orange-500 inline mr-1" />
                                                    {selectedSession.cell_number || 'Cell 1 • Female Dormitory'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Approved By</span>
                                                <span className="font-bold text-slate-900">JO Maria Santos</span>
                                            </div>

                                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-400">Approved On</span>
                                                <span className="font-medium text-slate-700">Oct 15, 2026 09:30 AM</span>
                                            </div>
                                        </div>

                                        {/* Tabs for Timeline vs Notes */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-4 text-xs font-bold border-b border-slate-200 pb-2 mb-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => setDetailTab('timeline')}
                                                    className={cn("pb-1 transition-all", detailTab === 'timeline' ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-400")}
                                                >
                                                    Session Timeline
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setDetailTab('notes')}
                                                    className={cn("pb-1 transition-all", detailTab === 'notes' ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-400")}
                                                >
                                                    Notes
                                                </button>
                                            </div>

                                            {detailTab === 'timeline' ? (
                                                <div className="space-y-4 pl-2 border-l-2 border-emerald-500 text-xs">
                                                    <div className="relative pl-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1 border-2 border-white"></div>
                                                        <div className="font-bold text-slate-900">Scheduled</div>
                                                        <div className="text-[11px] text-slate-500">Oct 15, 2026 09:30 AM</div>
                                                        <div className="text-[11px] text-slate-600">Approved by JO Maria Santos</div>
                                                    </div>

                                                    <div className="relative pl-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1 border-2 border-white"></div>
                                                        <div className="font-bold text-slate-900">Checked In</div>
                                                        <div className="text-[11px] text-slate-500">Oct 19, 2026 10:45 AM</div>
                                                    </div>

                                                    <div className="relative pl-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1 border-2 border-white"></div>
                                                        <div className="font-bold text-slate-900">Checked Out</div>
                                                        <div className="text-[11px] text-slate-500">Oct 19, 2026 10:55 AM</div>
                                                        <div className="text-[11px] text-slate-600">Duration: 10 minutes</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-xs italic">
                                                    No behavioral or security infractions recorded during this virtual visitation session.
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Action Buttons: View Logsheet & View Recording */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsPrintModalOpen(true)}
                                                className="h-10 text-xs font-bold text-orange-600 border-orange-200 hover:bg-orange-50 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                                            >
                                                <FileText className="w-4 h-4 text-orange-600" />
                                                View Logsheet
                                            </Button>

                                            <Button
                                                onClick={() => alert('Opening encrypted session archive recording viewer...')}
                                                className="h-10 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                                            >
                                                <PlaySquare className="w-4 h-4 text-white" />
                                                View Recording
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Weekly Schedule & Timetable Tab */}
                        <TabsContent value="timetable" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            <h3 className="font-semibold text-foreground text-base">Weekly Session Timetable</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Week of {weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
                                            <Button variant="ghost" size="sm" onClick={prevWeek} className="h-8 w-8 p-0">
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={goToCurrentWeek} className="h-8 px-2.5 text-xs font-medium">
                                                Today
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={nextWeek} className="h-8 w-8 p-0">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4 sm:p-6">
                                    {/* 7-Day Overview Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
                                        {weekDays.map((day) => {
                                            const daySessions = sessionsByDate.get(day.dateStr) || [];
                                            const activeCount = daySessions.filter(s => s.status === 'active').length;
                                            const scheduledCount = daySessions.filter(s => s.status === 'scheduled').length;
                                            const hasItems = daySessions.length > 0;

                                            return (
                                                <button
                                                    key={day.dateStr}
                                                    type="button"
                                                    onClick={() => setSelectedDate(day.dateStr)}
                                                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                                                        day.isSelected
                                                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
                                                            : day.isToday
                                                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20'
                                                            : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40'
                                                    }`}
                                                >
                                                    {day.isToday && (
                                                        <span className="absolute top-1 right-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                            Today
                                                        </span>
                                                    )}
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase">{day.dayName}</div>
                                                    <div className="text-xl font-bold text-foreground mt-0.5">{day.dayNumber}</div>

                                                    <div className="mt-2.5 flex items-center justify-between gap-1 text-[11px]">
                                                        {hasItems ? (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {activeCount > 0 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        {activeCount} live
                                                                    </span>
                                                                )}
                                                                {scheduledCount > 0 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                        {scheduledCount} sched
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-muted-foreground/60">No sessions</span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Daily Timetable Breakdown */}
                                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                                        <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-primary" />
                                                <span className="font-semibold text-sm text-foreground">
                                                    Timetable for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {selectedDateSessions.length} {selectedDateSessions.length === 1 ? 'Session' : 'Sessions'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Live
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Scheduled
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Completed
                                                </span>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-border/60">
                                            {selectedDateSessions.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-foreground">No sessions scheduled on this day</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Select another date from the week view or adjust your filters</p>
                                                </div>
                                            ) : (
                                                selectedDateSessions.map((session) => {
                                                    const isCompleted = session.status === 'completed' || session.status === 'terminated';
                                                    const isActive = session.status === 'active';
                                                    const timeStart = session.scheduled_time || (session.scheduled_start ? new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD');
                                                    const timeEnd = session.scheduled_end ? new Date(session.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                                                    return (
                                                        <div
                                                            key={session.id}
                                                            className="p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-24 shrink-0 text-center bg-muted/60 rounded-lg p-2 border border-border">
                                                                    <div className="text-xs font-bold text-foreground">
                                                                        {timeStart}
                                                                    </div>
                                                                    {timeEnd && (
                                                                        <div className="text-[10px] text-muted-foreground">
                                                                            to {timeEnd}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                                                        {session.type === 'visit' ? 'Visit' : 'E-Burol'}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-semibold text-foreground text-sm">
                                                                            {session.visitor_name || 'Visitor'}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">with</span>
                                                                        <span className="font-medium text-foreground text-sm bg-muted/80 px-2 py-0.5 rounded">
                                                                            {session.inmate_name}
                                                                        </span>
                                                                        {getStatusBadge(session.status)}
                                                                        <span className="text-xs font-mono text-muted-foreground">
                                                                            Cell: {session.cell_number}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                                        {session.tunnel_short_code && (
                                                                            <span>Tunnel: <strong className="font-mono text-foreground">{session.tunnel_short_code}</strong></span>
                                                                        )}
                                                                        <span>Room ID: <code className="text-[11px] font-mono text-foreground">{session.room_id}</code></span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                                {!isCompleted && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant={isActive ? "default" : "outline"}
                                                                        className={isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-medium" : "gap-1.5 text-xs font-medium"}
                                                                        onClick={() => {
                                                                            window.open(`/jail-officer/assigned-sessions/${session.id}/join`, '_blank');
                                                                        }}
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        {isActive ? 'Join Live' : 'Observe'}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Calendar Quick View Tab */}
                        <TabsContent value="calendar" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-5 h-5 text-primary" />
                                            <h3 className="font-semibold text-foreground text-base">
                                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Click any date to see scheduled live sessions and observer links
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
                                            <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="h-8 px-2.5 text-xs font-medium">
                                                Current Month
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4 sm:p-6 space-y-6">
                                    {/* Month Calendar Grid */}
                                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                                        {/* Day of Week Headers */}
                                        <div className="grid grid-cols-7 bg-muted/50 border-b border-border text-center text-xs font-semibold text-muted-foreground py-2.5">
                                            <div>Sun</div>
                                            <div>Mon</div>
                                            <div>Tue</div>
                                            <div>Wed</div>
                                            <div>Thu</div>
                                            <div>Fri</div>
                                            <div>Sat</div>
                                        </div>

                                        {/* Day Cells */}
                                        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
                                            {monthCalendarGrid.map((day, idx) => {
                                                const daySessions = day.sessions;
                                                const isSelected = selectedDate === day.dateStr;
                                                const activeSessions = daySessions.filter(s => s.status === 'active');
                                                const scheduledSessions = daySessions.filter(s => s.status === 'scheduled');

                                                return (
                                                    <div
                                                        key={`${day.dateStr}-${idx}`}
                                                        onClick={() => setSelectedDate(day.dateStr)}
                                                        className={`min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                            isSelected
                                                                ? 'bg-primary/5 ring-2 ring-primary ring-inset z-10'
                                                                : !day.isCurrentMonth
                                                                ? 'bg-muted/15 text-muted-foreground/50'
                                                                : 'hover:bg-muted/30 bg-card'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                                                                day.isToday
                                                                    ? 'bg-blue-600 text-white font-bold'
                                                                    : isSelected
                                                                    ? 'bg-primary text-primary-foreground font-bold'
                                                                    : 'text-foreground'
                                                            }`}>
                                                                {day.dayNumber}
                                                            </span>
                                                            {daySessions.length > 0 && (
                                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                                    {daySessions.length}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-1 space-y-1 overflow-hidden">
                                                            {activeSessions.length > 0 && (
                                                                <div className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                                                    <span>{activeSessions.length} live</span>
                                                                </div>
                                                            )}
                                                            {scheduledSessions.length > 0 && (
                                                                <div className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                                    {scheduledSessions.length} scheduled
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Selected Day Agenda Drawer */}
                                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                        <div className="flex items-center justify-between border-b border-border/70 pb-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-primary" />
                                                <h4 className="font-semibold text-sm text-foreground">
                                                    Sessions for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </h4>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {selectedDateSessions.length} total
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            {selectedDateSessions.length === 0 ? (
                                                <div className="py-6 text-center text-xs text-muted-foreground">
                                                    No sessions on this date
                                                </div>
                                            ) : (
                                                selectedDateSessions.map((session) => (
                                                    <div
                                                        key={session.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-xs font-mono font-semibold text-muted-foreground w-16">
                                                                {session.scheduled_time || (session.scheduled_start ? new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD')}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-foreground">
                                                                    {session.visitor_name || 'Visitor'} visiting {session.inmate_name}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    Cell {session.cell_number} • Room: {session.room_id}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(session.status)}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs px-2.5"
                                                                onClick={() => {
                                                                    window.open(`/jail-officer/assigned-sessions/${session.id}/join`, '_blank');
                                                                }}
                                                            >
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                Observe
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
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

            {/* Formal BJMP & eDalaw Virtual Visitor Logsheet Dialog */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="max-w-[98vw] w-[98vw] h-[94vh] max-h-[94vh] overflow-hidden p-0 sm:max-w-[98vw] bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl flex flex-col rounded-xl">
                    {/* Top Header Bar */}
                    <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                                <VideoIcon className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    Virtual Visitation Logsheet Preview
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    Official BJMP Virtual Visitation Logsheet (RA 10173 Compliant)
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {/* Tab Switchers */}
                            <div className="hidden sm:flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('layout')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        activeConfigTab === 'layout' 
                                            ? "bg-slate-700 text-white shadow-sm" 
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Layout className="w-3.5 h-3.5" />
                                    Customize Layout
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('columns')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        activeConfigTab === 'columns' 
                                            ? "bg-slate-700 text-white shadow-sm" 
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    Manage Columns
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('signatories')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        activeConfigTab === 'signatories' 
                                            ? "bg-slate-700 text-white shadow-sm" 
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Sliders className="w-3.5 h-3.5" />
                                    Manage Signatories
                                </button>
                            </div>

                            {/* Print / Export Action */}
                            <Button 
                                size="sm" 
                                onClick={() => window.print()}
                                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold gap-2 shadow-lg h-9 px-4 rounded-lg"
                            >
                                <Printer className="w-4 h-4" /> 
                                <span>Print / Export PDF</span>
                            </Button>

                            {/* Close Modal Button */}
                            <button
                                type="button"
                                onClick={() => setIsPrintModalOpen(false)}
                                className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Split Screen Body */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT SIDEBAR: Logsheet Configuration */}
                        <div className="w-80 sm:w-96 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
                            <div className="p-5 space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3">
                                        Logsheet Configuration
                                    </h3>

                                    {/* Logsheet Type Switcher */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-400">Logsheet Type</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold bg-orange-600/15 border-orange-500/60 text-orange-400 shadow-sm"
                                            >
                                                <VideoIcon className="w-3.5 h-3.5" />
                                                Virtual Visit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPrintModalOpen(false);
                                                    router.visit('/jail-officer/physical-sessions');
                                                }}
                                                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                                            >
                                                <UsersIcon className="w-3.5 h-3.5" />
                                                Physical Visit
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Information */}
                                <div className="space-y-3 pt-3 border-t border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-300">Header Information</h4>
                                    
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] text-slate-400">Facility / Sector</Label>
                                        <Input
                                            value={facilityBranch}
                                            onChange={(e) => setFacilityBranch(e.target.value)}
                                            className="h-8 text-xs bg-slate-800/80 border-slate-700 text-slate-100 focus:border-orange-500"
                                            placeholder="Digos City District Jail"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] text-slate-400">Logsheet Date</Label>
                                        <Input
                                            type="date"
                                            value={logsheetCustomDate}
                                            onChange={(e) => setLogsheetCustomDate(e.target.value)}
                                            className="h-8 text-xs bg-slate-800/80 border-slate-700 text-slate-100 focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Settings Tabs / Columns Panel */}
                                <div className="space-y-4 pt-3 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-300">Columns</h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVisibleColumns(defaultVisibleColumns);
                                                setCustomColumns([]);
                                            }}
                                            className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>

                                    {/* Draggable/Toggleable Column List */}
                                    <div className="space-y-1.5">
                                        {[
                                            { key: 'index', label: '#' },
                                            { key: 'visitor', label: 'Remote Visitor' },
                                            { key: 'pdl', label: 'PDL Recipient' },
                                            { key: 'cell', label: 'Cell / Dorm' },
                                            { key: 'date', label: 'Scheduled Date' },
                                            { key: 'time', label: 'Time Slot' },
                                            { key: 'mode', label: 'Visit Mode' },
                                            { key: 'status', label: 'Session Status' },
                                            { key: 'officerInitials', label: 'Officer Initials' },
                                            { key: 'remarks', label: 'Remarks / Purpose' },
                                        ].map((col) => {
                                            const isChecked = visibleColumns[col.key as keyof typeof visibleColumns];
                                            return (
                                                <div 
                                                    key={col.key}
                                                    onClick={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !isChecked }))}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all",
                                                        isChecked 
                                                            ? "bg-slate-800/90 border-slate-700 text-slate-200" 
                                                            : "bg-slate-900/60 border-slate-800/70 text-slate-500 line-through"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="w-3.5 h-3.5 text-slate-500 cursor-grab" />
                                                        <div className={cn(
                                                            "w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-colors",
                                                            isChecked ? "bg-orange-600 border-orange-500 text-white" : "border-slate-600"
                                                        )}>
                                                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                        </div>
                                                        <span className="font-medium">{col.label}</span>
                                                    </div>
                                                    <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                                                </div>
                                            );
                                        })}

                                        {/* Dynamic Custom Added Columns */}
                                        {customColumns.map((col) => (
                                            <div 
                                                key={col.id}
                                                className="flex items-center justify-between p-2 rounded-lg border border-slate-700 bg-slate-800/90 text-xs text-slate-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                                                    <div className="w-4 h-4 rounded bg-orange-600 border border-orange-500 flex items-center justify-center text-[10px] text-white">
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                    <span className="font-medium text-orange-200">{col.title}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCustomColumns(prev => prev.filter(c => c.id !== col.id));
                                                    }}
                                                    className="text-red-400 hover:text-red-300 px-1 font-bold text-sm"
                                                    title="Remove Column"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Column Input & Button */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="New column name..."
                                                value={newColTitle}
                                                onChange={(e) => setNewColTitle(e.target.value)}
                                                className="h-8 text-xs bg-slate-800/80 border-slate-700 text-slate-100"
                                            />
                                            <Button
                                                size="sm"
                                                type="button"
                                                onClick={() => {
                                                    if (!newColTitle.trim()) return;
                                                    setCustomColumns(prev => [
                                                        ...prev,
                                                        { id: `col_${Date.now()}`, title: newColTitle.trim(), defaultVal: '' }
                                                    ]);
                                                    setNewColTitle('');
                                                }}
                                                className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white shrink-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const title = prompt('Enter custom column header name:');
                                                if (title && title.trim()) {
                                                    setCustomColumns(prev => [
                                                        ...prev,
                                                        { id: `col_${Date.now()}`, title: title.trim(), defaultVal: '' }
                                                    ]);
                                                }
                                            }}
                                            className="w-full py-2 px-3 border border-dashed border-orange-500/40 hover:border-orange-400 bg-orange-500/5 hover:bg-orange-500/10 rounded-lg text-xs font-semibold text-orange-400 flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Column
                                        </button>
                                    </div>
                                </div>

                                {/* Signatories Section */}
                                <div className="space-y-3 pt-3 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-300">Signatories</h4>
                                        <button
                                            type="button"
                                            onClick={() => setActiveConfigTab('signatories')}
                                            className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium"
                                        >
                                            Manage Signatories
                                        </button>
                                    </div>

                                    {/* Signatory Checkboxes */}
                                    <div className="space-y-1.5">
                                        {/* Prepared By Fixed Checkbox */}
                                        <div className="flex items-center justify-between p-2 rounded-lg border border-slate-700 bg-slate-800/90 text-xs text-slate-200">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                                                <div className="w-4 h-4 rounded bg-orange-600 border border-orange-500 flex items-center justify-center text-[10px] text-white">
                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                </div>
                                                <span className="font-medium">Prepared and Certified (Jail Officer)</span>
                                            </div>
                                        </div>

                                        {/* Dynamic Signatories */}
                                        {signatories.map((sig, idx) => (
                                            <div 
                                                key={sig.id}
                                                onClick={() => {
                                                    setSignatories(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all",
                                                    sig.enabled 
                                                        ? "bg-slate-800/90 border-slate-700 text-slate-200" 
                                                        : "bg-slate-900/60 border-slate-800/70 text-slate-500"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                                                    <div className={cn(
                                                        "w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-colors",
                                                        sig.enabled ? "bg-orange-600 border-orange-500 text-white" : "border-slate-600"
                                                    )}>
                                                        {sig.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <span className="font-medium truncate max-w-[180px]">{sig.label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Prepared By Officer Inputs */}
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 space-y-2 mt-2">
                                        <Label className="text-[11px] font-bold text-slate-300 block">Jail Officer Details</Label>
                                        <Input
                                            value={preparedByName}
                                            onChange={(e) => setPreparedByName(e.target.value)}
                                            placeholder="Officer Full Name"
                                            className="h-7 text-xs bg-slate-900 border-slate-700 text-white"
                                        />
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Input
                                                value={preparedByBadge}
                                                onChange={(e) => setPreparedByBadge(e.target.value)}
                                                placeholder="Badge / PIN"
                                                className="h-7 text-xs bg-slate-900 border-slate-700 text-white"
                                            />
                                            <Input
                                                value={preparedByRole}
                                                onChange={(e) => setPreparedByRole(e.target.value)}
                                                placeholder="Designation"
                                                className="h-7 text-xs bg-slate-900 border-slate-700 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT MAIN PANEL: Interactive Document Canvas */}
                        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
                            {/* Canvas Control Bar */}
                            <div className="h-12 bg-slate-900/80 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    {/* Paper Size Selector */}
                                    <Select 
                                        value={paperSize} 
                                        onValueChange={(val: any) => setPaperSize(val)}
                                    >
                                        <SelectTrigger className="h-8 w-36 bg-slate-800 border-slate-700 text-xs text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                            <SelectItem value="A4_portrait">A4 (Portrait)</SelectItem>
                                            <SelectItem value="A4_landscape">A4 (Landscape)</SelectItem>
                                            <SelectItem value="Letter_portrait">Letter (Portrait)</SelectItem>
                                            <SelectItem value="Letter_landscape">Letter (Landscape)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Zoom Level Selector */}
                                    <Select 
                                        value={String(zoomScale)} 
                                        onValueChange={(val) => setZoomScale(Number(val))}
                                    >
                                        <SelectTrigger className="h-8 w-24 bg-slate-800 border-slate-700 text-xs text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                            <SelectItem value="75">75%</SelectItem>
                                            <SelectItem value="90">90%</SelectItem>
                                            <SelectItem value="100">100%</SelectItem>
                                            <SelectItem value="110">110%</SelectItem>
                                            <SelectItem value="125">125%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Pagination Controls & Fullscreen */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 text-xs text-slate-300">
                                        <button 
                                            type="button"
                                            className="px-2 py-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-l"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="px-2 font-mono font-medium text-[11px]">1 / 1</span>
                                        <button 
                                            type="button"
                                            className="px-2 py-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-r"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => setZoomScale(zoomScale === 100 ? 125 : 100)}
                                        className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                        title="Fit / Expand"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Scroll Area */}
                            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center bg-slate-900/40">
                                <div 
                                    style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
                                    className="transition-transform duration-150"
                                >
                                    {/* Isolated Print & Preview Styling */}
                                    <style type="text/css">
                                        {`
                                            @media print {
                                                body * {
                                                    visibility: hidden !important;
                                                }
                                                #bjmp-virtual-logsheet, #bjmp-virtual-logsheet * {
                                                    visibility: visible !important;
                                                }
                                                #bjmp-virtual-logsheet {
                                                    position: absolute !important;
                                                    left: 0 !important;
                                                    top: 0 !important;
                                                    width: 100% !important;
                                                    margin: 0 !important;
                                                    padding: 6mm 10mm !important;
                                                    background: white !important;
                                                    color: black !important;
                                                    box-sizing: border-box !important;
                                                    box-shadow: none !important;
                                                }
                                                @page {
                                                    size: ${paperSize.includes('portrait') ? 'portrait' : 'landscape'};
                                                    margin: 8mm;
                                                }
                                            }
                                        `}
                                    </style>

                                    {/* Formal White Paper Sheet */}
                                    <div 
                                        id="bjmp-virtual-logsheet" 
                                        className={cn(
                                            "bg-white text-slate-900 font-sans shadow-2xl rounded-sm border border-slate-200 transition-all",
                                            paperSize.includes('portrait') ? "w-[210mm] min-h-[297mm] p-8" : "w-[297mm] min-h-[210mm] p-8",
                                            "print:p-0 print:border-none print:shadow-none"
                                        )}
                                    >
                                        {/* Formal Letterhead */}
                                        <div className="border-b-2 border-slate-900 pb-3 mb-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                                                    <img 
                                                        src="/bjmp_logo.png" 
                                                        alt="BJMP Logo" 
                                                        className="h-16 w-16 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex-1 text-center">
                                                    <p className="text-[10px] font-serif uppercase tracking-widest text-slate-600">Republic of the Philippines</p>
                                                    <p className="text-[10px] font-semibold text-slate-800">DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT</p>
                                                    <h2 className="text-sm sm:text-base font-bold text-slate-950 uppercase tracking-wide leading-tight">
                                                        Bureau of Jail Management and Penology
                                                    </h2>
                                                    <p className="text-xs font-semibold text-slate-700">
                                                        {facilityBranch}
                                                    </p>
                                                    <div className="inline-block mt-1.5 px-3 py-0.5 border border-slate-900 bg-slate-50 rounded text-xs font-bold uppercase tracking-wider text-slate-900">
                                                        OFFICIAL VIRTUAL VISITATION LOGSHEET (E-DALAW)
                                                    </div>
                                                </div>

                                                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                                                    <img 
                                                        src="/edalaw_logo.png" 
                                                        alt="eDalaw Logo" 
                                                        className="h-14 w-14 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Metadata row */}
                                            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-200 text-[11px]">
                                                <div>
                                                    <span className="font-semibold text-slate-600">Logsheet Date:</span>{' '}
                                                    <span className="font-bold text-slate-900">
                                                        {format(new Date(logsheetCustomDate + 'T12:00:00'), 'MMMM d, yyyy')}
                                                    </span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="font-semibold text-slate-600">Facility / Sector:</span>{' '}
                                                    <span className="font-bold text-slate-900">{facilityBranch}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold text-slate-600">Total Virtual Sessions:</span>{' '}
                                                    <span className="font-bold text-slate-900">{filteredSessions.length} record(s)</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RA 10173 Data Privacy Compliance Notice */}
                                        <div className="mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[9.5px] leading-relaxed text-slate-700">
                                            <span className="font-bold uppercase text-slate-900">Data Privacy Notice (RA 10173):</span>{' '}
                                            The personal information gathered in this logsheet is collected strictly for security, visitor identification, and record-keeping mandates under the Bureau of Jail Management and Penology (BJMP) and the eDalaw visitation system. All data shall be treated with utmost confidentiality, retained only for statutory auditing periods, and safeguarded against unauthorized access, disclosure, or alteration.
                                        </div>

                                        {/* Compact Logsheet Table */}
                                        <div className="w-full border border-slate-900 overflow-x-auto">
                                            <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold uppercase text-[9.5px]">
                                                        {visibleColumns.index && <th className="py-2 px-1.5 border-r border-slate-300 text-center w-8">#</th>}
                                                        {visibleColumns.visitor && <th className="py-2 px-2.5 border-r border-slate-300">Remote Visitor</th>}
                                                        {visibleColumns.mode && <th className="py-2 px-2 border-r border-slate-300 text-center">Visit Mode</th>}
                                                        {visibleColumns.pdl && <th className="py-2 px-2.5 border-r border-slate-300">PDL Recipient</th>}
                                                        {visibleColumns.cell && <th className="py-2 px-2 border-r border-slate-300">Cell / Dorm</th>}
                                                        {visibleColumns.date && <th className="py-2 px-2 border-r border-slate-300 text-center">Scheduled Date</th>}
                                                        {visibleColumns.time && <th className="py-2 px-2 border-r border-slate-300 text-center">Time Slot</th>}
                                                        {visibleColumns.status && <th className="py-2 px-2 border-r border-slate-300 text-center">Status</th>}
                                                        {visibleColumns.remarks && <th className="py-2 px-2 border-r border-slate-300">Remarks / Notes</th>}
                                                        {/* Dynamic Custom Column Headers */}
                                                        {customColumns.map(col => (
                                                            <th key={col.id} className="py-2 px-2 border-r border-slate-300 text-center">{col.title}</th>
                                                        ))}
                                                        {visibleColumns.officerInitials && <th className="py-2 px-2 text-center w-24">Officer Initials</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredSessions.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={15} className="py-6 text-center text-slate-500 italic">
                                                                No virtual visit sessions logged for this timeframe.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSessions.map((s, index) => (
                                                            <tr 
                                                                key={s.id} 
                                                                className={cn(
                                                                    "border-b border-slate-200",
                                                                    index % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                                                                )}
                                                            >
                                                                {visibleColumns.index && (
                                                                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-mono font-medium text-[10px]">
                                                                        {index + 1}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.visitor && (
                                                                    <td className="py-1.5 px-2.5 border-r border-slate-300 font-semibold text-slate-900 break-words">
                                                                        <div>{s.visitor_name || '—'}</div>
                                                                        {s.visitor_email && <div className="text-[9px] text-slate-500 font-normal">{s.visitor_email}</div>}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.mode && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-center text-slate-700 capitalize text-[10px] whitespace-nowrap">
                                                                        {s.type === 'eburol' ? 'E-Burol' : 'Virtual Visit'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.pdl && (
                                                                    <td className="py-1.5 px-2.5 border-r border-slate-300 font-medium text-slate-900 break-words">
                                                                        <div className="font-semibold">{s.inmate_name}</div>
                                                                        {s.inmate_code && <div className="text-[9px] text-slate-500 font-mono">{s.inmate_code}</div>}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.cell && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-slate-700">
                                                                        {s.cell_number}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.date && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-center whitespace-nowrap text-[10px]">
                                                                        {s.scheduled_date ? format(new Date(s.scheduled_date + 'T12:00:00'), 'MM/dd/yyyy') : '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.time && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono text-[10px] whitespace-nowrap">
                                                                        {s.scheduled_start ? new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (s.scheduled_time?.substring(0, 5) || '—')}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.status && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-center whitespace-nowrap">
                                                                        <span className={cn(
                                                                            "text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block",
                                                                            s.status === 'completed' && "bg-emerald-100 text-emerald-900",
                                                                            (s.status === 'active' || s.status === 'ongoing') && "bg-blue-100 text-blue-900",
                                                                            s.status === 'scheduled' && "bg-amber-100 text-amber-900",
                                                                            s.status === 'no_show' && "bg-orange-100 text-orange-900",
                                                                            (s.status === 'unsuccessful' || s.status === 'terminated' || s.status === 'cancelled') && "bg-rose-100 text-rose-900"
                                                                        )}>
                                                                            {s.status.toUpperCase()}
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.remarks && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 text-slate-500 italic text-[10px]">
                                                                        —
                                                                    </td>
                                                                )}
                                                                {/* Dynamic Custom Column Cells */}
                                                                {customColumns.map(col => (
                                                                    <td key={col.id} className="py-1.5 px-2 border-r border-slate-300 text-center">
                                                                        <div className="h-4 border-b border-dotted border-slate-300"></div>
                                                                    </td>
                                                                ))}
                                                                {visibleColumns.officerInitials && (
                                                                    <td className="py-1.5 px-2 text-center">
                                                                        <span className="text-[10px] font-mono font-medium text-slate-700">
                                                                            {s.officer_initials || '—'}
                                                                        </span>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Sign-off / Prepared By Section (Dynamic) */}
                                        <div className="mt-8 pt-4 border-t border-slate-300 grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-[11px]">
                                            {/* Prepared By block */}
                                            <div>
                                                <p className="font-semibold text-slate-700 mb-4">Prepared and Certified by:</p>
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-slate-950 uppercase text-xs tracking-wide">
                                                        {preparedByName}
                                                    </div>
                                                    <div className="text-slate-600 text-[10px]">
                                                        {preparedByRole}
                                                    </div>
                                                    <div className="text-slate-600 text-[10px]">
                                                        Badge / PIN: <span className="font-mono font-semibold text-slate-900">{preparedByBadge}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic additional signatories */}
                                            {signatories.filter(s => s.enabled).map((sig) => (
                                                <div key={sig.id} className="text-left">
                                                    <p className="font-semibold text-slate-700 mb-4">{sig.label}:</p>
                                                    <div className="space-y-0.5">
                                                        <div className="font-bold text-slate-950 uppercase text-xs">
                                                            {sig.name}
                                                        </div>
                                                        <div className="text-slate-600 text-[10px]">
                                                            {sig.title}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Footer notice */}
                                        <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[8.5px] text-slate-500 flex items-center justify-between">
                                            <span>Electronically generated and verified via eDalaw BJMP Security Portal</span>
                                            <span>Page 1 of 1 | Generated on {format(new Date(), 'MMM d, yyyy hh:mm a')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
