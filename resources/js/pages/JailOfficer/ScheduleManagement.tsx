import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, Video, MoreVertical, Eye, Check, X, RefreshCw, CalendarClock, FileOutput, FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import InputError from '@/components/input-error';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
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
import { formatVisitSchedule } from '@/lib/formatVisitSchedule';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Visit Schedule Management',
        href: '/jail-officer/schedules',
    },
];

type Visit = {
    id: number;
    user_id: number;
    visitor_name: string;
    visitor_email: string;
    scheduled_date: string;
    scheduled_time: string | null;
    visit_type: 'virtual' | 'physical';
    inmate_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'missed' | 'completed';
    notes: string | null;
    meeting_link: string | null;
    rejection_reason: string | null;
    jail_officer_id: number | null;
    jail_officer_name: string | null;
    access_key: string | null;
    created_at: string;
    schedule_started?: boolean;
    schedule_ended?: boolean;
    visit_session_id?: number | null;
    scheduled_start?: string | null;
    relationship_proof_path: string | null;
    additional_proof_path: string | null;
    inmate_token?: string | null;
    daily_co_room_id?: string | null;
};

type MonitoringOfficer = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    visits: Visit[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        completed: number;
        missed: number;
    };
    monitoringOfficers: MonitoringOfficer[];
};

function getStatusBadge(status: string) {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        pending: {
            variant: 'secondary',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            label: 'Pending',
        },
        approved: {
            variant: 'default',
            className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            label: 'Approved',
        },
        rejected: {
            variant: 'destructive',
            className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            label: 'Rejected',
        },
        completed: {
            variant: 'default',
            className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            label: 'Completed',
        },
        missed: {
            variant: 'outline',
            className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
            label: 'Missed',
        },
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

function getVisitTypeBadge(type: string) {
    return type === 'virtual' ? (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Virtual
        </Badge>
    ) : (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
            Physical
        </Badge>
    );
}

function formatTimeUntil(scheduledStart: string): string {
    const now = Date.now();
    const start = new Date(scheduledStart).getTime();
    const diff = start - now;
    
    if (diff <= 0) return '';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours >= 1) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
}


