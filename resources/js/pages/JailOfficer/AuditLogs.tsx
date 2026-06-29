import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Filter, Search, List, BarChart2, ClipboardList, Layers, Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

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

type AuditLog = {
    id: number;
    action: string;
    module: string;
    description: string;
    auditable_type: string;
    auditable_id: number;
    metadata: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    created_at_human: string;
};

type Props = {
    audit_logs: AuditLog[];
    stats: { total: number; by_module: Record<string, number>; by_action: Record<string, number> };
    chartData: { logs_by_module: { module: string; count: number }[]; logs_by_action: { action: string; count: number }[] };
};

function getActionBadge(action: string) {
    const actionColors: Record<string, string> = {
        eburol_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        eburol_rejected: 'bg-red-50 text-red-700 border-red-200',
        eburol_status_updated: 'bg-blue-50 text-blue-700 border-blue-200',
        visit_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        visit_rejected: 'bg-red-50 text-red-700 border-red-200',
        visit_status_updated: 'bg-blue-50 text-blue-700 border-blue-200',
        visit_rescheduled: 'bg-amber-50 text-amber-700 border-amber-200',
        appeal_reviewed: 'bg-purple-50 text-purple-700 border-purple-200',
    };

    const actionLabels: Record<string, string> = {
        eburol_approved: 'E-Burol Approved',
        eburol_rejected: 'E-Burol Rejected',
        eburol_status_updated: 'E-Burol Status Updated',
        visit_approved: 'Visit Approved',
        visit_rejected: 'Visit Rejected',
        visit_status_updated: 'Visit Status Updated',
        visit_rescheduled: 'Visit Rescheduled',
        appeal_reviewed: 'Appeal Reviewed',
    };

    const className = actionColors[action] || 'bg-slate-100 text-slate-600 border-slate-200';
    const label = actionLabels[action] || action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>{label}</span>;
}

function getModuleBadge(module: string) {
    const moduleColors: Record<string, string> = {
        'E-Burol Management': 'bg-cyan-50 text-cyan-700 border-cyan-200',
        'Visit Schedule Management': 'bg-blue-50 text-blue-700 border-blue-200',
        'Appeal Processing': 'bg-purple-50 text-purple-700 border-purple-200',
    };

    const className = moduleColors[module] || 'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>{module}</span>;
}

export default function AuditLogs({ audit_logs, stats, chartData }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [moduleFilter, setModuleFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');

    const columns: ColumnDef<AuditLog>[] = useMemo(
        () => [
            {
                accessorKey: 'created_at',
                header: 'Date & Time',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.created_at}</div>
                        <div className="text-xs text-slate-500">{row.original.created_at_human}</div>
                    </div>
                ),
            },
            {
                accessorKey: 'module',
                header: 'Module',
                cell: ({ row }) => getModuleBadge(row.original.module),
            },
            {
                accessorKey: 'action',
                header: 'Action',
                cell: ({ row }) => getActionBadge(row.original.action),
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <div className="max-w-md">
                        <div className="font-medium">{row.original.description}</div>
                        {row.original.metadata && Object.keys(row.original.metadata).length > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                                {row.original.metadata.rejection_reason && (
                                    <div>Reason: {String(row.original.metadata.rejection_reason).substring(0, 100)}</div>
                                )}
                                {row.original.metadata.old_status && row.original.metadata.new_status && (
                                    <div>
                                        Status: {String(row.original.metadata.old_status)} → {String(row.original.metadata.new_status)}
                                    </div>
                                )}
                                {row.original.metadata.old_date && row.original.metadata.new_date && (
                                    <div>
                                        Rescheduled: {String(row.original.metadata.old_date)} {String(row.original.metadata.old_time)} → {String(row.original.metadata.new_date)} {String(row.original.metadata.new_time)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'auditable_type',
                header: 'Related Item',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.auditable_type}</div>
                        <div className="text-xs text-slate-500">ID: {row.original.auditable_id}</div>
                    </div>
                ),
            },
            {
                accessorKey: 'ip_address',
                header: 'IP Address',
                cell: ({ row }) => <div className="text-sm">{row.original.ip_address || 'N/A'}</div>,
            },
        ],
        []
    );

    const filteredLogs = useMemo(() => {
        return audit_logs.filter((log) => {
            const matchesSearch =
                searchQuery === '' ||
                log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
            const matchesAction = actionFilter === 'all' || log.action === actionFilter;

            return matchesSearch && matchesModule && matchesAction;
        });
    }, [audit_logs, searchQuery, moduleFilter, actionFilter]);

    const modules = useMemo(() => {
        return Object.keys(stats.by_module);
    }, [stats.by_module]);

    const actions = useMemo(() => {
        return Object.keys(stats.by_action);
    }, [stats.by_action]);

    return (
        <AppLayout>
            <Head title="Audit Logs" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-700 rounded-xl"><ClipboardList className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Audit Logs</h1>
                                <p className="text-xs text-slate-500 mt-0.5">View all your transaction history and audit logs</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard icon={<FileText className="w-5 h-5" />} value={stats.total} label="Total Actions" accent="bg-slate-700" iconBg="bg-slate-100" iconColor="text-slate-700" />
                        <StatCard icon={<Layers className="w-5 h-5" />} value={modules.length} label="Modules" accent="bg-cyan-600" iconBg="bg-cyan-50" iconColor="text-cyan-600" />
                        <StatCard icon={<Activity className="w-5 h-5" />} value={actions.length} label="Action Types" accent="bg-indigo-600" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Logs
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                placeholder="Search logs..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <Select value={moduleFilter} onValueChange={setModuleFilter}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by Module" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Modules</SelectItem>
                                                {modules.map((module) => (
                                                    <SelectItem key={module} value={module}>
                                                        {module} ({stats.by_module[module]})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={actionFilter} onValueChange={setActionFilter}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by Action" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Actions</SelectItem>
                                                {actions.map((action) => (
                                                    <SelectItem key={action} value={action}>
                                                        {action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} ({stats.by_action[action]})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Audit Log History</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{filteredLogs.length} of {stats.total} logs</p>
                                </div>
                                <div className="p-6">
                                    <DataTable columns={columns} data={filteredLogs} />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Logs by Module</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution across modules</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.logs_by_module} dataKey="count" nameKey="module" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.logs_by_module.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Logs by Action</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Top action types</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.logs_by_action} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="action" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} name="Logs" />
                                            </BarChart>
                                        </ResponsiveContainer>
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
