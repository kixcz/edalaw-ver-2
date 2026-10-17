import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { 
    Heart, 
    Calendar as CalendarIcon, 
    CalendarDays, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Users, 
    Search, 
    Download, 
    RotateCcw, 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown, 
    Building2, 
    Plus, 
    FileText, 
    Video as VideoIcon, 
    BarChart2, 
    Info, 
    Eye, 
    Check, 
    X, 
    MapPin, 
    Radio,
    BookOpen
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export type Eburol = {
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
    cell_number?: string;
    dormitory_name?: string;
    duration?: string;
    inmate_tunnel_code?: string | null;
    inmate_tunnel_status?: 'active' | 'expired' | 'used' | null;
};

type Props = {
    eburols: Eburol[];
    stats: { 
        total_eburols: number; 
        pending_eburols: number; 
        approved_eburols: number; 
        rejected_eburols: number; 
        completed_eburols: number; 
        active_tunnels: number 
    };
    chartData: { 
        eburols_by_status: { status: string; count: number }[]; 
        eburols_by_period: { period: string; count: number }[] 
    };
};

export default function EburolMonitoring({ eburols = [], stats, chartData }: Props) {
    const [activeTab, setActiveTab] = useState('requests');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusSubFilter, setStatusSubFilter] = useState('all');
    const [dormFilter, setDormFilter] = useState('all');
    const [cellFilter, setCellFilter] = useState('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [selectedEburol, setSelectedEburol] = useState<Eburol | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

    // Filter logic
    const filteredEburols = useMemo(() => {
        return eburols.filter((item) => {
            // Status Subfilter (Pills)
            if (statusSubFilter !== 'all') {
                const s = item.status?.toLowerCase();
                if (statusSubFilter === 'pending' && s !== 'pending') return false;
                if (statusSubFilter === 'for_scheduling' && s !== 'for_scheduling' && s !== 'pending') return false;
                if (statusSubFilter === 'scheduled' && s !== 'scheduled' && s !== 'approved') return false;
                if (statusSubFilter === 'ongoing' && s !== 'active' && s !== 'ongoing') return false;
                if (statusSubFilter === 'completed' && s !== 'completed') return false;
                if (statusSubFilter === 'rejected' && s !== 'rejected') return false;
                if (statusSubFilter === 'cancelled' && s !== 'cancelled') return false;
            }

            // Dorm Filter
            if (dormFilter !== 'all') {
                const dormMatch = (item.dormitory_name || '').toLowerCase().includes(dormFilter.toLowerCase()) ||
                                  (item.cell_number || '').toLowerCase().includes(dormFilter.toLowerCase()) ||
                                  (item.wake_location || '').toLowerCase().includes(dormFilter.toLowerCase());
                if (!dormMatch) return false;
            }

            // Cell Filter
            if (cellFilter !== 'all') {
                const cellMatch = (item.cell_number || '').toLowerCase().includes(cellFilter.toLowerCase());
                if (!cellMatch) return false;
            }

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const vName = (item.visitor_name || '').toLowerCase();
                const pName = (item.inmate_name || '').toLowerCase();
                const dName = (item.deceased_name || '').toLowerCase();
                const ref = `eb-${item.id}`.toLowerCase();
                const code = (item.inmate_tunnel_code || '').toLowerCase();
                return vName.includes(q) || pName.includes(q) || dName.includes(q) || ref.includes(q) || code.includes(q);
            }

            return true;
        });
    }, [eburols, statusSubFilter, dormFilter, cellFilter, searchQuery]);

    // Unique dorms & cells for dropdown filters
    const availableDorms = useMemo(() => {
        const set = new Set<string>();
        eburols.forEach(e => {
            if (e.dormitory_name) set.add(e.dormitory_name);
            else if (e.wake_location) set.add(e.wake_location);
        });
        return Array.from(set);
    }, [eburols]);

    const availableCells = useMemo(() => {
        const set = new Set<string>();
        eburols.forEach(e => {
            if (e.cell_number) set.add(e.cell_number);
        });
        return Array.from(set);
    }, [eburols]);

    // Status counts for pills
    const statusCounts = useMemo(() => {
        return {
            all: eburols.length,
            pending: eburols.filter(e => e.status === 'pending').length,
            for_scheduling: eburols.filter(e => e.status === 'for_scheduling').length,
            scheduled: eburols.filter(e => e.status === 'scheduled' || e.status === 'approved').length,
            ongoing: eburols.filter(e => e.status === 'active' || e.status === 'ongoing').length,
            completed: eburols.filter(e => e.status === 'completed').length,
            rejected: eburols.filter(e => e.status === 'rejected').length,
            cancelled: eburols.filter(e => e.status === 'cancelled').length,
        };
    }, [eburols]);

    // Upcoming sessions (approved / scheduled)
    const upcomingSessions = useMemo(() => {
        return eburols.filter(e => e.status === 'approved' || e.status === 'scheduled').slice(0, 5);
    }, [eburols]);

    // Recent requests
    const recentRequests = useMemo(() => {
        return eburols.slice(0, 5);
    }, [eburols]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusSubFilter('all');
        setDormFilter('all');
        setCellFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    return (
        <AppLayout>
            <Head title="e-Burol Monitoring" />
            <div className="min-h-screen bg-slate-50/60 pb-12">
                {/* Modern Top Bar / Header */}
                <div className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-30 shadow-xs">
                    <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                                <Heart className="w-5 h-5 fill-white text-white" />
                            </div>
                            <div>
                                {/* Breadcrumbs */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                                    <span className="font-medium text-slate-600">eDalaw+</span>
                                    <span>&rsaquo;</span>
                                    <span className="text-slate-900 font-semibold">e-Burol Monitoring</span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">e-Burol Monitoring</h1>
                                <p className="text-xs text-slate-500 mt-1">Manage and oversee virtual wake attendance sessions for PDLs in your assigned areas.</p>
                            </div>
                        </div>

                        {/* Top Right Badges & + New e-Burol Request Button */}
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
                                    <Users className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="leading-tight">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assigned Scope</div>
                                    <div className="font-bold text-slate-900 text-xs">
                                        <span className="text-orange-600 font-semibold">1 Dormitory</span> • <span className="text-orange-600 font-semibold">1 Building</span> • <span className="text-orange-600 font-semibold">1 Cell</span>
                                    </div>
                                </div>
                            </div>

                            {/* + New e-Burol Request Button */}
                            <Button
                                onClick={() => router.visit('/jail-officer/eburols')}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5 transition-all flex items-center justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New e-Burol Request</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="w-full px-6 py-6 space-y-6">
                    {/* KPI Stat Cards (Full 4-Column Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Total E-Burols */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <Heart className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                    {stats.total_eburols}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    TOTAL E-BUROLS
                                </div>
                                <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                    <span>&uarr;</span> 0% this month
                                </div>
                            </div>
                        </div>

                        {/* 2. Pending Review */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <Clock className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                    {stats.pending_eburols}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    PENDING REVIEW
                                </div>
                                <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1 mt-0.5">
                                    <span>&bull;</span> {stats.pending_eburols} requests
                                </div>
                            </div>
                        </div>

                        {/* 3. Approved / Scheduled */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                    {stats.approved_eburols}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    APPROVED / SCHEDULED
                                </div>
                                <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                    <span>&uarr;</span> 0 this month
                                </div>
                            </div>
                        </div>

                        {/* 4. Rejected */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5 hover:border-slate-300 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                                <div className="w-6 h-6 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-500 font-bold text-sm">
                                    &times;
                                </div>
                            </div>
                            <div>
                                <div className="text-3xl font-extrabold text-slate-900 leading-tight">
                                    {stats.rejected_eburols}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    REJECTED
                                </div>
                                <div className="text-[11px] font-medium text-rose-600 flex items-center gap-1 mt-0.5">
                                    <span>&bull;</span> 0 this month
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Layout: Left 8-9 cols for Tabs & Main view, Right 3-4 cols for side widgets */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        {/* LEFT MAIN COLUMN: Tabs, Filters, Table, Empty State */}
                        <div className="xl:col-span-9 space-y-4">
                            {/* Tabs Header */}
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                                <div className="border-b border-slate-200 pb-1">
                                    <TabsList className="bg-transparent border-0 p-0 h-auto gap-8">
                                        <TabsTrigger 
                                            value="requests" 
                                            className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-1 py-2 text-sm font-bold text-slate-600 gap-2 transition-all bg-transparent"
                                        >
                                            <Heart className="w-4 h-4 text-orange-600" />
                                            Requests & Sessions
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="live" 
                                            className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-1 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                        >
                                            <VideoIcon className="w-4 h-4" />
                                            Live Monitoring
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="calendar" 
                                            className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-1 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                        >
                                            <CalendarDays className="w-4 h-4" />
                                            Calendar & Schedule
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="analytics" 
                                            className="data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none rounded-none px-1 py-2 text-sm font-semibold text-slate-600 gap-2 transition-all bg-transparent"
                                        >
                                            <BarChart2 className="w-4 h-4" />
                                            Analytics
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* TAB 1: REQUESTS & SESSIONS */}
                                <TabsContent value="requests" className="space-y-4 m-0">
                                    {/* Filter Bar */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                                        {/* Search Input and Date Range row */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            {/* Search input */}
                                            <div className="relative flex-1">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <Input
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search by visitor name, PDL name, reference no., or tunnel code..."
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

                                            {/* Date Range popover button */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="h-10 text-xs bg-white border-slate-200 rounded-xl gap-2 text-slate-700 min-w-[210px] justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                                                            <div className="text-left">
                                                                <div className="text-[9px] text-slate-400 font-medium uppercase leading-tight">Date Range</div>
                                                                <div className="font-medium text-slate-800 text-[11px]">
                                                                    {startDateFilter ? `${startDateFilter} - ${endDateFilter || 'Oct 31, 2026'}` : 'Oct 01, 2026 - Oct 31, 2026'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-4 space-y-3" align="end">
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
                                        </div>

                                        {/* Dropdowns, Clear Filters & Export Row */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                {/* All Statuses */}
                                                <Select value={statusSubFilter} onValueChange={(val: any) => setStatusSubFilter(val)}>
                                                    <SelectTrigger className="h-9 w-36 text-xs bg-white border-slate-200 rounded-xl">
                                                        <SelectValue placeholder="All Statuses" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Statuses</SelectItem>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="for_scheduling">For Scheduling</SelectItem>
                                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                                        <SelectItem value="ongoing">Ongoing</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                        <SelectItem value="rejected">Rejected</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {/* All Dormitories */}
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

                                                {/* All Cells */}
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

                                            {/* Action Buttons: Clear Filters & Export */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearFilters}
                                                    className="h-9 text-xs text-slate-500 hover:text-slate-800 gap-1.5"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Clear Filters
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit('/jail-officer/eburols')}
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
                                        {/* All Requests */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('all')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'all'
                                                    ? "bg-white text-orange-600 border-orange-500 shadow-xs"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                            )}
                                        >
                                            <span>All Requests</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold">
                                                {statusCounts.all}
                                            </span>
                                        </button>

                                        {/* Pending */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('pending')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'pending'
                                                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                            )}
                                        >
                                            <span>Pending</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                                                {statusCounts.pending}
                                            </span>
                                        </button>

                                        {/* For Scheduling */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('for_scheduling')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'for_scheduling'
                                                    ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                            )}
                                        >
                                            <span>For Scheduling</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                                                {statusCounts.for_scheduling}
                                            </span>
                                        </button>

                                        {/* Scheduled */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('scheduled')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'scheduled'
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                            )}
                                        >
                                            <span>Scheduled</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                                {statusCounts.scheduled}
                                            </span>
                                        </button>

                                        {/* Ongoing */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('ongoing')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'ongoing'
                                                    ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                                                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                                            )}
                                        >
                                            <span>Ongoing</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
                                                {statusCounts.ongoing}
                                            </span>
                                        </button>

                                        {/* Completed */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('completed')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'completed'
                                                    ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                            )}
                                        >
                                            <span>Completed</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                                                {statusCounts.completed}
                                            </span>
                                        </button>

                                        {/* Rejected */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('rejected')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'rejected'
                                                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                                                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                                            )}
                                        >
                                            <span>Rejected</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                                                {statusCounts.rejected}
                                            </span>
                                        </button>

                                        {/* Cancelled */}
                                        <button
                                            type="button"
                                            onClick={() => setStatusSubFilter('cancelled')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                statusSubFilter === 'cancelled'
                                                    ? "bg-slate-600 text-white border-slate-700 shadow-xs"
                                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                                            )}
                                        >
                                            <span>Cancelled</span>
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                                                {statusCounts.cancelled}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Main Table / Empty State Card */}
                                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px]">
                                                        <th className="py-3 px-3 text-center w-8">
                                                            <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                                                        </th>
                                                        <th className="py-3 px-2 text-center w-8">#</th>
                                                        <th className="py-3 px-3">Visitor</th>
                                                        <th className="py-3 px-3">PDL</th>
                                                        <th className="py-3 px-3">Requested Schedule</th>
                                                        <th className="py-3 px-3">Duration</th>
                                                        <th className="py-3 px-3">Status</th>
                                                        <th className="py-3 px-3 text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {filteredEburols.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="py-16 text-center">
                                                                <div className="max-w-md mx-auto space-y-3">
                                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                                                        <CalendarIcon className="w-6 h-6 text-slate-500" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-900 text-sm">No e-Burol requests found</h4>
                                                                        <p className="text-xs text-slate-500 mt-1">There are no e-burol schedules assigned to you yet.</p>
                                                                    </div>
                                                                    <Button
                                                                        onClick={() => router.visit('/jail-officer/eburols')}
                                                                        className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                        <span>New e-Burol Request</span>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredEburols.map((item, index) => (
                                                            <tr 
                                                                key={item.id}
                                                                onClick={() => {
                                                                    setSelectedEburol(item);
                                                                    setIsDetailsOpen(true);
                                                                }}
                                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                                            >
                                                                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                                                                </td>
                                                                <td className="py-3 px-2 text-center font-mono text-slate-400 text-[11px]">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="font-semibold text-slate-900">{item.visitor_name}</div>
                                                                    <div className="text-[10px] text-slate-500">{item.visitor_email}</div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="font-semibold text-slate-900">{item.inmate_name}</div>
                                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3 text-orange-500" />
                                                                        <span>{item.cell_number || 'Main Cell'} • {item.dormitory_name || 'Assigned Dorm'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <div className="font-medium text-slate-900">
                                                                        {item.wake_start_date} – {item.wake_end_date}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500">Deceased: {item.deceased_name}</div>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <span className="font-medium text-slate-700">{item.duration || '30 mins'}</span>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <span className={cn(
                                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold inline-block",
                                                                        item.status === 'completed' && "bg-blue-50 text-blue-700 border border-blue-200",
                                                                        (item.status === 'approved' || item.status === 'scheduled') && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                                        item.status === 'pending' && "bg-amber-50 text-amber-700 border border-amber-200",
                                                                        item.status === 'rejected' && "bg-rose-50 text-rose-700 border border-rose-200"
                                                                    )}>
                                                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedEburol(item);
                                                                            setIsDetailsOpen(true);
                                                                        }}
                                                                        className="h-8 px-3 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs gap-1.5"
                                                                    >
                                                                        <Info className="w-3.5 h-3.5 text-orange-500" />
                                                                        Details
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Table Pagination / Footer */}
                                        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                            <div>
                                                Showing {filteredEburols.length} of {filteredEburols.length} results
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
                                </TabsContent>

                                {/* TAB 2: LIVE MONITORING */}
                                <TabsContent value="live" className="space-y-4 m-0">
                                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto mb-3">
                                            <Radio className="w-7 h-7 animate-pulse text-orange-600" />
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-base">Live E-Burol Wake Feed</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                            Supervised real-time video stream for active virtual wake attendance sessions.
                                        </p>
                                        <div className="mt-6">
                                            <Button
                                                onClick={() => router.visit('/jail-officer/assigned-sessions')}
                                                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs"
                                            >
                                                Go to Virtual Session Monitor
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* TAB 3: CALENDAR & SCHEDULE */}
                                <TabsContent value="calendar" className="space-y-4 m-0">
                                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-base">Wake Schedule Timetable</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Assigned wake attendance blocks across calendar days.</p>
                                            </div>
                                        </div>
                                        <div className="py-12 text-center text-slate-400 text-xs">
                                            <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                            No conflicting wake time slots scheduled for this period.
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* TAB 4: ANALYTICS */}
                                <TabsContent value="analytics" className="space-y-4 m-0">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                                            <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                                <h4 className="font-bold text-slate-900 text-sm">E-Burols by Status</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Distribution of e-burol statuses</p>
                                            </div>
                                            <CardContent className="p-4 pt-5">
                                                <ResponsiveContainer width="100%" height={260}>
                                                    <PieChart>
                                                        <Pie data={chartData.eburols_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}>
                                                            {chartData.eburols_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                        <Card className="border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
                                            <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                                <h4 className="font-bold text-slate-900 text-sm">E-Burols by Period</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Timeline distribution</p>
                                            </div>
                                            <CardContent className="p-4 pt-5">
                                                <ResponsiveContainer width="100%" height={260}>
                                                    <BarChart data={chartData.eburols_by_period} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                        <RechartsTooltip />
                                                        <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} name="E-Burols" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* RIGHT SIDEBAR COLUMN: 3 Cards */}
                        <div className="xl:col-span-3 space-y-4">
                            {/* Card 1: Upcoming E-Burol Sessions */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-orange-600" />
                                        <h3 className="font-bold text-slate-900 text-xs tracking-tight">Upcoming E-Burol Sessions</h3>
                                    </div>
                                    <button 
                                        onClick={() => setStatusSubFilter('scheduled')}
                                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                                    >
                                        View All
                                    </button>
                                </div>

                                {upcomingSessions.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mx-auto">
                                            <CalendarIcon className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="font-bold text-slate-800 text-xs">No upcoming e-burol sessions</div>
                                        <p className="text-[11px] text-slate-400">Approved e-burol schedules will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingSessions.map((session) => (
                                            <div key={session.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                                                <div className="font-semibold text-slate-900 text-xs">{session.inmate_name}</div>
                                                <div className="text-[11px] text-slate-500">{session.wake_start_date} • Deceased: {session.deceased_name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Card 2: Recent Requests */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-orange-600" />
                                        <h3 className="font-bold text-slate-900 text-xs tracking-tight">Recent Requests</h3>
                                    </div>
                                    <button 
                                        onClick={() => setStatusSubFilter('all')}
                                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                                    >
                                        View All
                                    </button>
                                </div>

                                {recentRequests.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mx-auto">
                                            <FileText className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="font-bold text-slate-800 text-xs">No recent requests</div>
                                        <p className="text-[11px] text-slate-400">New e-burol requests will be listed here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentRequests.map((req) => (
                                            <div key={req.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-slate-900 text-xs">{req.visitor_name}</span>
                                                    <span className="text-[10px] font-bold text-amber-600">{req.status}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">For PDL: {req.inmate_name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Card 3: About e-Burol Information Banner */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-[10px]">
                                        i
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-xs">About e-Burol</h3>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    e-Burol allows a PDL to attend the wake of a deceased family member through a supervised virtual session. Session duration is set by the Jail Officer assigned to the PDL's cell, subject to facility policy.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsGuidelinesOpen(true)}
                                    className="w-full h-9 text-xs font-semibold text-orange-700 bg-orange-50/50 hover:bg-orange-100/70 border border-orange-200/80 rounded-xl gap-2 mt-1"
                                >
                                    <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                                    <span>View Guidelines</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guidelines Dialog Modal */}
                <Dialog open={isGuidelinesOpen} onOpenChange={setIsGuidelinesOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
                                <Heart className="w-5 h-5 text-orange-600 fill-orange-600" />
                                BJMP e-Burol Guidelines & Protocol
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Policy rules governing virtual wake visitation attendance.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-xs text-slate-600 py-2">
                            <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/60 space-y-1">
                                <div className="font-bold text-orange-950">Eligibility & Scope:</div>
                                <p>PDLs in good behavioral standing may apply to attend the virtual wake of immediate family members (spouse, child, parent, sibling).</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                <div className="font-bold text-slate-900">Session Supervision:</div>
                                <p>All sessions must be conducted under the direct supervision of an assigned Jail Officer and recorded according to security protocol.</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                <div className="font-bold text-slate-900">Duration Limits:</div>
                                <p>Standard session limit is set to 30 minutes, extendable up to 1 hour upon special discretion by the Jail Warden.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                onClick={() => setIsGuidelinesOpen(false)}
                                className="bg-orange-600 hover:bg-orange-500 text-white text-xs h-9 rounded-xl w-full"
                            >
                                Got it
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Details Dialog Modal */}
                {selectedEburol && (
                    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
                                    <Heart className="w-5 h-5 text-orange-600 fill-orange-600" />
                                    e-Burol Request Details
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    Reference ID: #EB-{selectedEburol.id}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-xs text-slate-700 py-2">
                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                    <div>
                                        <div className="text-slate-400 text-[10px] uppercase font-bold">Visitor</div>
                                        <div className="font-semibold text-slate-900 mt-0.5">{selectedEburol.visitor_name}</div>
                                        <div className="text-[11px] text-slate-500">{selectedEburol.visitor_email}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-[10px] uppercase font-bold">PDL</div>
                                        <div className="font-semibold text-slate-900 mt-0.5">{selectedEburol.inmate_name}</div>
                                        <div className="text-[11px] text-slate-500">{selectedEburol.cell_number || 'Cell 1'}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                                        <span className="text-slate-500">Deceased Family Member</span>
                                        <span className="font-bold text-slate-900">{selectedEburol.deceased_name}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                                        <span className="text-slate-500">Wake Schedule Period</span>
                                        <span className="font-semibold text-slate-800">{selectedEburol.wake_start_date} – {selectedEburol.wake_end_date}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                                        <span className="text-slate-500">Wake Location</span>
                                        <span className="font-medium text-slate-800">{selectedEburol.wake_location}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-500">Application Status</span>
                                        <span className="font-bold text-orange-600 uppercase">{selectedEburol.status}</span>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    variant="outline"
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="text-xs h-9 rounded-xl"
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </AppLayout>
    );
}