export default function ScheduleManagement({ visits, stats, monitoringOfficers }: Props) {
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [beforeScheduleVisit, setBeforeScheduleVisit] = useState<Visit | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
    useToast();
    const page = usePage();
    const flash = (page.props as { flash?: { success?: string; warning?: string; error?: string } }).flash;
    const flashShownRef = useRef<{ w?: string; e?: string; s?: string }>({});
    
    // Listen for video room close events (from localStorage)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (!e.key || !e.key.startsWith('session_refresh_')) return;
            
            const sessionId = e.key.replace('session_refresh_', '');
            const value = e.newValue;
            
            if (value === 'ended') {
                console.log(`Session ${sessionId} ended - refreshing page...`);
                // Refresh the page to update session status
                window.location.reload();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    
    useEffect(() => {
        if (flash?.warning && flashShownRef.current.w !== flash.warning) {
            flashShownRef.current.w = flash.warning;
            toast.warning(flash.warning);
        }
        if (flash?.error && flashShownRef.current.e !== flash.error) {
            flashShownRef.current.e = flash.error;
            toast.error(flash.error);
        }
        if (flash?.success && flashShownRef.current.s !== flash.success) {
            flashShownRef.current.s = flash.success;
            toast.success(flash.success);
        }
    }, [flash?.warning, flash?.error, flash?.success]);

    const rejectForm = useForm({
        rejection_reason: '',
    });

    const approveForm = useForm({
        jail_officer_id: '',
    });

    const statusForm = useForm({
        status: 'pending' as 'pending' | 'approved' | 'rejected' | 'missed' | 'completed',
        rejection_reason: '',
        jail_officer_id: '',
    });

    const rescheduleForm = useForm({
        scheduled_date: '',
        scheduled_time: '',
    });

    const handleApprove = () => {
        if (!selectedVisit) {
            return;
        }

        // No need to validate jail_officer_id - backend will auto-assign the logged-in user
        const payload: { jail_officer_id?: string } = {};
        
        // Debug logging
        console.log('Approving visit:', {
            visitId: selectedVisit.id,
            visitType: selectedVisit.visit_type,
            payload: payload,
        });
        router.post(`/jail-officer/schedules/${selectedVisit.id}/approve`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsApproveModalOpen(false);
                setSelectedVisit(null);
                approveForm.reset();
            },
            onError: (errors) => {
                const msg = Array.isArray(errors?.approve) ? errors.approve[0] : (errors?.approve ?? 'Failed to approve schedule.');
                toast.error(msg);
            },
        });
    };

    const handleReject = () => {
        if (!selectedVisit) {
            return;
        }

        if (!rejectForm.data.rejection_reason || rejectForm.data.rejection_reason.trim().length < 10) {
            toast.error('Rejection reason is required (minimum 10 characters)');
            return;
        }

        rejectForm.post(`/jail-officer/schedules/${selectedVisit.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Schedule rejected successfully.');
                setIsRejectModalOpen(false);
                setSelectedVisit(null);
                rejectForm.reset();
            },
            onError: () => {
                toast.error('Failed to reject schedule.');
            },
        });
    };

    const handleUpdateStatus = () => {
        if (!selectedVisit) {
            return;
        }

        if (statusForm.data.status === 'rejected') {
            if (!statusForm.data.rejection_reason || statusForm.data.rejection_reason.trim().length < 10) {
                toast.error('Rejection reason is required (minimum 10 characters)');
                return;
            }
        }

        // No need to validate jail_officer_id - backend will auto-assign the logged-in user when approving

        statusForm.post(`/jail-officer/schedules/${selectedVisit.id}/update-status`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Schedule status updated successfully.');
                setIsStatusModalOpen(false);
                setSelectedVisit(null);
                statusForm.reset();
            },
            onError: () => {
                toast.error('Failed to update schedule status.');
            },
        });
    };

    const handleReschedule = () => {
        if (!selectedVisit) {
            return;
        }

        if (!rescheduleForm.data.scheduled_date || !rescheduleForm.data.scheduled_time) {
            toast.error('Date and time are required');
            return;
        }

        rescheduleForm.post(`/jail-officer/schedules/${selectedVisit.id}/reschedule`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Schedule rescheduled successfully.');
                setIsRescheduleModalOpen(false);
                setSelectedVisit(null);
                rescheduleForm.reset();
            },
            onError: () => {
                toast.error('Failed to reschedule visit.');
            },
        });
    };

    const filteredVisits = useMemo(() => {
        return visits.filter((visit) => {
            const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
            const matchesVisitType = visitTypeFilter === 'all' || visit.visit_type === visitTypeFilter;
            return matchesStatus && matchesVisitType;
        });
    }, [visits, statusFilter, visitTypeFilter]);

    const columns: ColumnDef<Visit>[] = useMemo(() => [
        {
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="font-mono text-sm text-muted-foreground">#{row.original.id}</span>
            ),
        },
        {
            accessorKey: 'scheduled_date',
            header: 'Date / Time',
            cell: ({ row }) => { 
                const visit = row.original;
                const { dateLabel, timeLabel } = formatVisitSchedule(
                    visit.scheduled_date,
                    visit.scheduled_time ?? null,
                    visit.visit_type
                );
                return (
                    <div className="space-y-1 w-[150px]">
                        <div className="font-medium">{dateLabel}</div>
                        <div className="text-sm text-muted-foreground">{timeLabel}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'visitor_name',
            header: 'Visitor',
            cell: ({ row }) => {
                const visit = row.original;
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{visit.visitor_name}</div>
                        <div className="text-sm text-muted-foreground">{visit.visitor_email}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'inmate_name',
            header: 'PDL',
            cell: ({ row }) => (
                <div className="font-medium w-[200px]">{row.original.inmate_name}</div>
            ),
        },
        {
            accessorKey: 'visit_type',
            header: 'Visit Type',
            cell: ({ row }) => getVisitTypeBadge(row.original.visit_type),
        },
        {
            id: 'access_key',
            header: 'Access Key',
            cell: ({ row }) => {
                const visit = row.original;
                if (visit.visit_type === 'virtual') {
                    return <span className="text-sm text-muted-foreground">Not applicable</span>;
                }
                if (visit.access_key) {
                    return (
                        <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">
                            {visit.access_key}
                        </code>
                    );
                }
                return <span className="text-sm text-muted-foreground">â€”</span>;
            },
        },
        {
            id: 'monitoring_officer',
            header: 'Jail Officer',
            cell: ({ row }) => {
                const visit = row.original;
                if (visit.visit_type === 'physical') {
                    return <div className="text-sm text-muted-foreground w-[200px]">Not applicable</div>;
                }
                if (visit.jail_officer_name) {
                    return <div className="text-sm w-[200px]">{visit.jail_officer_name}</div>;
                }
                return <div className="text-sm text-muted-foreground w-[200px]">Not assigned</div>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        // {
        //     id: 'rejection_reason',
        //     header: 'Rejection Reasons',
        //     cell: ({ row }) => {
        //         const visit = row.original;
        //         if (visit.status === 'approved') {
        //             return <span className="text-sm text-muted-foreground">Application was approved</span>;
        //         }
        //         if (visit.status === 'pending') {
        //             return <span className="text-sm text-muted-foreground">Application was pending</span>;
        //         }
        //         if (visit.status === 'rejected' && visit.rejection_reason) {
        //             return (
        //                 <p className="max-w-xs text-sm text-destructive">{visit.rejection_reason}</p>
        //             );
        //         }
        //         return <span className="text-sm text-muted-foreground">â€”</span>;
        //     },
        // },
        {
            id: 'documents',
            header: 'Supporting Docs',
            cell: ({ row }) => {
                const visit = row.original;
                const hasRelationshipProof = !!visit.relationship_proof_path;
                const hasAdditionalProof = !!visit.additional_proof_path;
                
                if (!hasRelationshipProof && !hasAdditionalProof) {
                    return <span className="text-sm text-muted-foreground">â€”</span>;
                }
                
                return (
                    <div className="flex gap-2">
                        {hasRelationshipProof && (
                            <Button
                                size="sm"
                                variant="outline"
                                asChild
                                title="View Proof of Relationship"
                            >
                                <a
                                    href={`/documents/visit/${visit.relationship_proof_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1"
                                >
                                    <FileText className="h-3 w-3" />
                                    <span className="hidden lg:inline">Relationship</span>
                                </a>
                            </Button>
                        )}
                        {hasAdditionalProof && (
                            <Button
                                size="sm"
                                variant="outline"
                                asChild
                                title="View Additional Supporting Document"
                            >
                                <a
                                    href={`/documents/visit/${visit.additional_proof_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1"
                                >
                                    <FileText className="h-3 w-3" />
                                    <span className="hidden lg:inline">Additional</span>
                                </a>
                            </Button>
                        )}
                    </div>
                );
            },
        },
        
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const visit = row.original;
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
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedVisit(visit);
                                    setIsViewModalOpen(true);
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedVisit(visit);
                                    statusForm.setData({
                                        status: visit.status,
                                        rejection_reason: visit.rejection_reason || '',
                                        jail_officer_id: visit.jail_officer_id?.toString() ?? '',
                                    });
                                    setIsStatusModalOpen(true);
                                }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Update Status
                            </DropdownMenuItem>
                            {visit.status === 'pending' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedVisit(visit);
                                            approveForm.reset();
                                            setIsApproveModalOpen(true);
                                        }}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedVisit(visit);
                                            rejectForm.setData('rejection_reason', '');
                                            setIsRejectModalOpen(true);
                                        }}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedVisit(visit);
                                    rescheduleForm.setData({
                                        scheduled_date: visit.scheduled_date,
                                        scheduled_time: visit.scheduled_time || '',
                                    });
                                    setIsRescheduleModalOpen(true);
                                }}
                            >
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Reschedule
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    const headerActions = (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
            </Select>
            <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Visit Schedule Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Visit Schedule Management</h1>
                        <p className="text-muted-foreground">
                            View and manage all visitation requests, approve, reject, or reschedule visitations
                        </p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid gap-4 md:grid-cols-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total</CardDescription>
                            <CardTitle className="text-2xl">{stats.total}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pending</CardDescription>
                            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Approved</CardDescription>
                            <CardTitle className="text-2xl">{stats.approved}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Rejected</CardDescription>
                            <CardTitle className="text-2xl">{stats.rejected}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Completed</CardDescription>
                            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Missed</CardDescription>
                            <CardTitle className="text-2xl">{stats.missed}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Visit Schedules</CardTitle>
                        <CardDescription>
                            {filteredVisits.length} of {visits.length} schedule{visits.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredVisits.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No visit schedules found.</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={filteredVisits}
                                searchKey="visit_search"
                                searchPlaceholder="Search by visitor, PDL, date..."
                                initialSorting={[{ id: 'scheduled_date', desc: true }, { id: 'created_at', desc: true }]}
                                enableGlobalFilter={true}
                                headerActions={headerActions}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* View Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Visit Schedule Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this visit schedule
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor</Label>
                                    <Input readOnly value={selectedVisit.visitor_name ?? 'â€”'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor email</Label>
                                    <Input readOnly value={selectedVisit.visitor_email ?? 'â€”'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="pt-2">{getStatusBadge(selectedVisit.status)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">PDL name</Label>
                                    <Input readOnly value={selectedVisit.inmate_name ?? 'â€”'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visit type</Label>
                                    <div className="pt-2">{getVisitTypeBadge(selectedVisit.visit_type)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Scheduled date</Label>
                                    <Input readOnly value={new Date(selectedVisit.scheduled_date).toLocaleDateString()} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Scheduled time</Label>
                                    <Input readOnly value={selectedVisit.scheduled_time ?? 'â€”'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <Input readOnly value={selectedVisit.notes ?? 'â€”'} className="bg-muted" />
                                </div>
                                {selectedVisit.rejection_reason && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Rejection reason</Label>
                                        <Input readOnly value={selectedVisit.rejection_reason} className="bg-muted text-destructive" />
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    setSelectedVisit(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approve Modal */}
                <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Approve Visit Schedule</DialogTitle>
                            <DialogDescription>
                                Review the uploaded documents. When you approve, you will automatically be assigned as the monitoring officer for this session.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {/* Uploaded Documents Section */}
                            {selectedVisit && (selectedVisit.relationship_proof_path || selectedVisit.additional_proof_path) && (
                                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                                    <h4 className="font-semibold text-sm">Uploaded Supporting Documents</h4>
                                    
                                    {selectedVisit.relationship_proof_path && (
                                        <div className="flex items-center gap-2 p-2 border rounded bg-background">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium">Proof of Relationship</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <a
                                                    href={`/documents/visit/${selectedVisit.relationship_proof_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {selectedVisit.additional_proof_path && (
                                        <div className="flex items-center gap-2 p-2 border rounded bg-background">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium">Additional Supporting Document</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <a
                                                    href={`/documents/visit/${selectedVisit.additional_proof_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* No documents message */}
                            {selectedVisit && !selectedVisit.relationship_proof_path && !selectedVisit.additional_proof_path && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No supporting documents uploaded.</p>
                                    <p className="text-sm mt-1">You may still approve this visit without documents.</p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsApproveModalOpen(false);
                                    setSelectedVisit(null);
                                    approveForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleApprove} disabled={approveForm.processing}>
                                {approveForm.processing ? 'Approving...' : 'Approve Schedule'}
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
                                Provide a justification for rejecting this visit schedule. This reason will be sent to the visitor.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedVisit && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">Rejecting schedule for:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedVisit.inmate_name} - {new Date(selectedVisit.scheduled_date).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="rejection_reason">
                                    Rejection Reason <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="rejection_reason"
                                    required
                                    rows={6}
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                    placeholder="Please provide a detailed justification for rejecting this visit schedule..."
                                    minLength={10}
                                    maxLength={1000}
                                />
                                <InputError message={rejectForm.errors.rejection_reason} />
                                <p className="text-xs text-muted-foreground">
                                    Minimum 10 characters, maximum 1000 characters
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsRejectModalOpen(false);
                                    setSelectedVisit(null);
                                    rejectForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleReject} disabled={rejectForm.processing}>
                                {rejectForm.processing ? 'Rejecting...' : 'Reject Schedule'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Update Status Modal */}
                <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Update Visit Status</DialogTitle>
                            <DialogDescription>
                                Update the status of this visit schedule
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={statusForm.data.status}
                                    onValueChange={(value) => statusForm.setData('status', value as 'pending' | 'approved' | 'rejected' | 'missed' | 'completed')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="missed">Missed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={statusForm.errors.status} />
                            </div>
                            {statusForm.data.status === 'rejected' && (
                                <div className="space-y-2">
                                    <Label htmlFor="status_rejection_reason">
                                        Rejection Reason <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="status_rejection_reason"
                                        required
                                        rows={6}
                                        value={statusForm.data.rejection_reason}
                                        onChange={(e) => statusForm.setData('rejection_reason', e.target.value)}
                                        placeholder="Please provide a detailed justification for rejecting this visit schedule..."
                                        minLength={10}
                                        maxLength={1000}
                                    />
                                    <InputError message={statusForm.errors.rejection_reason} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters, maximum 1000 characters
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsStatusModalOpen(false);
                                    setSelectedVisit(null);
                                    statusForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateStatus} disabled={statusForm.processing}>
                                {statusForm.processing ? 'Updating...' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reschedule Modal â€” 10-min slots (virtual) / 1-hour (physical); past times disabled when date is today */}
                <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Reschedule Visit</DialogTitle>
                            <DialogDescription>
                                Update the date and time for this visit schedule. Virtual: 10-minute slots. Physical: 1-hour slots. Past times are disabled when the selected date is today.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reschedule_date">
                                    Scheduled Date <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="reschedule_date"
                                    type="date"
                                    required
                                    value={rescheduleForm.data.scheduled_date}
                                    onChange={(e) => {
                                        rescheduleForm.setData('scheduled_date', e.target.value);
                                        rescheduleForm.setData('scheduled_time', '');
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <InputError message={rescheduleForm.errors.scheduled_date} />
                            </div>
                            <div className="space-y-2">
                                <Label>Scheduled Time <span className="text-destructive">*</span></Label>
                                {rescheduleForm.data.scheduled_date ? (
                                    <TimeSlotPicker
                                        selectedTime={rescheduleForm.data.scheduled_time || ''}
                                        bookedSlots={[]}
                                        slotCapacities={selectedVisit && rescheduleForm.data.scheduled_date === new Date().toISOString().slice(0, 10)
                                            ? (() => {
                                                const now = new Date();
                                                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                                                const isVirtual = selectedVisit.visit_type === 'virtual';
                                                const cap: Record<string, { current: number; max: number; isFull: boolean }> = {};
                                                if (isVirtual) {
                                                    for (let h = 7; h < 18; h++) {
                                                        for (let m = 0; m < 60; m += 10) {
                                                            const key = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                                            cap[key] = { current: 0, max: 1, isFull: h * 60 + m <= nowMinutes };
                                                        }
                                                    }
                                                } else {
                                                    for (let h = 7; h < 18; h++) {
                                                        const key = `${h.toString().padStart(2, '0')}:00`;
                                                        cap[key] = { current: 0, max: 1, isFull: h * 60 <= nowMinutes };
                                                    }
                                                }
                                                return cap;
                                            })()
                                            : {}}
                                        visitType={selectedVisit?.visit_type}
                                        onTimeSelect={(time) => rescheduleForm.setData('scheduled_time', time)}
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground">Select a date first.</p>
                                )}
                                <InputError message={rescheduleForm.errors.scheduled_time} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsRescheduleModalOpen(false);
                                    setSelectedVisit(null);
                                    rescheduleForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleReschedule} disabled={rescheduleForm.processing}>
                                {rescheduleForm.processing ? 'Rescheduling...' : 'Reschedule'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Session Not Started Yet Modal */}
                <Dialog open={!!beforeScheduleVisit} onOpenChange={(open) => !open && setBeforeScheduleVisit(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Session not started yet</DialogTitle>
                            <DialogDescription>
                                {beforeScheduleVisit?.scheduled_start
                                    ? `This session starts in ${formatTimeUntil(beforeScheduleVisit.scheduled_start)}. You can wait and try again when it's time, or cancel.`
                                    : 'This session has not started yet.'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setBeforeScheduleVisit(null)}>
                                Wait
                            </Button>
                            <Button variant="secondary" onClick={() => setBeforeScheduleVisit(null)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}



