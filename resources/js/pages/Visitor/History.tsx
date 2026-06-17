import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Filter, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'History',
        href: '#',
    },
];

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
    stats: {
        total: number;
        by_module: Record<string, number>;
        by_action: Record<string, number>;
    };
};

function getActionBadge(action: string) {
    const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        visit_submitted: 'default',
        visit_cancelled: 'destructive',
        visit_rescheduled: 'outline',
        eburol_submitted: 'default',
        eburol_updated: 'secondary',
        eburol_rescheduled: 'outline',
        eburol_deleted: 'destructive',
        suggestion_submitted: 'default',
        appeal_submitted: 'default',
    };

    const actionLabels: Record<string, string> = {
        visit_submitted: 'Visit Submitted',
        visit_cancelled: 'Visit Cancelled',
        visit_rescheduled: 'Visit Rescheduled',
        eburol_submitted: 'E-Burol Submitted',
        eburol_updated: 'E-Burol Updated',
        eburol_rescheduled: 'E-Burol Rescheduled',
        eburol_deleted: 'E-Burol Deleted',
        suggestion_submitted: 'Feedback Submitted',
        appeal_submitted: 'Appeal Submitted',
    };

    return (
        <Badge variant={actionColors[action] || 'secondary'}>
            {actionLabels[action] || action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Badge>
    );
}

function getModuleBadge(module: string) {
    const moduleColors: Record<string, 'default' | 'secondary' | 'outline'> = {
        'Schedule Management': 'default',
        'E-Burol Management': 'secondary',
        'Appeal Management': 'outline',
        'Feedback & Suggestions': 'outline',
    };

    return (
        <Badge variant={moduleColors[module] || 'secondary'}>
            {module}
        </Badge>
    );
}

export default function History({ audit_logs, stats }: Props) {
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
                        <div className="text-xs text-muted-foreground">{row.original.created_at_human}</div>
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
                            <div className="text-xs text-muted-foreground mt-1">
                                {row.original.metadata.inmate_name && (
                                    <div>PDL: {String(row.original.metadata.inmate_name)}</div>
                                )}
                                {row.original.metadata.deceased_name && (
                                    <div>Deceased: {String(row.original.metadata.deceased_name)}</div>
                                )}
                                {row.original.metadata.visit_type && (
                                    <div>Type: {String(row.original.metadata.visit_type)}</div>
                                )}
                                {row.original.metadata.old_date && row.original.metadata.new_date && (
                                    <div>
                                        Rescheduled: {String(row.original.metadata.old_date)} {String(row.original.metadata.old_time || '')} → {String(row.original.metadata.new_date)} {String(row.original.metadata.new_time || '')}
                                    </div>
                                )}
                                {row.original.metadata.subject && (
                                    <div>Subject: {String(row.original.metadata.subject)}</div>
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
                        <div className="text-xs text-muted-foreground">ID: {row.original.auditable_id}</div>
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transaction History" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Transaction History</h1>
                        <p className="text-muted-foreground">View all your transaction history and activities</p>
                    </div>
                </div>

                {/* Privacy Notice */}
                <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 24px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#6B7280', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Data Privacy Notice
                        </div>
                        <div style={{ fontSize: '9px', lineHeight: '1.5', color: '#4B5563' }}>
                            The records displayed in this module are provided to promote transparency and allow you to review your visitation activities, requests, consents, notifications, and interactions within the eDalaw system. These records are visible only to you and authorized personnel in accordance with Republic Act No. 10173 (Data Privacy Act of 2012) and applicable privacy policies.
                            <br />
                            <span style={{ fontStyle: 'italic' }}>
                                (Ang mga rekord nga gipakita niini nga module gitanyag aron sa pagpalig-on sa transparency ug tugutan ka nga masusi ang imong mga kalabutan sa pagbisita, mga hangyo, mga pagtugot, mga pahibalo, ug mga interaksyon sa sulod sa eDalaw system. Kini nga mga rekord makita lamang nimo ug sa mga awtorisadong personel sumala sa Republic Act No. 10173 (Data Privacy Act of 2012) ug mga nahisgutan nga privacy policies.)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">All logged transactions</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Modules</CardTitle>
                            <Filter className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{modules.length}</div>
                            <p className="text-xs text-muted-foreground">Different modules accessed</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Action Types</CardTitle>
                            <Filter className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{actions.length}</div>
                            <p className="text-xs text-muted-foreground">Different action types</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>
                                    Complete history of all your transactions and activities
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search history..."
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
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={filteredLogs} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

