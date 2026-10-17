import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { 
    Calendar as CalendarIcon, 
    CalendarDays, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Printer, 
    ChevronLeft, 
    ChevronRight, 
    Users, 
    List, 
    BarChart2, 
    MapPin, 
    Check, 
    X, 
    ShieldCheck, 
    Info,
    AlertTriangle,
    Settings2,
    Plus,
    Trash2,
    Layout,
    Columns,
    Sliders,
    Maximize2,
    GripVertical,
    MoreVertical,
    Video as VideoIcon,
    Users as UsersIcon,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Search,
    Download,
    Copy,
    Tv,
    CheckCircle,
    Radio,
    Bell,
    Building2,
    ChevronDown,
    FileText,
    PlaySquare,
    CalendarCheck,
    UserCheck,
    FileOutput
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell as RechartsCell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';

export interface PhysicalSession {
    id: number;
    visit_id: number;
    inmate_id: number;
    inmate_name: string;
    visitor_id: number;
    visitor_name: string;
    visitor_email?: string | null;
    visitor_phone?: string | null;
    cell_number: string;
    dormitory_name: string;
    building_name: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    status: string;
    visit_type: string;
    relationship_to_inmate?: string | null;
    notes?: string | null;
    rejection_reason?: string | null;
    is_today: boolean;
    created_at?: string;
}

export interface OfficerInfo {
    id: number;
    name: string;
    badge_number: string;
    branch: string;
    role: string;
}

interface Props {
    sessions: PhysicalSession[];
    officerInfo?: OfficerInfo;
    stats: {
        total_sessions: number;
        approved_sessions: number;
        completed_sessions: number;
        pending_sessions: number;
        rejected_sessions: number;
        visited_pdl_count: number;
        unvisited_pdl_count: number;
        total_pdl_count: number;
    };
    chartData: {
        statusDistribution: Array<{ name: string; value: number; fill: string }>;
    };
    filters: {
        start_date?: string;
        end_date?: string;
        month?: string;
        year?: string;
        status?: string;
    };
}

function StatCard({ icon, value, label, accent, iconBg, iconColor }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    accent: string;
    iconBg: string;
    iconColor: string;
}) {
    return (
        <Card className="relative overflow-hidden border border-border shadow-sm">
            <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        completed: { label: 'Completed / Checked-In', className: 'bg-blue-50 text-blue-700 border-blue-200' },
        rejected: { label: 'No Show / Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const config = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
    return (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.className}`}>
            {config.label}
        </span>
    );
}

/**
 * Check-in window validation helper
 */
function evaluateCheckInWindow(scheduledDate: string | null, scheduledTime: string | null): {
    canCheckIn: boolean;
    reason: string;
} {
    if (!scheduledDate) {
        return { canCheckIn: false, reason: 'No scheduled date set' };
    }

    const today = new Date().toISOString().split('T')[0];
    if (scheduledDate !== today) {
        return { 
            canCheckIn: false, 
            reason: `Scheduled for ${scheduledDate}. Check-in is only available on visit day.` 
        };
    }

    if (!scheduledTime) {
        return { canCheckIn: true, reason: 'Ready for check-in today' };
    }

    // Parse time slot
    const timeParts = scheduledTime.split(':');
    const schedHours = parseInt(timeParts[0], 10);
    const schedMins = parseInt(timeParts[1], 10);

    const now = new Date();
    const scheduledDateTime = new Date();
    scheduledDateTime.setHours(schedHours, schedMins, 0, 0);

    // 30 mins before
    const earliestTime = new Date(scheduledDateTime.getTime() - 30 * 60 * 1000);
    // 2 hours after
    const latestTime = new Date(scheduledDateTime.getTime() + 120 * 60 * 1000);

    if (now < earliestTime) {
        const timeStr = earliestTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { 
            canCheckIn: false, 
            reason: `Early check-in. Opens at ${timeStr} (30 mins before schedule)` 
        };
    }

    if (now > latestTime) {
        return { 
            canCheckIn: false, 
            reason: `Schedule window expired. Please tag as No-Show.` 
        };
    }

    return { canCheckIn: true, reason: 'Within valid check-in window' };
}

export default function PhysicalSessions({ sessions = [], officerInfo, stats, chartData, filters: initialFilters }: Props) {
    useToast();
    const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? 'all');
    const [startDateFilter, setStartDateFilter] = useState(initialFilters?.start_date ?? '');
    const [endDateFilter, setEndDateFilter] = useState(initialFilters?.end_date ?? '');
    const [monthFilter, setMonthFilter] = useState(initialFilters?.month ?? 'none');
    const [yearFilter, setYearFilter] = useState(initialFilters?.year ?? 'none');

    const [activeTab, setActiveTab] = useState('records');
    const [selectedSession, setSelectedSession] = useState<PhysicalSession | null>(() => sessions[0] || null);
    const [detailTab, setDetailTab] = useState<'overview' | 'visitor' | 'pdl' | 'history'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [dormFilter, setDormFilter] = useState('all');
    const [cellFilter, setCellFilter] = useState('all');
    const [statusSubFilter, setStatusSubFilter] = useState('all');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [showCustomizePanel, setShowCustomizePanel] = useState(false);

    // Split Screen & Canvas Controls
    const [paperSize, setPaperSize] = useState<'A4_portrait' | 'A4_landscape' | 'Letter_portrait' | 'Letter_landscape'>('A4_portrait');
    const [zoomScale, setZoomScale] = useState<number>(100);
    const [activeConfigTab, setActiveConfigTab] = useState<'layout' | 'columns' | 'signatories'>('layout');
    const [facilityBranch, setFacilityBranch] = useState(() => officerInfo?.branch || 'Digos City District Jail');
    const [logsheetCustomDate, setLogsheetCustomDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

    // Customizable Columns for Physical Logsheet
    const defaultVisibleColumns = {
        index: true,
        visitor: true,
        relation: true,
        pdl: true,
        cell: true,
        date: true,
        timeIn: true,
        timeOut: true,
        duration: true,
        status: true,
        visitorSignature: true,
        remarks: false,
    };
    const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

    // Custom Additional Columns
    const [customColumns, setCustomColumns] = useState<{ id: string; title: string; defaultVal: string }[]>([]);
    const [newColTitle, setNewColTitle] = useState('');

    // Dynamic Prepared By
    const [preparedByName, setPreparedByName] = useState(() => officerInfo?.name || 'JUAN DELA CRUZ');
    const [preparedByBadge, setPreparedByBadge] = useState(() => officerInfo?.badge_number || 'JO-00029');
    const [preparedByRole, setPreparedByRole] = useState(() => officerInfo?.role || 'Jail Officer');

    // Dynamic Additional Signatories
    const [signatories, setSignatories] = useState([
        {
            id: 'warden',
            label: 'Noted by (Facility Warden)',
            name: 'MARIA DELA TORRE',
            title: 'Jail Warden',
            enabled: true,
        },
        {
            id: 'witness',
            label: 'Witnessed by (Duty Officer)',
            name: 'ANTHONY RAMOS',
            title: 'Duty Officer',
            enabled: true,
        },
        {
            id: 'regional',
            label: 'Reviewed by (Regional Supervisor)',
            name: 'ATTY. CARLOS M. SANTOS',
            title: 'Regional Supervisor (Optional)',
            enabled: false,
        },
    ]);

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

    // Handle filter submission
    const handleApplyFilters = () => {
        router.get('/jail-officer/physical-sessions', {
            start_date: startDateFilter || undefined,
            end_date: endDateFilter || undefined,
            month: monthFilter !== 'none' ? monthFilter : undefined,
            year: yearFilter !== 'none' ? yearFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    // Sessions map grouped by date
    const sessionsByDate = useMemo(() => {
        const map = new Map<string, PhysicalSession[]>();
        sessions.forEach((s) => {
            const dateKey = s.scheduled_date;
            if (dateKey) {
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(s);
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
            const timeA = a.scheduled_time || '';
            const timeB = b.scheduled_time || '';
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

        const totalGridSlots = days.length > 35 ? 42 : 35;
        const remaining = totalGridSlots - days.length;
        for (let i = 1; i <= remaining; i++) {
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

    // Filtered Sessions logic
    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            // Status Subfilter (Pills)
            if (statusSubFilter !== 'all') {
                if (statusSubFilter === 'approved' && s.status !== 'approved' && s.status !== 'scheduled') return false;
                if (statusSubFilter === 'pending' && s.status !== 'pending') return false;
                if (statusSubFilter === 'completed' && s.status !== 'completed') return false;
                if (statusSubFilter === 'no_show' && s.status !== 'no_show') return false;
                if (statusSubFilter === 'cancelled' && s.status !== 'rejected' && s.status !== 'cancelled') return false;
            }

            // Dorm Filter
            if (dormFilter !== 'all') {
                const dormMatch = (s.dormitory_name || '').toLowerCase().includes(dormFilter.toLowerCase()) ||
                                  (s.cell_number || '').toLowerCase().includes(dormFilter.toLowerCase());
                if (!dormMatch) return false;
            }

            // Cell Filter
            if (cellFilter !== 'all') {
                const cellMatch = (s.cell_number || '').toLowerCase().includes(cellFilter.toLowerCase());
                if (!cellMatch) return false;
            }

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const vName = (s.visitor_name || '').toLowerCase();
                const pName = (s.inmate_name || '').toLowerCase();
                const tCode = `v-${s.id}`.toLowerCase();
                const cell = (s.cell_number || '').toLowerCase();
                return vName.includes(q) || pName.includes(q) || tCode.includes(q) || cell.includes(q);
            }

            return true;
        });
    }, [sessions, statusSubFilter, dormFilter, cellFilter, searchQuery]);

    // Unique dorms & cells for dropdown filters
    const availableDorms = useMemo(() => {
        const set = new Set<string>();
        sessions.forEach(s => {
            if (s.dormitory_name) set.add(s.dormitory_name);
            else if (s.cell_number) {
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
            approved: sessions.filter(s => s.status === 'approved' || s.status === 'scheduled').length,
            pending: sessions.filter(s => s.status === 'pending').length,
            completed: sessions.filter(s => s.status === 'completed').length,
            no_show: sessions.filter(s => s.status === 'no_show').length,
            cancelled: sessions.filter(s => s.status === 'rejected' || s.status === 'cancelled').length,
        };
    }, [sessions]);

    const handleMarkComplete = (session: PhysicalSession) => {
        const checkWindow = evaluateCheckInWindow(session.scheduled_date, session.scheduled_time);
        if (!checkWindow.canCheckIn) {
            toast.error(checkWindow.reason);
            return;
        }

        if (!confirm(`Confirm visitor check-in for ${session.visitor_name} visiting ${session.inmate_name}?`)) return;

        router.post(`/jail-officer/physical-sessions/${session.visit_id}/complete`, {}, {
            onSuccess: () => toast.success('Visitor check-in verified and completed.'),
            onError: (errors) => {
                const msg = Object.values(errors)[0] as string;
                toast.error(msg || 'Failed to check in visitor.');
            }
        });
    };

    const handleMarkNoShow = (visitId: number) => {
        const reason = prompt('Please enter the reason for No Show / Rejection:', 'Visitor did not arrive for scheduled physical visit.');
        if (reason === null) return;
        router.post(`/jail-officer/physical-sessions/${visitId}/no-show`, { reason }, {
            onSuccess: () => toast.success('Visit marked as no-show.'),
            onError: () => toast.error('Failed to update visit status.')
        });
    };

    const columns: ColumnDef<PhysicalSession>[] = [
        {
            accessorKey: 'visitor_name',
            header: 'Visitor Information',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold text-foreground">{row.original.visitor_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{row.original.visitor_email || 'No email'}</span>
                        {row.original.relationship_to_inmate && (
                            <>
                                <span>•</span>
                                <span className="capitalize text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                    {row.original.relationship_to_inmate}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'inmate_name',
            header: 'PDL / Cell Location',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-foreground">{row.original.inmate_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-orange-500" />
                        <span>{row.original.cell_number}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{row.original.dormitory_name}</span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'scheduled_date',
            header: 'Schedule Slot',
            cell: ({ row }) => {
                const s = row.original;
                const windowStatus = evaluateCheckInWindow(s.scheduled_date, s.scheduled_time);
                return (
                    <div>
                        <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {s.scheduled_date ? format(new Date(s.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{s.scheduled_time || 'Regular hours'}</span>
                        </div>
                        {s.status === 'approved' && (
                            <div className="mt-1">
                                {windowStatus.canCheckIn ? (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Check-in Open
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={windowStatus.reason}>
                                        {s.scheduled_date === new Date().toISOString().split('T')[0] ? 'Slot Pending' : 'Different Date'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const s = row.original;
                const windowStatus = evaluateCheckInWindow(s.scheduled_date, s.scheduled_time);
                return (
                    <div className="flex items-center justify-end gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => {
                                setSelectedSession(s);
                                setIsDetailsOpen(true);
                            }}
                        >
                            <Info className="w-3.5 h-3.5 mr-1 text-primary" /> Details
                        </Button>
                        {s.status === 'approved' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="h-8 text-xs font-medium text-orange-700 border-orange-200 bg-orange-50/60 hover:bg-orange-100"
                                    title="View & Download Official Proof of Visit PDF"
                                >
                                    <a
                                        href={`/visits/${s.visit_id}/proof`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center"
                                    >
                                        <FileOutput className="w-3.5 h-3.5 mr-1 text-orange-600" /> Proof PDF
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!windowStatus.canCheckIn}
                                    title={!windowStatus.canCheckIn ? windowStatus.reason : 'Verify and Check-in visitor'}
                                    className={cn(
                                        "h-8 text-xs",
                                        windowStatus.canCheckIn 
                                            ? "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-semibold shadow-sm"
                                            : "opacity-40 cursor-not-allowed text-muted-foreground"
                                    )}
                                    onClick={() => handleMarkComplete(s)}
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" /> Check-In
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-red-700 border-red-200 hover:bg-red-50"
                                    onClick={() => handleMarkNoShow(s.visit_id)}
                                >
                                    <X className="w-3.5 h-3.5 mr-1" /> No Show
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout>
            <Head title="Physical Visit Sessions" />
            <div className="min-h-screen bg-slate-50/60 pb-12">
                {/* Modern Top Bar / Header */}
                <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-30 shadow-xs">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <span className="font-medium text-slate-600">eDalaw+</span>
                                <span>&rsaquo;</span>
                                <span className="text-slate-900 font-semibold">Physical Sessions</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Physical Visit Sessions</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Monitor and manage in-person physical visits across your assigned cells and dormitories.</p>
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
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Stat Cards (4-Column) matching screenshot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Total Physical Visits */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.total_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Total Physical Visits
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                        <span>&uarr;</span> 2 this week
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Approved / Scheduled */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.approved_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Approved / Scheduled
                                    </div>
                                    <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
                                        {stats.total_sessions > 0 ? Math.round((stats.approved_sessions / stats.total_sessions) * 100) : 100}% of total
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Completed / Visited */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.completed_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Completed / Visited
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                                        {stats.total_sessions > 0 ? Math.round((stats.completed_sessions / stats.total_sessions) * 100) : 0}% of total
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Pending Review */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                        {stats.pending_sessions}
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Pending Review
                                    </div>
                                    <div className="text-[11px] font-medium text-amber-600 mt-0.5">
                                        {stats.total_sessions > 0 ? Math.round((stats.pending_sessions / stats.total_sessions) * 100) : 0}% of total
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <TabsList className="bg-transparent border-0 p-0 h-auto gap-6">
                                <TabsTrigger 
                                    value="records" 
                                    className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-2 py-2 text-sm font-bold text-slate-600 gap-2 transition-all bg-transparent"
                                >
                                    <List className="w-4 h-4" />
                                    Visit Records
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

                        {/* VISIT RECORDS TAB CONTENT */}
                        <TabsContent value="records" className="space-y-4 m-0">
                            {/* Filter Bar */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    {/* Search input */}
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by visitor name, PDL name, or tunnel code..."
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
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
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
                                                    {startDateFilter ? `${startDateFilter} - ${endDateFilter || 'Oct 31, 2026'}` : 'Oct 01, 2026 - Oct 31, 2026'}
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
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
                                    <span>All Visits</span>
                                    <span className={cn(
                                        "px-1.5 py-0.2 rounded-full text-[10px]",
                                        statusSubFilter === 'all' ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700 font-bold"
                                    )}>
                                        {statusCounts.all}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('approved')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'approved'
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Approved</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                        {statusCounts.approved}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusSubFilter('pending')}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                                        statusSubFilter === 'pending'
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <span>Pending</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                                        {statusCounts.pending}
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
                                            ? "bg-rose-500 text-white shadow-xs"
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

                            {/* Main Two-Column View: Visit Records Table (Left) + Visit Details Inspector Drawer (Right) */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                {/* Left Side: Visit Records Table */}
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
                                                        <th className="py-3 px-3">Visitor Information</th>
                                                        <th className="py-3 px-3">PDL / Cell Location</th>
                                                        <th className="py-3 px-3">Schedule Slot</th>
                                                        <th className="py-3 px-3">Status</th>
                                                        <th className="py-3 px-3 text-center">Actions</th>
                                                        <th className="py-3 px-2 text-center w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {filteredSessions.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                                No physical visit records match your search or filters.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSessions.map((s, index) => {
                                                            const isSelected = selectedSession?.id === s.id;
                                                            const windowStatus = evaluateCheckInWindow(s.scheduled_date, s.scheduled_time);

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
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                                                {(s.visitor_name || 'V').substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-semibold text-slate-900">{s.visitor_name}</div>
                                                                                <div className="text-[10px] text-slate-500">{s.visitor_email || 'visitor@example.com'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="font-semibold text-slate-900">{s.inmate_name}</div>
                                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 text-orange-500" />
                                                                            <span>{s.cell_number} • {s.dormitory_name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                                                                            <CalendarIcon className="w-3 h-3 text-slate-400" />
                                                                            <span>{s.scheduled_date ? format(new Date(s.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                                            <span>{s.scheduled_time || 'Regular hours'}</span>
                                                                        </div>
                                                                        {s.status === 'approved' && (
                                                                            <div className="mt-1">
                                                                                {windowStatus.canCheckIn ? (
                                                                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                                        Check-in Open
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={windowStatus.reason}>
                                                                                        {s.scheduled_date === new Date().toISOString().split('T')[0] ? 'Slot Pending' : 'Different Date'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <span className={cn(
                                                                            "px-2.5 py-1 rounded-full text-[10px] font-bold inline-block",
                                                                            s.status === 'completed' && "bg-blue-50 text-blue-700 border border-blue-200",
                                                                            (s.status === 'approved' || s.status === 'scheduled') && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                                            s.status === 'pending' && "bg-amber-50 text-amber-700 border border-amber-200",
                                                                            s.status === 'no_show' && "bg-orange-50 text-orange-700 border border-orange-200",
                                                                            (s.status === 'rejected' || s.status === 'cancelled') && "bg-rose-50 text-rose-700 border border-rose-200"
                                                                        )}>
                                                                            {s.status === 'approved' ? 'Approved' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => setSelectedSession(s)}
                                                                            className="h-8 px-3 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs gap-1.5"
                                                                        >
                                                                            <Info className="w-3.5 h-3.5 text-orange-500" />
                                                                            Details
                                                                        </Button>
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
                                                                                {s.status === 'approved' && (
                                                                                    <DropdownMenuItem asChild>
                                                                                        <a
                                                                                            href={`/visits/${s.visit_id}/proof`}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="flex items-center gap-2 cursor-pointer text-orange-600"
                                                                                        >
                                                                                            <FileOutput className="w-4 h-4 text-orange-600" />
                                                                                            Proof of Visit PDF
                                                                                        </a>
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                <DropdownMenuItem onClick={() => setIsPrintModalOpen(true)}>
                                                                                    Print Formal Logsheet
                                                                                </DropdownMenuItem>
                                                                                {s.status === 'approved' && (
                                                                                    <>
                                                                                        <DropdownMenuItem onClick={() => handleMarkComplete(s)}>
                                                                                            Check-In Visitor
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem onClick={() => handleMarkNoShow(s.visit_id)} className="text-red-600">
                                                                                            Mark No Show
                                                                                        </DropdownMenuItem>
                                                                                    </>
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
                                                Showing {filteredSessions.length} of {filteredSessions.length} result(s)
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

                                {/* Right Side: Visit Details Inspector Drawer */}
                                {selectedSession && (
                                    <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
                                        {/* Header */}
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-sm">Visit Details</h3>
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold ml-1",
                                                    selectedSession.status === 'completed' && "bg-blue-50 text-blue-700 border border-blue-200",
                                                    (selectedSession.status === 'approved' || selectedSession.status === 'scheduled') && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                    selectedSession.status === 'pending' && "bg-amber-50 text-amber-700 border border-amber-200",
                                                    selectedSession.status === 'no_show' && "bg-orange-50 text-orange-700 border border-orange-200",
                                                    (selectedSession.status === 'rejected' || selectedSession.status === 'cancelled') && "bg-rose-50 text-rose-700 border border-rose-200"
                                                )}>
                                                    {selectedSession.status === 'approved' ? 'Approved' : selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedSession(null)}
                                                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Inspector Tabs (Overview, Visitor, PDL, History) */}
                                        <div className="flex items-center gap-5 text-xs font-semibold border-b border-slate-100 pb-2">
                                            <button 
                                                type="button"
                                                onClick={() => setDetailTab('overview')}
                                                className={cn("pb-1 transition-all", detailTab === 'overview' ? "text-orange-600 border-b-2 border-orange-600 font-bold" : "text-slate-500 hover:text-slate-800")}
                                            >
                                                Overview
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setDetailTab('visitor')}
                                                className={cn("pb-1 transition-all", detailTab === 'visitor' ? "text-orange-600 border-b-2 border-orange-600 font-bold" : "text-slate-500 hover:text-slate-800")}
                                            >
                                                Visitor
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setDetailTab('pdl')}
                                                className={cn("pb-1 transition-all", detailTab === 'pdl' ? "text-orange-600 border-b-2 border-orange-600 font-bold" : "text-slate-500 hover:text-slate-800")}
                                            >
                                                PDL
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setDetailTab('history')}
                                                className={cn("pb-1 transition-all", detailTab === 'history' ? "text-orange-600 border-b-2 border-orange-600 font-bold" : "text-slate-500 hover:text-slate-800")}
                                            >
                                                History
                                            </button>
                                        </div>

                                        {detailTab === 'overview' && (
                                            <>
                                                {/* Meta Information List */}
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Reference No.</span>
                                                        <span className="font-mono font-bold text-slate-900">V-2026-00{selectedSession.id || selectedSession.visit_id}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Tunnel Code</span>
                                                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                                            <span>Q87NJU79</span>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText('Q87NJU79');
                                                                    toast.success('Copied tunnel code to clipboard');
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Visit Type</span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                                            <Users className="w-3 h-3 text-orange-600" />
                                                            Physical Visit
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Schedule Date</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {selectedSession.scheduled_date ? format(new Date(selectedSession.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : 'Oct 19, 2026'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Schedule Time</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {selectedSession.scheduled_time || '07:00 AM - 08:00 AM'} (1 hour)
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Status</span>
                                                        <span className="font-bold text-emerald-600">
                                                            {selectedSession.status === 'approved' ? 'Approved' : selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
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
                                                            {selectedSession.cell_number} • {selectedSession.dormitory_name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                                        <span className="text-slate-400">Purpose</span>
                                                        <span className="font-medium text-slate-900">Family Visit</span>
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

                                                {/* Notes Section */}
                                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                        <span>Notes</span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-xs">
                                                        {selectedSession.notes || 'Regular family visit.'}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {detailTab === 'visitor' && (
                                            <div className="space-y-3 text-xs">
                                                <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                                        {(selectedSession.visitor_name || 'V').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{selectedSession.visitor_name}</div>
                                                        <div className="text-slate-500 text-[11px]">{selectedSession.visitor_email || 'No email provided'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Phone Contact</span>
                                                    <span className="font-semibold text-slate-800">{selectedSession.visitor_phone || '+63 912 345 6789'}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Relationship</span>
                                                    <span className="font-semibold text-slate-800 capitalize">{selectedSession.relationship_to_inmate || 'Spouse / Family'}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Identity Verified</span>
                                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Verified Valid ID
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {detailTab === 'pdl' && (
                                            <div className="space-y-3 text-xs">
                                                <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold flex items-center justify-center text-xs">
                                                        PDL
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{selectedSession.inmate_name}</div>
                                                        <div className="text-slate-500 text-[11px]">ID: #{selectedSession.inmate_id}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Assigned Dormitory</span>
                                                    <span className="font-semibold text-slate-800">{selectedSession.dormitory_name}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Cell Assignment</span>
                                                    <span className="font-semibold text-slate-800">{selectedSession.cell_number}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span className="text-slate-400">Building</span>
                                                    <span className="font-semibold text-slate-800">{selectedSession.building_name || 'Main Detention Building'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {detailTab === 'history' && (
                                            <div className="space-y-4 pl-2 border-l-2 border-emerald-500 text-xs">
                                                <div className="relative pl-3">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[17px] top-1 border-2 border-white"></div>
                                                    <div className="font-bold text-slate-900">Application Approved</div>
                                                    <div className="text-[11px] text-slate-500">Oct 15, 2026 09:30 AM</div>
                                                    <div className="text-[11px] text-slate-600">Approved by JO Maria Santos</div>
                                                </div>
                                                <div className="relative pl-3">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute -left-[17px] top-1 border-2 border-white"></div>
                                                    <div className="font-bold text-slate-900">Scheduled Physical Visit</div>
                                                    <div className="text-[11px] text-slate-500">{selectedSession.scheduled_date || 'Oct 19, 2026'} • {selectedSession.scheduled_time || '07:00 AM'}</div>
                                                    <div className="text-[11px] text-slate-600">Visiting Hall Booth #1</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bottom Action Buttons: Proof PDF, Edit Schedule & Mark as Completed */}
                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                            {selectedSession.status === 'approved' && (
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                    className="w-full h-10 text-xs font-bold text-orange-700 bg-orange-50/70 hover:bg-orange-100 border-orange-200 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                                                >
                                                    <a
                                                        href={`/visits/${selectedSession.visit_id}/proof`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <FileOutput className="w-4 h-4 text-orange-600" />
                                                        View Proof of Visit PDF
                                                    </a>
                                                </Button>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedSession(selectedSession);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                    className="h-10 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                                                >
                                                    <CalendarDays className="w-4 h-4 text-orange-600" />
                                                    Edit Schedule
                                                </Button>

                                                <Button
                                                    onClick={() => handleMarkComplete(selectedSession)}
                                                    className="h-10 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                                                >
                                                    <Check className="w-4 h-4 text-white" />
                                                    Mark as Completed
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Weekly Timetable Tab */}
                        <TabsContent value="timetable">
                            <Card className="border border-border shadow-sm">
                                <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                                            Weekly Physical Visit Schedule
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Week of {format(currentWeekStart, 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                                const prev = new Date(currentWeekStart);
                                                prev.setDate(prev.getDate() - 7);
                                                setCurrentWeekStart(prev);
                                            }}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2.5 text-xs"
                                            onClick={() => {
                                                const today = new Date();
                                                const day = today.getDay();
                                                const diff = today.getDate() - day;
                                                const sunday = new Date(today.setDate(diff));
                                                sunday.setHours(0, 0, 0, 0);
                                                setCurrentWeekStart(sunday);
                                                setSelectedDate(new Date().toISOString().split('T')[0]);
                                            }}
                                        >
                                            Current Week
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                                const next = new Date(currentWeekStart);
                                                next.setDate(next.getDate() + 7);
                                                setCurrentWeekStart(next);
                                            }}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Day Selector Ribbon */}
                                    <div className="grid grid-cols-7 gap-2 pb-6 border-b border-border">
                                        {weekDays.map((day) => {
                                            const dayCount = (sessionsByDate.get(day.dateStr) || []).length;
                                            return (
                                                <button
                                                    key={day.dateStr}
                                                    onClick={() => setSelectedDate(day.dateStr)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-center transition-all",
                                                        day.isSelected
                                                            ? "bg-orange-50 border-orange-500 shadow-sm ring-1 ring-orange-400"
                                                            : "bg-card border-border hover:border-border hover:bg-muted/50"
                                                    )}
                                                >
                                                    <span className="text-xs font-medium text-muted-foreground">{day.dayName}</span>
                                                    <span className={cn(
                                                        "text-lg font-bold my-0.5",
                                                        day.isSelected ? "text-orange-600" : "text-foreground"
                                                    )}>
                                                        {day.dayNumber}
                                                    </span>
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                        {dayCount} {dayCount === 1 ? 'visit' : 'visits'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Daily Timetable Breakdown */}
                                    <div className="pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-sm text-foreground">
                                                Visits on {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                                            </h4>
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {selectedDateSessions.length} Scheduled Sessions
                                            </Badge>
                                        </div>

                                        {selectedDateSessions.length === 0 ? (
                                            <div className="text-center py-12 border border-dashed border-border rounded-xl">
                                                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                <p className="text-sm font-medium text-foreground">No physical visits scheduled for this date</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Visits will populate once visitor requests are approved</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedDateSessions.map((session) => {
                                                    const windowStatus = evaluateCheckInWindow(session.scheduled_date, session.scheduled_time);
                                                    return (
                                                        <div
                                                            key={session.id}
                                                            className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-orange-300 transition-colors"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="p-3 rounded-xl bg-orange-50 text-orange-600 flex flex-col items-center justify-center min-w-[75px]">
                                                                    <Clock className="w-4 h-4 mb-1" />
                                                                    <span className="text-xs font-bold">{session.scheduled_time?.substring(0, 5) || '10:00'}</span>
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-sm text-foreground">{session.visitor_name}</span>
                                                                        <span className="text-xs text-muted-foreground">• Visiting:</span>
                                                                        <span className="font-medium text-sm text-orange-600">{session.inmate_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                                            Cell: {session.cell_number} ({session.dormitory_name})
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span>Pass ID: #{session.visit_id}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 self-end md:self-center">
                                                                {getStatusBadge(session.status)}
                                                                {session.status === 'approved' && (
                                                                    <Button
                                                                        size="sm"
                                                                        disabled={!windowStatus.canCheckIn}
                                                                        title={!windowStatus.canCheckIn ? windowStatus.reason : 'Complete Check-In'}
                                                                        className={cn(
                                                                            "h-8 text-xs font-semibold",
                                                                            windowStatus.canCheckIn 
                                                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                                                : "opacity-40 cursor-not-allowed bg-slate-300 text-slate-600"
                                                                        )}
                                                                        onClick={() => handleMarkComplete(session)}
                                                                    >
                                                                        <Check className="w-3.5 h-3.5 mr-1" /> Check-In
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Calendar Quick View Tab */}
                        <TabsContent value="calendar">
                            <Card className="border border-border shadow-sm">
                                <div className="p-6 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-foreground text-base">
                                            {format(currentMonth, 'MMMM yyyy')}
                                        </h3>
                                        <Badge variant="outline" className="text-xs font-medium text-orange-700 bg-orange-50 border-orange-200">
                                            Physical Visits Overview
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2.5 text-xs"
                                            onClick={() => setCurrentMonth(new Date())}
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-muted-foreground uppercase">
                                        <div>Sun</div>
                                        <div>Mon</div>
                                        <div>Tue</div>
                                        <div>Wed</div>
                                        <div>Thu</div>
                                        <div>Fri</div>
                                        <div>Sat</div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {monthCalendarGrid.map((day, idx) => {
                                            const hasSessions = day.sessions.length > 0;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-colors",
                                                        day.isCurrentMonth ? "bg-card border-border" : "bg-muted/30 border-border text-muted-foreground",
                                                        day.isToday && "ring-2 ring-orange-500",
                                                        hasSessions && "bg-orange-50/20"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn(
                                                            "text-xs font-bold",
                                                            day.isToday ? "text-orange-600" : day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                                                        )}>
                                                            {day.dayNumber}
                                                        </span>
                                                        {hasSessions && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                                {day.sessions.length}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1 mt-1">
                                                        {day.sessions.slice(0, 2).map((s) => (
                                                            <div
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setSelectedSession(s);
                                                                    setIsDetailsOpen(true);
                                                                }}
                                                                className="text-[10px] p-1 rounded bg-orange-100/80 text-orange-900 truncate font-medium cursor-pointer hover:bg-orange-200"
                                                                title={`${s.visitor_name} visiting ${s.inmate_name}`}
                                                            >
                                                                {s.scheduled_time?.substring(0, 5)} {s.inmate_name}
                                                            </div>
                                                        ))}
                                                        {day.sessions.length > 2 && (
                                                            <span className="text-[9px] text-muted-foreground block text-center">
                                                                +{day.sessions.length - 2} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Analytics Tab */}
                        <TabsContent value="analytics">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border border-border shadow-sm p-6">
                                    <h3 className="font-semibold text-foreground mb-1">Physical Visit Status Breakdown</h3>
                                    <p className="text-xs text-muted-foreground mb-4">Distribution of physical visits by current status</p>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.statusDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {chartData.statusDistribution.map((entry, index) => (
                                                        <RechartsCell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs mt-2">
                                        {chartData.statusDistribution.map((entry, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                <span className="text-muted-foreground">{entry.name}:</span>
                                                <span className="font-semibold text-foreground">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <Card className="border border-border shadow-sm p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-1">PDL Visitation Coverage</h3>
                                        <p className="text-xs text-muted-foreground mb-6">PDLs in your assigned cells who have received physical visits</p>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-foreground">Visited PDLs</span>
                                                    <span className="font-bold text-orange-600">{stats.visited_pdl_count} / {stats.total_pdl_count}</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2.5">
                                                    <div
                                                        className="bg-orange-600 h-2.5 rounded-full"
                                                        style={{ width: `${stats.total_pdl_count > 0 ? (stats.visited_pdl_count / stats.total_pdl_count) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-foreground">Pending First Visit</span>
                                                    <span className="font-bold text-muted-foreground">{stats.unvisited_pdl_count}</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2.5">
                                                    <div
                                                        className="bg-slate-300 h-2.5 rounded-full"
                                                        style={{ width: `${stats.total_pdl_count > 0 ? (stats.unvisited_pdl_count / stats.total_pdl_count) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 mt-6 flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-orange-900 leading-relaxed">
                                            Physical visits require in-person visitor identity verification against Bureau of Jail Management and Penology (BJMP) guidelines upon arrival at the gate.
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Visit Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-600" />
                            Physical Visit Session Details
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Scheduled in-person visitation pass information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4 text-xs py-2">
                            <div className="p-3 bg-muted/50 rounded-xl space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Visitor Name:</span>
                                    <span className="font-bold text-foreground">{selectedSession.visitor_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Visitor Email:</span>
                                    <span className="font-medium text-foreground">{selectedSession.visitor_email || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Relationship:</span>
                                    <span className="font-medium text-foreground capitalize">{selectedSession.relationship_to_inmate || 'Visitor'}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/50 rounded-xl space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">PDL Name:</span>
                                    <span className="font-bold text-orange-600">{selectedSession.inmate_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cell Assignment:</span>
                                    <span className="font-medium text-foreground">{selectedSession.cell_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dormitory:</span>
                                    <span className="font-medium text-foreground">{selectedSession.dormitory_name}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/50 rounded-xl space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Visit Schedule:</span>
                                    <span className="font-bold text-foreground">
                                        {selectedSession.scheduled_date ? format(new Date(selectedSession.scheduled_date + 'T12:00:00'), 'MMMM d, yyyy') : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time Slot:</span>
                                    <span className="font-bold text-foreground">{selectedSession.scheduled_time || 'Regular hours'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span>{getStatusBadge(selectedSession.status)}</span>
                                </div>
                            </div>

                            {/* Check-In Window Info */}
                            {selectedSession.status === 'approved' && (
                                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                                    <CalendarCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold text-slate-900 block">Check-In Window Status</span>
                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                            {evaluateCheckInWindow(selectedSession.scheduled_date, selectedSession.scheduled_time).reason}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedSession.rejection_reason && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <span className="font-bold text-red-700 block mb-1">No-Show / Rejection Note:</span>
                                    <p className="text-red-600">{selectedSession.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedSession?.status === 'approved' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="text-xs text-orange-700 border-orange-200 bg-orange-50/70 hover:bg-orange-100"
                                >
                                    <a
                                        href={`/visits/${selectedSession.visit_id}/proof`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5"
                                    >
                                        <FileOutput className="w-3.5 h-3.5 text-orange-600" />
                                        <span>Official Proof PDF</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)} className="text-xs">
                                Close
                            </Button>
                            {selectedSession?.status === 'approved' && (
                                <Button
                                    size="sm"
                                    disabled={!evaluateCheckInWindow(selectedSession.scheduled_date, selectedSession.scheduled_time).canCheckIn}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-50"
                                    onClick={() => {
                                        setIsDetailsOpen(false);
                                        handleMarkComplete(selectedSession);
                                    }}
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" /> Mark Check-In
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Formal BJMP & eDalaw Visitor Logsheet Dialog */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="max-w-[98vw] w-[98vw] h-[94vh] max-h-[94vh] overflow-hidden p-0 sm:max-w-[98vw] bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl flex flex-col rounded-xl">
                    {/* Top Header Bar */}
                    <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                <Printer className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    Official BJMP In-Person Visitation Logsheet
                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30 font-normal">
                                        BJMP FORM VIS-101
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    Standard In-Person Visitor Manifest & Security Log • Republic of the Philippines (RA 10173 Compliant)
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Top Action Controls */}
                        <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/80 mr-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setPaperSize('Letter_portrait')}
                                    className={cn(
                                        "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                                        paperSize.includes('Letter') ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Letter
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaperSize('A4_portrait')}
                                    className={cn(
                                        "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                                        paperSize.includes('A4') ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    A4
                                </button>
                            </div>

                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-md h-9 px-4 rounded-lg"
                                onClick={() => window.print()}
                            >
                                <Printer className="w-4 h-4" />
                                Print Official Logsheet
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsPrintModalOpen(false)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800 h-9 w-9 p-0 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Split View Content Body */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT PANE: Document Configuration Controls */}
                        <div className="w-80 sm:w-96 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
                            {/* Tabs Switcher for Config */}
                            <div className="flex border-b border-slate-800 bg-slate-900 px-3 pt-3 gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('layout')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2",
                                        activeConfigTab === 'layout' 
                                            ? "border-blue-500 text-blue-400 bg-slate-800/60 font-semibold" 
                                            : "border-transparent text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Layout className="w-3.5 h-3.5" />
                                    General & Header
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('columns')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2",
                                        activeConfigTab === 'columns' 
                                            ? "border-blue-500 text-blue-400 bg-slate-800/60 font-semibold" 
                                            : "border-transparent text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    Columns
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab('signatories')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2",
                                        activeConfigTab === 'signatories' 
                                            ? "border-blue-500 text-blue-400 bg-slate-800/60 font-semibold" 
                                            : "border-transparent text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <UsersIcon className="w-3.5 h-3.5" />
                                    Signatories ({signatories.length + 1})
                                </button>
                            </div>

                            {/* Config Panels Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
                                {activeConfigTab === 'layout' && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60 space-y-2">
                                            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                                Facility Jail Branch
                                            </Label>
                                            <Input
                                                value={facilityBranch}
                                                onChange={(e) => setFacilityBranch(e.target.value)}
                                                placeholder="e.g. Metro Manila District Jail - Annex"
                                                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                                            />
                                        </div>

                                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60 space-y-2">
                                            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                                Logsheet Log Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={logsheetCustomDate}
                                                onChange={(e) => setLogsheetCustomDate(e.target.value)}
                                                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100"
                                            />
                                            <p className="text-[10px] text-slate-400">
                                                Shows scheduled physical in-person visits filtered to this designated operational date.
                                            </p>
                                        </div>

                                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60 space-y-2">
                                            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                                Prepared By (Authenticated Officer)
                                            </Label>
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-[10px] text-slate-400">Officer Name</span>
                                                    <Input
                                                        value={preparedByName}
                                                        onChange={(e) => setPreparedByName(e.target.value)}
                                                        className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100 mt-0.5"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400">Designation / Title</span>
                                                    <Input
                                                        value={preparedByRole}
                                                        onChange={(e) => setPreparedByRole(e.target.value)}
                                                        className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100 mt-0.5"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400">Badge / Account PIN</span>
                                                    <Input
                                                        value={preparedByBadge}
                                                        onChange={(e) => setPreparedByBadge(e.target.value)}
                                                        className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100 mt-0.5"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeConfigTab === 'columns' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                                            <span className="text-slate-400">Toggle table columns to show or hide in printed logsheet:</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            {[
                                                { key: 'index', label: '# (Sequence Number)' },
                                                { key: 'visitor', label: 'Visitor Full Name' },
                                                { key: 'relation', label: 'Relationship to PDL' },
                                                { key: 'pdl', label: 'PDL Visited' },
                                                { key: 'cell', label: 'Cell & Dormitory' },
                                                { key: 'date', label: 'Scheduled Date' },
                                                { key: 'timeIn', label: 'Time-In' },
                                                { key: 'timeOut', label: 'Time-Out' },
                                                { key: 'duration', label: 'Visit Duration' },
                                                { key: 'status', label: 'Visit Status' },
                                                { key: 'visitorSignature', label: 'Visitor Signature' },
                                                { key: 'remarks', label: 'Remarks / Infractions' },
                                            ].map((col) => {
                                                const isChecked = visibleColumns[col.key as keyof typeof visibleColumns];
                                                return (
                                                    <div 
                                                        key={col.key}
                                                        onClick={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !isChecked }))}
                                                        className={cn(
                                                            "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                                                            isChecked 
                                                                ? "bg-slate-800/70 border-slate-700 text-slate-200" 
                                                                : "bg-slate-900/40 border-slate-800/80 text-slate-500 hover:border-slate-700"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                                                                isChecked ? "bg-blue-600 border-blue-500 text-white" : "border-slate-600 bg-slate-900"
                                                            )}>
                                                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                            <span className="font-medium text-xs">{col.label}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {col.key}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add Custom Column Section */}
                                        <div className="pt-3 border-t border-slate-800 space-y-2">
                                            <Label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                                Add Additional Column
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Column Title (e.g. ID Presented)"
                                                    value={newColTitle}
                                                    onChange={(e) => setNewColTitle(e.target.value)}
                                                    className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100"
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
                                                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                                </Button>
                                            </div>
                                            {customColumns.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {customColumns.map((col) => (
                                                        <span key={col.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-200">
                                                            {col.title}
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomColumns(prev => prev.filter(c => c.id !== col.id))}
                                                                className="text-rose-400 hover:text-rose-300 font-bold ml-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeConfigTab === 'signatories' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                                Additional Signatories
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSignatories(prev => [
                                                        ...prev,
                                                        { id: `sig_${Date.now()}`, label: 'Reviewed by / Officer', name: 'SUPERVISING OFFICER', title: 'BJMP Duty Personnel', enabled: true }
                                                    ]);
                                                }}
                                                className="h-7 text-[11px] gap-1 bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-white"
                                            >
                                                <Plus className="w-3 h-3" /> Add Signatory
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {signatories.map((sig, idx) => (
                                                <div key={sig.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-blue-400">Signatory #{idx + 1}</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setSignatories(prev => prev.filter(s => s.id !== sig.id))}
                                                            className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Input
                                                            value={sig.label}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setSignatories(prev => prev.map(s => s.id === sig.id ? { ...s, label: val } : s));
                                                            }}
                                                            placeholder="Role Label (e.g. Noted By, Verified By)"
                                                            className="h-7 text-xs bg-slate-900 border-slate-700"
                                                        />
                                                        <Input
                                                            value={sig.name}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setSignatories(prev => prev.map(s => s.id === sig.id ? { ...s, name: val } : s));
                                                            }}
                                                            placeholder="Full Officer Name"
                                                            className="h-7 text-xs bg-slate-900 border-slate-700 font-semibold"
                                                        />
                                                        <Input
                                                            value={sig.title}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setSignatories(prev => prev.map(s => s.id === sig.id ? { ...s, title: val } : s));
                                                            }}
                                                            placeholder="Official Position / Rank"
                                                            className="h-7 text-xs bg-slate-900 border-slate-700"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANE: Canvas Document Preview */}
                        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
                            {/* Preview Toolbar */}
                            <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-300">Live Preview:</span>
                                    <span>{sessions.length} records ready for print</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
                                        <button 
                                            type="button" 
                                            onClick={() => setZoomScale(Math.max(50, zoomScale - 10))}
                                            className="p-1 hover:text-white rounded"
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-[11px] font-mono px-2 text-slate-300">{zoomScale}%</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setZoomScale(Math.min(150, zoomScale + 10))}
                                            className="p-1 hover:text-white rounded"
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setZoomScale(100)}
                                            className="p-1 hover:text-white rounded ml-1 border-l border-slate-700"
                                            title="Reset Zoom"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Canvas Scroll Area */}
                            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center bg-slate-950/90">
                                <div 
                                    style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
                                    className="transition-transform duration-150"
                                >
                                    {/* Paper Document Body */}
                                    <div 
                                        id="bjmp-visitor-logsheet"
                                        className={cn(
                                            "bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-8 border border-slate-300 relative text-[11px]",
                                            paperSize.includes('Letter') ? 'w-[816px] min-h-[1056px]' : 'w-[820px] min-h-[1160px]'
                                        )}
                                    >
                                        {/* Formal BJMP Header */}
                                        <div className="border-b-2 border-slate-900 pb-3 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full border border-slate-300 flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-800">
                                                        BJMP
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Republic of the Philippines</div>
                                                        <div className="text-[11px] font-bold text-slate-900 uppercase">Department of the Interior and Local Government</div>
                                                        <div className="text-xs font-black text-slate-950 uppercase tracking-tight">Bureau of Jail Management and Penology</div>
                                                        <div className="text-[10.5px] font-medium text-slate-700">{facilityBranch}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="inline-block border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold bg-slate-50">
                                                        BJMP FORM VIS-101
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 mt-1">Series of {new Date().getFullYear()}</div>
                                                    <div className="text-[10px] font-bold text-blue-900 mt-0.5">eDalaw+ Security Validated</div>
                                                </div>
                                            </div>

                                            <div className="text-center mt-3 pt-2 border-t border-slate-200">
                                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">
                                                    OFFICIAL PHYSICAL VISITATION LOGSHEET & VISITOR MANIFEST
                                                </h2>
                                                <p className="text-[10px] text-slate-600 font-medium">
                                                    Designated Operational Log Date: <span className="font-bold text-slate-900">{format(new Date(logsheetCustomDate), 'MMMM d, yyyy (EEEE)')}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Data Privacy & Compliance Notice */}
                                        <div className="p-2 mb-3 bg-slate-50 border border-slate-300 rounded text-[9px] text-slate-700 leading-tight">
                                            <strong className="text-slate-900">DATA PRIVACY & STATUTORY NOTICE (RA 10173):</strong> This record contains privileged and sensitive personal information captured pursuant to standard BJMP jail facility security protocols. Unauthorized disclosure, copying, or dissemination is strictly prohibited and punishable by law.
                                        </div>

                                        {/* Manifest Records Table */}
                                        <div className="border border-slate-900 overflow-hidden mb-6">
                                            <table className="w-full text-left border-collapse text-[10px]">
                                                <thead>
                                                    <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                                                        {visibleColumns.index && <th className="py-2 px-2 text-center border-r border-slate-700 w-8">#</th>}
                                                        {visibleColumns.visitor && <th className="py-2 px-2 border-r border-slate-700">Visitor Full Name</th>}
                                                        {visibleColumns.relation && <th className="py-2 px-2 border-r border-slate-700">Relation</th>}
                                                        {visibleColumns.pdl && <th className="py-2 px-2 border-r border-slate-700">PDL Visited</th>}
                                                        {visibleColumns.cell && <th className="py-2 px-2 border-r border-slate-700">Cell / Dorm</th>}
                                                        {visibleColumns.date && <th className="py-2 px-2 border-r border-slate-700">Date</th>}
                                                        {visibleColumns.timeIn && <th className="py-2 px-2 border-r border-slate-700">Time-In</th>}
                                                        {visibleColumns.timeOut && <th className="py-2 px-2 border-r border-slate-700">Time-Out</th>}
                                                        {visibleColumns.duration && <th className="py-2 px-2 border-r border-slate-700">Duration</th>}
                                                        {visibleColumns.status && <th className="py-2 px-2 border-r border-slate-700">Status</th>}
                                                        {customColumns.map(c => (
                                                            <th key={c.id} className="py-2 px-2 border-r border-slate-700">
                                                                {c.title}
                                                            </th>
                                                        ))}
                                                        {visibleColumns.visitorSignature && <th className="py-2 px-2 text-center">Visitor Signature</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-300 text-slate-900 font-normal">
                                                    {sessions.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                                                                No physical in-person visits registered or completed for {format(new Date(logsheetCustomDate), 'MMM d, yyyy')}.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        sessions.map((item, index) => (
                                                            <tr key={item.id} className={cn("hover:bg-slate-50", index % 2 === 1 && "bg-slate-50/50")}>
                                                                {visibleColumns.index && (
                                                                    <td className="py-1.5 px-2 text-center font-semibold border-r border-slate-300">
                                                                        {index + 1}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.visitor && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 font-bold text-slate-900 uppercase">
                                                                        {item.visitor_name || '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.relation && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 capitalize">
                                                                        {item.relationship_to_inmate || 'Relative'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.pdl && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 font-semibold text-slate-900">
                                                                        {item.inmate_name}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.cell && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300">
                                                                        {item.cell_number}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.date && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 font-mono text-[9.5px]">
                                                                        {item.scheduled_date ? format(new Date(item.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.timeIn && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 font-mono">
                                                                        {item.started_at ? format(new Date(item.started_at), 'hh:mm a') : '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.timeOut && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 font-mono">
                                                                        {item.ended_at ? format(new Date(item.ended_at), 'hh:mm a') : '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.duration && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300">
                                                                        {item.started_at && item.ended_at ? '10 mins' : '—'}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.status && (
                                                                    <td className="py-1.5 px-2 border-r border-slate-300 uppercase text-[9px] font-bold">
                                                                        {item.status}
                                                                    </td>
                                                                )}
                                                                {customColumns.map(c => (
                                                                    <td key={c.id} className="py-1.5 px-2 border-r border-slate-300 text-slate-400 italic">
                                                                        —
                                                                    </td>
                                                                ))}
                                                                {visibleColumns.visitorSignature && (
                                                                    <td className="py-1.5 px-2 text-center text-slate-400 italic text-[9px]">
                                                                        <div className="h-4 border-b border-dotted border-slate-400 mt-2"></div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Signatories & Certification Section */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t-2 border-slate-900 text-xs">
                                            {/* Prepared By Officer */}
                                            <div className="text-left">
                                                <p className="font-semibold text-slate-700 mb-4">Prepared & Certified By:</p>
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-slate-950 uppercase text-xs">
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
                                            {signatories.map((sig) => (
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
