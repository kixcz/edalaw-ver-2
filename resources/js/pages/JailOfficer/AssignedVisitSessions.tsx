import { Head, useForm } from '@inertiajs/react';
import { Camera, CheckCircle, Clock, FileText, MoreVertical, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { BreadcrumbItem } from '@/types';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assigned Visit Sessions', href: '/jail-officer/assigned-visit-sessions' },
];

type Visit = {
    id: number;
    visitor_name: string;
    visitor_email: string;
    inmate_name: string;
    inmate_id: number | null;
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
};

type Props = {
    visits: Visit[];
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
};

function getStatusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
        approved: { label: 'Approved', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
        rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
        completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    };
    const config = map[status] ?? { label: status, className: '' };
    return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
}

function getVisitTypeBadge(type: string) {
    const isVirtual = type === 'virtual';
    return (
        <Badge variant="outline" className={isVirtual ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}>
            {isVirtual ? (
                <>
                    <Camera className="mr-1 h-3 w-3" />
                    Virtual
                </>
            ) : (
                <>
                    <FileText className="mr-1 h-3 w-3" />
                    Physical
                </>
            )}
        </Badge>
    );
}

export default function AssignedVisitSessions({ visits, pagination, filters: initialFilters }: Props) {
    useToast();
    const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? 'all');
    const [typeFilter, setTypeFilter] = useState(initialFilters?.visit_type ?? 'all');
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

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
                                        className="text-green-600 focus:text-green-600"
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
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                </>
                            )}
                            
                            {isApproved && visit.has_session && (
                                <DropdownMenuItem onClick={() => window.open(`/jail-officer/assigned-sessions/${visit.id}/join`, '_blank')}>
                                    <Camera className="mr-2 h-4 w-4" />
                                    Join as Observer
                                </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem onClick={() => setSelectedVisit(visit)}>
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
            alert(error?.response?.data?.errors?.approve?.[0] || 'Failed to approve visit');
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
        
        return result;
    }, [visits, statusFilter, typeFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assigned Visit Sessions" />
            <div className="flex flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Assigned Visit Sessions</h1>
                    <p className="text-muted-foreground">Review and manage virtual visit schedules for PDLs in your assigned area.</p>
                </div>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Visit Schedules</CardTitle>
                            <CardDescription>
                                {filteredVisits.length} of {visits.length} visit(s) assigned to you
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={filteredVisits}
                            searchKey="visit_search"
                            searchPlaceholder="Search by visitor or PDL..."
                            initialSorting={[{ id: 'scheduled_date', desc: true }]}
                            headerActions={
                                <div className="flex gap-2">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[150px]">
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
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="virtual">Virtual</SelectItem>
                                            <SelectItem value="physical">Physical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            }
                        />
                    </CardContent>
                </Card>

                {/* Approve Modal */}
                <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Visit Schedule</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to approve this visit schedule? This will create a video room and send notifications to the visitor.
                            </DialogDescription>
                        </DialogHeader>
                        
                        {selectedVisit && (
                            <div className="py-4 space-y-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Visitor:</span>
                                        <div className="font-medium">{selectedVisit.visitor_name}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">PDL:</span>
                                        <div className="font-medium">{selectedVisit.inmate_name}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Date:</span>
                                        <div className="font-medium">{selectedVisit.scheduled_date}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Time:</span>
                                        <div className="font-medium">{selectedVisit.scheduled_time}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Type:</span>
                                        <div className="font-medium capitalize">{selectedVisit.visit_type}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApprove}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve Visit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Modal */}
                <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                    <DialogContent>
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
            </div>
        </AppLayout>
    );
}
