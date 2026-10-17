import { Head, useForm } from '@inertiajs/react';
import {
    Camera, CheckCircle, Clock, Download, FileText, Image, MoreVertical, XCircle,
    List, BarChart2, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Users,
    Mic, MicOff, Video, VideoOff, ChevronLeft, ChevronRight, CalendarDays,
    CalendarRange, Eye, Sparkles, Filter, Check, Info, Tv, Search, Shield, Building2,
    UserCheck, HelpCircle, FileCheck, Phone
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import axios from 'axios';

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

type Visit = {
    id: number;
    reference_number?: string;
    visitor_name: string;
    visitor_email: string;
    inmate_name: string;
    inmate_id: number | null;
    inmate_number?: string;
    relationship_to_inmate?: string;
    cell_info: {
        cell_number: string;
        floor: string;
        dormitory_name: string | null;
        annex_name: string | null;
    } | null;
    scheduled_date: string;
    scheduled_time: string;
    visit_type: 'virtual' | 'physical';
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    rejection_reason: string | null;
    created_at: string | null;
    has_session: boolean;
    relationship_proof_path: string | null;
    additional_proof_path: string | null;
    notes: string | null;
};

type Props = {
    visits: Visit[];
    scheduleVisits?: Visit[];
    stats: { total_visits: number; pending_visits: number; approved_visits: number; rejected_visits: number; completed_visits: number; virtual_visits: number };
    chartData: { visits_by_status: { status: string; count: number }[]; visits_by_type: { type: string; count: number }[] };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters?: {
        status: string;
        visit_type: string;
    };
    scopeSummary?: {
        is_admin_all: boolean;
        dorms_count: number;
        buildings_count: number;
        cells_count: number;
    };
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

function getVisitTypeBadge(type: string) {
    const isVirtual = type === 'virtual';
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${isVirtual ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {isVirtual ? 'Virtual' : 'Physical'}
        </span>
    );
}

function DocumentCard({ title, path, icon }: { title: string; path: string; icon: React.ReactNode }) {
    // Clean path so it matches the expected visits/... relative path in /documents/visit/{path}
    const cleanPath = path ? path.replace(/^\/?(uploads\/|storage\/)/, '') : '';
    const fileUrl = cleanPath.startsWith('visits/')
        ? `/documents/visit/${cleanPath}`
        : `/documents/visit/visits/${cleanPath}`;

    const fileName = path.split('/').pop() || 'Document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension || '');

    return (
        <div className="border border-border rounded-lg p-4 bg-card hover:border-border transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-blue-50 text-blue-600 rounded-lg p-2 flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{fileName}</p>
                    </div>
                </div>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0"
                >
                    <Download className="h-3.5 w-3.5" />
                    View
                </a>
            </div>
            {isImage && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <img
                        src={fileUrl}
                        alt={title}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default function AssignedVisitSessions({ visits, scheduleVisits = [], stats, chartData, pagination, filters: initialFilters, scopeSummary }: Props) {
    useToast();
    const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? 'all');
    const [typeFilter, setTypeFilter] = useState(initialFilters?.visit_type ?? 'all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(() => visits[0] || null);
    const [selectedVisitIds, setSelectedVisitIds] = useState<number[]>([]);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);

    // Timetable & Calendar Navigation State
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
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

    const [activeTab, setActiveTab] = useState('records');
    const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('week');

    // All visits available for the visual timetable/calendar
    const allScheduleVisits = useMemo(() => {
        if (scheduleVisits && scheduleVisits.length > 0) {
            return scheduleVisits;
        }
        return visits;
    }, [scheduleVisits, visits]);

    // Filtered for timetable & calendar if status or type filters are applied
    const filteredScheduleVisits = useMemo(() => {
        let result = allScheduleVisits;
        if (statusFilter !== 'all') {
            result = result.filter(v => v.status === statusFilter);
        }
        if (typeFilter !== 'all') {
            result = result.filter(v => v.visit_type === typeFilter);
        }
        return result;
    }, [allScheduleVisits, statusFilter, typeFilter]);

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

    // Visits grouped by date string
    const visitsByDate = useMemo(() => {
        const map = new Map<string, Visit[]>();
        filteredScheduleVisits.forEach((visit) => {
            const dateKey = visit.scheduled_date;
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(visit);
        });
        return map;
    }, [filteredScheduleVisits]);

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
                visits: visitsByDate.get(dateStr) || [],
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
                visits: visitsByDate.get(dateStr) || [],
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
                visits: visitsByDate.get(dateStr) || [],
            });
        }

        return days;
    }, [currentMonth, visitsByDate]);

    // Visits on the selected date
    const selectedDateVisits = useMemo(() => {
        const list = visitsByDate.get(selectedDate) || [];
        return [...list].sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
    }, [visitsByDate, selectedDate]);

    // Timetable time slots (from 08:00 to 17:00 standard prison visit hours)
    const timeSlots = useMemo(() => [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
    ], []);

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

    const form = useForm({
        rejection_reason: '',
    });

    const columns: ColumnDef<Visit>[] = useMemo(() => [
        {
            accessorKey: 'visitor_name',
            header: 'Visitor',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.visitor_name}</div>
                    <div className="text-xs text-muted-foreground">{row.original.visitor_email}</div>
                </div>
            ),
        },
        {
            accessorKey: 'inmate_name',
            header: 'PDL',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.inmate_name}</div>
                    {row.original.cell_info && (
                        <div className="text-xs text-muted-foreground">
                            {row.original.cell_info.cell_number}, {row.original.cell_info.floor}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'scheduled_date',
            header: 'Schedule',
            cell: ({ row }) => {
                const visit = row.original;
                const date = new Date(visit.scheduled_date);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = visit.scheduled_time;

                return (
                    <div className="space-y-1">
                        <div className="font-medium">{dateStr}</div>
                        <div className="text-xs text-muted-foreground">{timeStr}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'visit_type',
            header: 'Type',
            cell: ({ row }) => getVisitTypeBadge(row.original.visit_type),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const visit = row.original;
                const isPending = visit.status === 'pending';
                const isApproved = visit.status === 'approved';

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {isPending && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedVisit(visit);
                                            setIsApproveModalOpen(true);
                                        }}
                                        className="text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedVisit(visit);
                                            form.setData('rejection_reason', '');
                                            setIsRejectModalOpen(true);
                                        }}
                                        className="text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                </>
                            )}

                            {isApproved && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Media Controls</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const videoWindow = window.open('', '_blank');
                                            if (videoWindow) {
                                                videoWindow.postMessage({ type: 'toggle-mic' }, '*');
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Mic className="mr-2 h-4 w-4" />
                                        Allow Microphone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const videoWindow = window.open('', '_blank');
                                            if (videoWindow) {
                                                videoWindow.postMessage({ type: 'toggle-camera' }, '*');
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Video className="mr-2 h-4 w-4" />
                                        Allow Camera
                                    </DropdownMenuItem>
                                </>
                            )}

                            <DropdownMenuItem onClick={() => { setSelectedVisit(visit); setIsViewDetailsModalOpen(true); }} className="gap-2 cursor-pointer">
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    const handleApprove = async () => {
        if (!selectedVisit) return;
        try {
            await axios.post(`/jail-officer/assigned-visit-sessions/${selectedVisit.id}/approve`);
            window.location.reload();
        } catch (error: any) {
            alert(error?.response?.data?.errors?.approve?.[0] || error?.response?.data?.message || 'Failed to approve visit');
        }
    };

    const handleReject = async () => {
        if (!selectedVisit || !form.data.rejection_reason) return;
        try {
            await axios.post(`/jail-officer/assigned-visit-sessions/${selectedVisit.id}/reject`, form.data);
            window.location.reload();
        } catch (error: any) {
            alert(error?.response?.data?.errors?.rejection_reason?.[0] || 'Failed to reject visit');
        }
    };

    const filteredVisits = useMemo(() => {
        let result = visits;
        if (statusFilter !== 'all') {
            result = result.filter(v => v.status === statusFilter);
        }
        if (typeFilter !== 'all') {
            result = result.filter(v => v.visit_type === typeFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(v =>
                (v.visitor_name && v.visitor_name.toLowerCase().includes(q)) ||
                (v.inmate_name && v.inmate_name.toLowerCase().includes(q)) ||
                (v.reference_number && v.reference_number.toLowerCase().includes(q)) ||
                (v.cell_info?.cell_number && v.cell_info.cell_number.toLowerCase().includes(q))
            );
        }
        // Ensure the latest and most recent scheduled visit is at the very top (first row)
        return [...result].sort((a, b) => {
            const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (bCreated !== aCreated) {
                return bCreated - aCreated;
            }
            return (b.id || 0) - (a.id || 0);
        });
    }, [visits, statusFilter, typeFilter, searchQuery]);

    return (
        <AppLayout>
            <Head title="Visit Approvals" />
            <div className="min-h-screen bg-background">
                {/* Sub-Header / Page Title Banner */}
                <div className="bg-card/80 backdrop-blur-sm border-b border-border/60 px-6 py-4 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">Visit Requests & Approvals</h1>
                                <p className="text-xs text-muted-foreground">
                                    {scopeSummary?.is_admin_all
                                        ? 'Full Facility Scope • All dormitories & cells'
                                        : `Assigned Area • ${scopeSummary?.cells_count ?? 0} cells across ${scopeSummary?.buildings_count ?? 0} buildings`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="/jail-officer/visit-queue-tv"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900"
                                title="Open TV Queue Display in a new tab"
                            >
                                <Tv className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>Launch TV Queue</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    {/* Modern Pastel KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Requests - Soft Pastel Blue */}
                        <div className="rounded-2xl border border-sky-100 bg-[#f0f7ff] p-5 shadow-sm transition-all hover:shadow dark:border-sky-950 dark:bg-sky-950/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">Total Requests</span>
                                <div className="rounded-xl bg-white/80 p-2 text-sky-600 shadow-xs dark:bg-sky-900/40 dark:text-sky-300">
                                    <FileText className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {stats.total_visits}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-medium text-sky-700 dark:text-sky-300">{stats.virtual_visits} virtual</span>
                                <span>•</span>
                                <span>{Math.max(0, stats.total_visits - stats.virtual_visits)} physical</span>
                            </div>
                        </div>

                        {/* Pending Review - Soft Pastel Orange / Peach */}
                        <div className="rounded-2xl border border-amber-100 bg-[#fff7ed] p-5 shadow-sm transition-all hover:shadow dark:border-amber-950 dark:bg-amber-950/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">Pending Review</span>
                                <div className="rounded-xl bg-white/80 p-2 text-amber-600 shadow-xs dark:bg-amber-900/40 dark:text-amber-300">
                                    <Clock className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {stats.pending_visits}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Needs action</span>
                            </div>
                        </div>

                        {/* Approved - Soft Pastel Mint Green */}
                        <div className="rounded-2xl border border-emerald-100 bg-[#f0fdf4] p-5 shadow-sm transition-all hover:shadow dark:border-emerald-950 dark:bg-emerald-950/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Approved</span>
                                <div className="rounded-xl bg-white/80 p-2 text-emerald-600 shadow-xs dark:bg-emerald-900/40 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {stats.approved_visits}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {stats.total_visits > 0 ? Math.round((stats.approved_visits / stats.total_visits) * 100) : 0}%
                                </span>
                                <span>approval rate</span>
                            </div>
                        </div>

                        {/* Rejected - Soft Pastel Rose / Pink */}
                        <div className="rounded-2xl border border-rose-100 bg-[#fff1f2] p-5 shadow-sm transition-all hover:shadow dark:border-rose-950 dark:bg-rose-950/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-400">Rejected</span>
                                <div className="rounded-xl bg-white/80 p-2 text-rose-600 shadow-xs dark:bg-rose-900/40 dark:text-rose-300">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                {stats.rejected_visits}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-semibold text-rose-700 dark:text-rose-400">
                                    {stats.total_visits > 0 ? Math.round((stats.rejected_visits / stats.total_visits) * 100) : 0}%
                                </span>
                                <span>declined rate</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs Bar */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                        <div className="border-b border-border/70">
                            <TabsList className="bg-transparent p-0 h-auto gap-8 rounded-none border-b-0">
                                <TabsTrigger
                                    value="records"
                                    className="relative rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-amber-600 data-[state=active]:text-amber-600 data-[state=active]:shadow-none dark:data-[state=active]:border-amber-500 dark:data-[state=active]:text-amber-400"
                                >
                                    Visit Requests
                                    {stats.pending_visits > 0 && (
                                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                            {stats.pending_visits}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="timetable"
                                    className="relative rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-amber-600 data-[state=active]:text-amber-600 data-[state=active]:shadow-none dark:data-[state=active]:border-amber-500 dark:data-[state=active]:text-amber-400"
                                >
                                    Weekly Schedule & Timetable
                                </TabsTrigger>
                                <TabsTrigger
                                    value="calendar"
                                    className="relative rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-amber-600 data-[state=active]:text-amber-600 data-[state=active]:shadow-none dark:data-[state=active]:border-amber-500 dark:data-[state=active]:text-amber-400"
                                >
                                    Calendar Quick View
                                </TabsTrigger>
                                <TabsTrigger
                                    value="analytics"
                                    className="relative rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-amber-600 data-[state=active]:text-amber-600 data-[state=active]:shadow-none dark:data-[state=active]:border-amber-500 dark:data-[state=active]:text-amber-400"
                                >
                                    Analytics
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Visit Requests Tab: 2-Column Split Layout */}
                        <TabsContent value="records" className="space-y-4">
                            {/* Filter Bar */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
                                <div className="relative flex-1 min-w-[260px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by visitor, PDL, or reference ID..."
                                        className="pl-9 bg-background/60 rounded-xl h-9 text-xs"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                                        <Filter className="h-3.5 w-3.5" />
                                        <span>Filters:</span>
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-background/60">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-[125px] h-9 text-xs rounded-xl bg-background/60">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="virtual">Virtual</SelectItem>
                                            <SelectItem value="physical">Physical</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStatusFilter('all');
                                                setTypeFilter('all');
                                                setSearchQuery('');
                                            }}
                                            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 2-Column Grid: Left (Table), Right (Request Details Drawer) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                {/* Left Side: Request List Table */}
                                <div className="lg:col-span-7 xl:col-span-8 bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="border-b border-border/70 bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                                                <tr>
                                                    <th className="py-3 px-3 w-10 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={filteredVisits.length > 0 && selectedVisitIds.length === filteredVisits.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedVisitIds(filteredVisits.map(v => v.id));
                                                                } else {
                                                                    setSelectedVisitIds([]);
                                                                }
                                                            }}
                                                            className="rounded border-border text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                                                        />
                                                    </th>
                                                    <th className="py-3 px-3">Visitor Name</th>
                                                    <th className="py-3 px-3">Inmate Name</th>
                                                    <th className="py-3 px-3">Visit Type</th>
                                                    <th className="py-3 px-3">Date & Time</th>
                                                    <th className="py-3 px-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50 font-normal">
                                                {filteredVisits.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <FileText className="h-8 w-8 text-muted-foreground/40" />
                                                                <p className="text-sm font-medium">No visit requests match the current filters</p>
                                                                <p className="text-xs text-muted-foreground">Try adjusting your search terms or filter selection.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredVisits.map((visit) => {
                                                        const isSelected = selectedVisit?.id === visit.id;
                                                        const isChecked = selectedVisitIds.includes(visit.id);
                                                        const dateObj = new Date(visit.scheduled_date);
                                                        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                                                        // Avatar initials
                                                        const visitorInitials = visit.visitor_name
                                                            ? visit.visitor_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                                                            : 'V';

                                                        return (
                                                            <tr
                                                                key={visit.id}
                                                                onClick={() => setSelectedVisit(visit)}
                                                                className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                                                                    isSelected ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                                                                }`}
                                                            >
                                                                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedVisitIds(prev => [...prev, visit.id]);
                                                                            } else {
                                                                                setSelectedVisitIds(prev => prev.filter(id => id !== visit.id));
                                                                            }
                                                                        }}
                                                                        className="rounded border-border text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200 dark:border-slate-700">
                                                                            {visitorInitials}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-semibold text-foreground text-xs leading-snug">
                                                                                {visit.visitor_name}
                                                                            </div>
                                                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                                                {visit.reference_number || `REQ-${visit.id}`}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="font-medium text-foreground text-xs">
                                                                        {visit.inmate_name}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        {visit.cell_info?.cell_number ? `Cell ${visit.cell_info.cell_number}` : 'Unassigned Cell'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                                                        visit.visit_type === 'virtual'
                                                                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
                                                                            : 'bg-orange-50 text-orange-700 border border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900'
                                                                    }`}>
                                                                        {visit.visit_type === 'virtual' ? 'Virtual' : 'In-Person'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="font-medium text-foreground text-xs">{formattedDate}</div>
                                                                    <div className="text-[10px] text-muted-foreground">{visit.scheduled_time}</div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    {getStatusBadge(visit.status)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 border-t border-border/70 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Showing {filteredVisits.length} of {visits.length} records</span>
                                        {selectedVisitIds.length > 0 && (
                                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                                {selectedVisitIds.length} request(s) selected
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Sticky "Request Details" Panel */}
                                <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
                                    <div className="bg-card rounded-2xl border border-border/70 shadow-sm p-5 space-y-5">
                                        {selectedVisit ? (
                                            <>
                                                {/* Header */}
                                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-foreground">Request Details</h3>
                                                        <p className="text-[11px] font-mono text-muted-foreground">
                                                            {selectedVisit.reference_number || `REQ-${selectedVisit.id}`}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {getStatusBadge(selectedVisit.status)}
                                                    </div>
                                                </div>

                                                {/* Visitor & Inmate Profiles */}
                                                <div className="space-y-3">
                                                    {/* Visitor Card */}
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                                                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900">
                                                            {selectedVisit.visitor_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visitor</div>
                                                            <div className="font-bold text-foreground text-xs truncate">{selectedVisit.visitor_name}</div>
                                                            <div className="text-[11px] text-muted-foreground truncate">{selectedVisit.visitor_email}</div>
                                                        </div>
                                                    </div>

                                                    {/* Inmate Card */}
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                                                            {selectedVisit.inmate_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">PDL (Inmate)</div>
                                                            <div className="font-bold text-foreground text-xs truncate">{selectedVisit.inmate_name}</div>
                                                            <div className="text-[11px] text-muted-foreground truncate">
                                                                {selectedVisit.inmate_number || (selectedVisit.cell_info?.cell_number ? `Cell ${selectedVisit.cell_info.cell_number}` : 'Facility')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Meta Info Grid */}
                                                <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/60 py-3">
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Relationship</span>
                                                        <span className="font-semibold text-foreground capitalize">
                                                            {selectedVisit.relationship_to_inmate || 'Family Member'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Visit Type</span>
                                                        <span className="font-semibold text-foreground capitalize">
                                                            {selectedVisit.visit_type === 'virtual' ? 'Virtual (e-Dalaw)' : 'In-Person Visit'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Scheduled Date</span>
                                                        <span className="font-semibold text-foreground">
                                                            {new Date(selectedVisit.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Scheduled Time</span>
                                                        <span className="font-semibold text-foreground">
                                                            {selectedVisit.scheduled_time}
                                                        </span>
                                                    </div>
                                                    {selectedVisit.cell_info && (
                                                        <div className="col-span-2">
                                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">Assigned Location</span>
                                                            <span className="font-medium text-foreground">
                                                                Cell {selectedVisit.cell_info.cell_number}
                                                                {selectedVisit.cell_info.dormitory_name && ` • ${selectedVisit.cell_info.dormitory_name}`}
                                                                {selectedVisit.cell_info.annex_name && ` (${selectedVisit.cell_info.annex_name})`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Notes / Reason */}
                                                {selectedVisit.notes && (
                                                    <div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium mb-1">Visitor Notes</span>
                                                        <div className="rounded-xl bg-muted/40 p-2.5 text-xs text-foreground border border-border/40">
                                                            {selectedVisit.notes}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Attached Supporting Documents */}
                                                <div>
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium mb-2">Supporting Documents</span>
                                                    <div className="space-y-2">
                                                        {selectedVisit.relationship_proof_path ? (
                                                            <a
                                                                href={`/documents/visit/${selectedVisit.relationship_proof_path.replace(/^\/?(uploads\/|storage\/)/, '').startsWith('visits/') ? selectedVisit.relationship_proof_path.replace(/^\/?(uploads\/|storage\/)/, '') : `visits/${selectedVisit.relationship_proof_path.replace(/^\/?(uploads\/|storage\/)/, '')}`}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-amber-300 dark:hover:border-amber-700 bg-background/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all text-xs"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <span className="font-medium truncate">Government_ID_Proof.pdf</span>
                                                                </div>
                                                                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            </a>
                                                        ) : null}

                                                        {selectedVisit.additional_proof_path ? (
                                                            <a
                                                                href={`/documents/visit/${selectedVisit.additional_proof_path.replace(/^\/?(uploads\/|storage\/)/, '').startsWith('visits/') ? selectedVisit.additional_proof_path.replace(/^\/?(uploads\/|storage\/)/, '') : `visits/${selectedVisit.additional_proof_path.replace(/^\/?(uploads\/|storage\/)/, '')}`}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-amber-300 dark:hover:border-amber-700 bg-background/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all text-xs"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                                                        <FileCheck className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <span className="font-medium truncate">Relationship_Certificate.pdf</span>
                                                                </div>
                                                                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            </a>
                                                        ) : null}

                                                        {!selectedVisit.relationship_proof_path && !selectedVisit.additional_proof_path && (
                                                            <div className="p-3 text-center text-xs text-muted-foreground rounded-xl bg-muted/20 border border-dashed border-border">
                                                                No documents attached
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons: Reject, Request Info, Approve */}
                                                {selectedVisit.status === 'pending' ? (
                                                    <div className="pt-2 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    form.setData('rejection_reason', '');
                                                                    setIsRejectModalOpen(true);
                                                                }}
                                                                className="flex-1 h-9 rounded-xl text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                                                                Reject
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSelectedVisit(selectedVisit);
                                                                    setIsViewDetailsModalOpen(true);
                                                                }}
                                                                className="flex-1 h-9 rounded-xl text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                            >
                                                                <HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                                                Full Info
                                                            </Button>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            onClick={() => setIsApproveModalOpen(true)}
                                                            className="w-full h-10 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-sm"
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1.5" />
                                                            Approve Visit
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="pt-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => setIsViewDetailsModalOpen(true)}
                                                            className="w-full h-9 rounded-xl text-xs font-medium"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                                            View Full Log & Details
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="py-12 text-center text-muted-foreground">
                                                <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                                <p className="text-xs font-medium">Select a visit from the table to preview details and actions.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Weekly Schedule & Timetable Tab */}
                        <TabsContent value="timetable" className="space-y-4">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            <h3 className="font-semibold text-foreground text-base">Weekly Schedule Timetable</h3>
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
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[130px] h-9 text-xs">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                                            <SelectTrigger className="w-[120px] h-9 text-xs">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="virtual">Virtual</SelectItem>
                                                <SelectItem value="physical">Physical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <CardContent className="p-4 sm:p-6">
                                    {/* 7-Day Overview Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
                                        {weekDays.map((day) => {
                                            const dayVisits = visitsByDate.get(day.dateStr) || [];
                                            const pendingCount = dayVisits.filter(v => v.status === 'pending').length;
                                            const approvedCount = dayVisits.filter(v => v.status === 'approved').length;
                                            const hasItems = dayVisits.length > 0;

                                            return (
                                                <button
                                                    key={day.dateStr}
                                                    type="button"
                                                    onClick={() => setSelectedDate(day.dateStr)}
                                                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${day.isSelected
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
                                                                {pendingCount > 0 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                        {pendingCount} pend
                                                                    </span>
                                                                )}
                                                                {approvedCount > 0 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        {approvedCount} appv
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-muted-foreground/60">No visits</span>
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
                                                    {selectedDateVisits.length} {selectedDateVisits.length === 1 ? 'Visit' : 'Visits'} Scheduled
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Pending
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Approved
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Completed
                                                </span>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-border/60">
                                            {selectedDateVisits.length === 0 ? (
                                                <div className="py-12 text-center">
                                                    <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-foreground">No visits scheduled on this day</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Select another date from the week view or adjust your filters</p>
                                                </div>
                                            ) : (
                                                selectedDateVisits.map((visit) => {
                                                    const isPending = visit.status === 'pending';
                                                    const isApproved = visit.status === 'approved';

                                                    return (
                                                        <div
                                                            key={visit.id}
                                                            className="p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-20 shrink-0 text-center bg-muted/60 rounded-lg p-2 border border-border">
                                                                    <div className="text-xs font-bold text-foreground">
                                                                        {visit.scheduled_time || 'TBD'}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                                                        {visit.visit_type}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-semibold text-foreground text-sm">
                                                                            {visit.visitor_name}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">visiting</span>
                                                                        <span className="font-medium text-foreground text-sm bg-muted/80 px-2 py-0.5 rounded">
                                                                            {visit.inmate_name}
                                                                        </span>
                                                                        {getStatusBadge(visit.status)}
                                                                        {getVisitTypeBadge(visit.visit_type)}
                                                                    </div>

                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                                        {visit.cell_info && (
                                                                            <span>
                                                                                Cell: <span className="font-medium text-foreground">{visit.cell_info.cell_number}</span> ({visit.cell_info.floor})
                                                                            </span>
                                                                        )}
                                                                        {visit.cell_info?.dormitory_name && (
                                                                            <span>Dorm: {visit.cell_info.dormitory_name}</span>
                                                                        )}
                                                                        <span>Email: {visit.visitor_email}</span>
                                                                    </div>

                                                                    {visit.notes && (
                                                                        <p className="text-xs text-muted-foreground italic line-clamp-1 mt-1">
                                                                            "{visit.notes}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                                {isPending && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedVisit(visit);
                                                                                setIsApproveModalOpen(true);
                                                                            }}
                                                                            className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs font-medium"
                                                                        >
                                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setSelectedVisit(visit);
                                                                                form.setData('rejection_reason', '');
                                                                                setIsRejectModalOpen(true);
                                                                            }}
                                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs font-medium"
                                                                        >
                                                                            <XCircle className="w-3.5 h-3.5" />
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setSelectedVisit(visit);
                                                                        setIsViewDetailsModalOpen(true);
                                                                    }}
                                                                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    Details
                                                                </Button>
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
                                            Click any date to see scheduled visits and take quick approval actions
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
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[130px] h-9 text-xs">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                                            <SelectTrigger className="w-[120px] h-9 text-xs">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="virtual">Virtual</SelectItem>
                                                <SelectItem value="physical">Physical</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                                const dayVisits = day.visits;
                                                const isSelected = selectedDate === day.dateStr;
                                                const pendingVisits = dayVisits.filter(v => v.status === 'pending');
                                                const approvedVisits = dayVisits.filter(v => v.status === 'approved');

                                                return (
                                                    <div
                                                        key={`${day.dateStr}-${idx}`}
                                                        onClick={() => setSelectedDate(day.dateStr)}
                                                        className={`min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                                                            ? 'bg-primary/5 ring-2 ring-primary ring-inset z-10'
                                                            : !day.isCurrentMonth
                                                                ? 'bg-muted/15 text-muted-foreground/50'
                                                                : 'hover:bg-muted/30 bg-card'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${day.isToday
                                                                ? 'bg-blue-600 text-white font-bold'
                                                                : isSelected
                                                                    ? 'bg-primary text-white font-bold'
                                                                    : day.isCurrentMonth
                                                                        ? 'text-foreground'
                                                                        : 'text-muted-foreground/60'
                                                                }`}>
                                                                {day.dayNumber}
                                                            </span>
                                                            {dayVisits.length > 0 && (
                                                                <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                                                    {dayVisits.length}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Preview badges */}
                                                        <div className="space-y-1 my-1 flex-1 overflow-hidden">
                                                            {pendingVisits.length > 0 && (
                                                                <div className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium truncate flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                                                    <span>{pendingVisits.length} Pending</span>
                                                                </div>
                                                            )}
                                                            {approvedVisits.length > 0 && (
                                                                <div className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium truncate flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                                                    <span>{approvedVisits.length} Approved</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {dayVisits.length > 0 ? (
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                {dayVisits[0].inmate_name}
                                                            </div>
                                                        ) : (
                                                            <div className="h-3" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Selected Day Quick Inspector */}
                                    <div className="rounded-xl border border-border p-5 bg-muted/20">
                                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                            <div>
                                                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                                    <CalendarDays className="w-4 h-4 text-primary" />
                                                    Visits on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Quick view list with instant approval actions
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {selectedDateVisits.length} {selectedDateVisits.length === 1 ? 'Visit' : 'Visits'}
                                            </Badge>
                                        </div>

                                        {selectedDateVisits.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground text-xs">
                                                No visits scheduled for this selected day.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {selectedDateVisits.map((visit) => (
                                                    <div
                                                        key={visit.id}
                                                        className="p-3.5 bg-card rounded-lg border border-border/80 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded">
                                                                    {visit.scheduled_time || 'Time TBD'}
                                                                </span>
                                                                {getStatusBadge(visit.status)}
                                                            </div>

                                                            <div className="font-semibold text-sm text-foreground">
                                                                {visit.visitor_name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                Visiting: <span className="font-medium text-foreground">{visit.inmate_name}</span>
                                                            </div>
                                                            {visit.cell_info && (
                                                                <div className="text-[11px] text-muted-foreground mt-1">
                                                                    Cell {visit.cell_info.cell_number} ({visit.cell_info.floor})
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="pt-3 mt-3 border-t border-border flex items-center justify-between gap-2">
                                                            {getVisitTypeBadge(visit.visit_type)}

                                                            <div className="flex items-center gap-1.5">
                                                                {visit.status === 'pending' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedVisit(visit);
                                                                            setIsApproveModalOpen(true);
                                                                        }}
                                                                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5"
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setSelectedVisit(visit);
                                                                        setIsViewDetailsModalOpen(true);
                                                                    }}
                                                                    className="h-7 text-xs px-2"
                                                                >
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Visits by Status</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of visit statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.visits_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.visits_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Visits by Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Virtual vs Physical distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.visits_by_type} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Visits" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Approve Modal */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Approve Visit Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Review the visit details and attached documents before approving. This will create a video room and notify the visitor.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedVisit && (
                        <div className="py-4 space-y-6">
                            <div className="bg-muted rounded-lg p-4 space-y-4">
                                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Visit Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor</span>
                                        <div className="font-medium">{selectedVisit.visitor_name}</div>
                                        <div className="text-xs text-muted-foreground">{selectedVisit.visitor_email}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">PDL</span>
                                        <div className="font-medium">{selectedVisit.inmate_name}</div>
                                        {selectedVisit.cell_info && (
                                            <div className="text-xs text-muted-foreground">
                                                {selectedVisit.cell_info.cell_number}
                                                {selectedVisit.cell_info.floor && `, Floor ${selectedVisit.cell_info.floor}`}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Date</span>
                                        <div className="font-medium">
                                            {new Date(selectedVisit.scheduled_date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Time</span>
                                        <div className="font-medium">{selectedVisit.scheduled_time}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visit Type</span>
                                        <div className="font-medium capitalize">{selectedVisit.visit_type}</div>
                                    </div>
                                    {selectedVisit.cell_info?.annex_name && (
                                        <div>
                                            <span className="text-muted-foreground text-xs block mb-1">Building</span>
                                            <div className="font-medium">{selectedVisit.cell_info.annex_name}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedVisit.notes && (
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor Notes</span>
                                        <div className="text-sm bg-card border border-border rounded p-3 mt-1">
                                            {selectedVisit.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(selectedVisit.relationship_proof_path || selectedVisit.additional_proof_path) && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Attached Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedVisit.relationship_proof_path && (
                                            <DocumentCard
                                                title="Relationship Proof"
                                                path={selectedVisit.relationship_proof_path}
                                                icon={<Image className="h-4 w-4" />}
                                            />
                                        )}
                                        {selectedVisit.additional_proof_path && (
                                            <DocumentCard
                                                title="Additional Proof"
                                                path={selectedVisit.additional_proof_path}
                                                icon={<FileText className="h-4 w-4" />}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 bg-card pt-4 pb-2 border-t border-border">
                        <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" type="button">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Visit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Reject Visit Schedule</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this visit schedule. The visitor will be notified.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedVisit && (
                        <div className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Visitor:</span>
                                    <div className="font-medium">{selectedVisit.visitor_name}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">PDL:</span>
                                    <div className="font-medium">{selectedVisit.inmate_name}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                                <Textarea
                                    id="rejection_reason"
                                    value={form.data.rejection_reason}
                                    onChange={(e) => form.setData('rejection_reason', e.target.value)}
                                    placeholder="Please provide a reason for rejection..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!form.data.rejection_reason}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Visit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Modal */}
            <Dialog open={isViewDetailsModalOpen} onOpenChange={setIsViewDetailsModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Visit Details
                        </DialogTitle>
                        <DialogDescription>
                            Review the details and attached documents for this visit.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedVisit && (
                        <div className="py-4 space-y-6">
                            <div className="bg-muted rounded-lg p-4 space-y-4">
                                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Visit Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor</span>
                                        <div className="font-medium">{selectedVisit.visitor_name}</div>
                                        <div className="text-xs text-muted-foreground">{selectedVisit.visitor_email}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">PDL</span>
                                        <div className="font-medium">{selectedVisit.inmate_name}</div>
                                        {selectedVisit.cell_info && (
                                            <div className="text-xs text-muted-foreground">
                                                {selectedVisit.cell_info.cell_number}
                                                {selectedVisit.cell_info.floor && `, Floor ${selectedVisit.cell_info.floor}`}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Date</span>
                                        <div className="font-medium">
                                            {new Date(selectedVisit.scheduled_date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Time</span>
                                        <div className="font-medium">{selectedVisit.scheduled_time}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visit Type</span>
                                        <div className="font-medium capitalize">{selectedVisit.visit_type}</div>
                                    </div>
                                    {selectedVisit.cell_info?.annex_name && (
                                        <div>
                                            <span className="text-muted-foreground text-xs block mb-1">Building</span>
                                            <div className="font-medium">{selectedVisit.cell_info.annex_name}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedVisit.notes && (
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor Notes</span>
                                        <div className="text-sm bg-card border border-border rounded p-3 mt-1">
                                            {selectedVisit.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(selectedVisit.relationship_proof_path || selectedVisit.additional_proof_path) && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Attached Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedVisit.relationship_proof_path && (
                                            <DocumentCard
                                                title="Relationship Proof"
                                                path={selectedVisit.relationship_proof_path}
                                                icon={<Image className="h-4 w-4" />}
                                            />
                                        )}
                                        {selectedVisit.additional_proof_path && (
                                            <DocumentCard
                                                title="Additional Proof"
                                                path={selectedVisit.additional_proof_path}
                                                icon={<FileText className="h-4 w-4" />}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 bg-card pt-4 pb-2 border-t border-border">
                        <Button variant="outline" onClick={() => setIsViewDetailsModalOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
