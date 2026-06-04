import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Clock, Eye, MoreVertical, Phone, PhoneIncoming, PhoneOutgoing, Video } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type CallLog = {
    id: number;
    phone_number: string | null;
    call_type: 'incoming' | 'outgoing' | 'video';
    call_date: string;
    duration: number | null;
    notes: string | null;
    status: string;
    created_at: string;
    visitor_name?: string | null;
    inmate_name?: string | null;
    scheduled_end?: string | null;
    visitor_joined_at?: string | null;
    inmate_joined_at?: string | null;
    end_reason?: string | null;
};

type Props = {
    callLogs: CallLog[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Call Logs',
        href: '/visitor/call-logs',
    },
];

export default function CallLogs({ callLogs }: Props) {
    const [selectedCallLog, setSelectedCallLog] = useState<CallLog | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const formatDuration = (seconds: number | null): string => {
        if (!seconds) {
            return 'N/A';
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallTypeIcon = (type: string) => {
        if (type === 'video') {
            return <Video className="h-4 w-4 text-purple-600" />;
        }
        return type === 'incoming' ? (
            <PhoneIncoming className="h-4 w-4 text-green-600" />
        ) : (
            <PhoneOutgoing className="h-4 w-4 text-blue-600" />
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        ✓ Completed
                    </Badge>
                );
            case 'active':
                return (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 animate-pulse">
                        ● Active
                    </Badge>
                );
            case 'scheduled':
                return (
                    <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600">
                        ◷ Scheduled
                    </Badge>
                );
            case 'missed':
                return <Badge variant="destructive">✕ Missed</Badge>;
            case 'terminated':
                return (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                        ⚠ Terminated
                    </Badge>
                );
            case 'failed':
            case 'rejected':
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                        {status === 'rejected' ? 'Rejected' : 'Failed'}
                    </Badge>
                );
            default:
                return <Badge variant="secondary" className="capitalize">{status}</Badge>;
        }
    };

    const handleViewDetails = (callLog: CallLog) => {
        setSelectedCallLog(callLog);
        setIsViewModalOpen(true);
    };

    const columns: ColumnDef<CallLog>[] = useMemo(
        () => [
            {
                accessorKey: 'notes',
                header: 'Call Details',
                cell: ({ row }) => {
                    const callLog = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <Video className="h-5 w-5 text-purple-600" />
                            <div>
                                <div className="font-medium">{callLog.notes || 'Video visit'}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Visitor: {callLog.visitor_name || 'N/A'} • Inmate: {callLog.inmate_name || 'N/A'}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'call_date',
                header: 'Scheduled Date & Time',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(row.original.call_date).toLocaleString()}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'duration',
                header: 'Duration',
                cell: ({ row }) => (
                    <div className="text-sm">{formatDuration(row.original.duration)}</div>
                ),
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
                    const callLog = row.original;
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
                                <DropdownMenuItem onClick={() => handleViewDetails(callLog)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call Logs" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Call Logs</h1>
                        <p className="text-muted-foreground">View your call history and records</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Call History</CardTitle>
                        <CardDescription>All your incoming and outgoing calls</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {callLogs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No call logs found.</p>
                                <p className="text-sm mt-2">Your call history will appear here.</p>
                            </div>
                        ) : (
                            <DataTable columns={columns} data={callLogs} />
                        )}
                    </CardContent>
                </Card>

                {/* View Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Call Log Details</DialogTitle>
                            <DialogDescription>
                                Complete information about this call
                            </DialogDescription>
                        </DialogHeader>
                        {selectedCallLog && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            {selectedCallLog.call_type === 'video' ? 'Call' : 'Phone Number'}
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getCallTypeIcon(selectedCallLog.call_type)}
                                            <span className="font-medium">
                                                {selectedCallLog.call_type === 'video'
                                                    ? (selectedCallLog.notes ?? 'Video visit')
                                                    : (selectedCallLog.phone_number ?? '—')}
                                            </span>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {selectedCallLog.call_type}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Status
                                        </label>
                                        <div className="mt-1">{getStatusBadge(selectedCallLog.status)}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Date & Time
                                        </label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{new Date(selectedCallLog.call_date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Duration
                                        </label>
                                        <div className="mt-1">{formatDuration(selectedCallLog.duration)}</div>
                                    </div>
                                </div>
                                {selectedCallLog.notes && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Notes
                                        </label>
                                        <div className="mt-1 p-3 bg-muted rounded-md">
                                            <p className="text-sm">{selectedCallLog.notes}</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Created At
                                    </label>
                                    <div className="mt-1 text-sm">
                                        {new Date(selectedCallLog.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
