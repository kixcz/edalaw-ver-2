import { Head, router, useForm, usePage } from '@inertiajs/react';

import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, Clock, Plus, User, Video, Check, X, MoreVertical, Eye, Edit, Trash2, Key, RefreshCw, FileOutput, VideoIcon, QrCode } from 'lucide-react';
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
        title: 'Schedule Management',
        href: '/admin/schedules',
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
    inmate_first_name: string;
    inmate_middle_name: string | null;
    inmate_last_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'missed' | 'completed' | 'cancelled';
    notes: string | null;
    meeting_link: string | null;
    rejection_reason: string | null;
    access_key: string | null;
    access_key_expires_at: string | null;
    jail_officer_id: number | null;
    jail_officer_name: string | null;
    created_at: string;
    schedule_started?: boolean;
    schedule_ended?: boolean;
    visit_session_id?: number | null;
};

type Visitor = {
    id: number;
    name: string;
    email: string;
};

type MonitoringOfficer = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    visits: Visit[];
    visitors: Visitor[];
    monitoringOfficers?: MonitoringOfficer[];
    today_unavailable?: boolean;
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
        cancelled: {
            variant: 'outline',
            className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
            label: 'Cancelled',
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

export default function ScheduleManagement({ visits, visitors, monitoringOfficers = [] }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [slotCapacities, setSlotCapacities] = useState<Record<string, { current: number; max: number; isFull: boolean }>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isDayUnavailable, setIsDayUnavailable] = useState(false);
    const [editSlotCapacities, setEditSlotCapacities] = useState<Record<string, { current: number; max: number; isFull: boolean }>>({});
    const [loadingEditSlots, setLoadingEditSlots] = useState(false);
    const [editDayUnavailable, setEditDayUnavailable] = useState(false);
    useToast();
    const page = usePage();
    const flash = (page.props as { flash?: { success?: string; warning?: string; error?: string } }).flash;
    const flashShownRef = useRef<{ w?: string; e?: string; s?: string }>({});
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

    const statusForm = useForm({
        status: 'pending' as 'pending' | 'approved' | 'rejected' | 'missed' | 'completed' | 'cancelled',
        rejection_reason: '',
        jail_officer_id: '',
    });

    const approveForm = useForm({
        jail_officer_id: '',
    });

    const editForm = useForm({
        scheduled_date: '',
        scheduled_time: '',
        visit_type: '',
        inmate_first_name: '',
        inmate_middle_name: '',
        inmate_last_name: '',
        notes: '',
        meeting_link: '',
        jail_officer_id: '',
    });

    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minScheduleDate = (usePage().props as Props).today_unavailable ? tomorrow.toISOString().split('T')[0] : today;

    const form = useForm({
        user_id: '',
        scheduled_date: '',
        scheduled_time: '',
        visit_type: 'virtual',
        inmate_first_name: '',
        inmate_middle_name: '',
        inmate_last_name: '',
        notes: 'Generated by super admin.',
        jail_officer_id: '',
    });

    const handleApprove = () => {
        if (!selectedVisit) {
            return;
        }

        const data: { jail_officer_id?: string } = {};

        if (selectedVisit.visit_type === 'virtual') {
            if (!approveForm.data.jail_officer_id) {
                toast.error('Please select a jail officer for this virtual visit.');
                return;
            }
            data.jail_officer_id = approveForm.data.jail_officer_id;
        }

        // For physical visits, QR code will be automatically generated on the backend

        router.post(`/admin/schedules/${selectedVisit.id}/approve`, data, {
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

    const fetchSlotCapacities = async (date: string, visitType: string) => {
        if (!date) {
            setSlotCapacities({});
            setIsDayUnavailable(false);
            return;
        }
        setLoadingSlots(true);
        setIsDayUnavailable(false);
        try {
            const type = visitType || 'virtual';
            const response = await fetch(`/admin/schedules/booked-slots?date=${date}&visit_type=${type}`);
            const data = await response.json();
            setSlotCapacities(data.slotCapacities || {});
            setIsDayUnavailable(data.isDayUnavailable === true);
        } catch (error) {
            console.error('Error fetching slot capacities:', error);
            setSlotCapacities({});
        } finally {
            setLoadingSlots(false);
        }
    };

    const fetchEditSlotCapacities = async (date: string, visitType: string) => {
        if (!date) {
            setEditSlotCapacities({});
            setEditDayUnavailable(false);
            return;
        }
        setLoadingEditSlots(true);
        setEditDayUnavailable(false);
        try {
            const type = visitType || 'virtual';
            const response = await fetch(`/admin/schedules/booked-slots?date=${date}&visit_type=${type}`);
            const data = await response.json();
            setEditSlotCapacities(data.slotCapacities || {});
            setEditDayUnavailable(data.isDayUnavailable === true);
        } catch (error) {
            console.error('Error fetching edit slot capacities:', error);
            setEditSlotCapacities({});
        } finally {
            setLoadingEditSlots(false);
        }
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        form.setData('scheduled_date', date);
        form.setData('scheduled_time', '');
        fetchSlotCapacities(date, form.data.visit_type);
    };

    const currentVisitType = form.data.visit_type || 'virtual';
    useEffect(() => {
        if (selectedDate && isCreateModalOpen) {
            fetchSlotCapacities(selectedDate, form.data.visit_type);
        }
    }, [form.data.visit_type]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/schedules', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Schedule created and approved successfully.');
                form.reset();
                form.setData('visit_type', 'virtual');
                form.setData('notes', 'Generated by super admin.');
                setIsCreateModalOpen(false);
                setSelectedDate('');
                setSlotCapacities({});
            },
            onError: () => {
                toast.error('Failed to create schedule. Please check the form and try again.');
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

        if (statusForm.data.status === 'approved' && selectedVisit.visit_type === 'virtual') {
            if (!statusForm.data.jail_officer_id) {
                toast.error('Please select the jail officer responsible for this virtual visit.');
                return;
            }
        }

        statusForm.post(
            `/admin/schedules/${selectedVisit.id}/update-status`,
            {
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
            }
        );
    };

    const handleReject = () => {
        if (!selectedVisit) {
            return;
        }

        if (!rejectForm.data.rejection_reason || rejectForm.data.rejection_reason.trim().length < 10) {
            toast.error('Rejection reason is required (minimum 10 characters)');
            return;
        }

        rejectForm.post(
            `/admin/schedules/${selectedVisit.id}/reject`,
            {
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
            }
        );
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
                        <div className="space-y-1">
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
                accessorKey: 'inmate_first_name',
                header: 'Inmate Name',
                cell: ({ row }) => {
                    const visit = row.original;
                    const inmateName = `${visit.inmate_first_name} ${visit.inmate_middle_name || ''} ${visit.inmate_last_name}`.trim();
                    return <div className="font-medium">{inmateName}</div>;
                },
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
                    return <span className="text-sm text-muted-foreground">—</span>;
                },
            },
            {
                id: 'jail_officer',
                header: 'Jail Officer',
                cell: ({ row }) => {
                    const visit = row.original;
                    if (visit.visit_type === 'physical') {
                        return <span className="text-sm text-muted-foreground">Not applicable</span>;
                    }
                    if (visit.jail_officer_name) {
                        return <span className="text-sm">{visit.jail_officer_name}</span>;
                    }
                    return <span className="text-sm text-muted-foreground">Not assigned</span>;
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => getStatusBadge(row.original.status),
            },
            {
                id: 'rejection_reason',
                header: 'Rejection Reasons',
                cell: ({ row }) => {
                    const visit = row.original;
                    if (visit.status === 'approved') {
                        return <span className="text-sm text-muted-foreground">Application was approved</span>;
                    }
                    if (visit.status === 'pending') {
                        return <span className="text-sm text-muted-foreground">Application was pending</span>;
                    }
                    if (visit.status === 'rejected' && visit.rejection_reason) {
                        return (
                            <p className="max-w-xs text-sm text-destructive">{visit.rejection_reason}</p>
                        );
                    }
                    return <span className="text-sm text-muted-foreground">—</span>;
                },
            },
            {
                id: 'icon',
                header: '',
                cell: ({ row }) => {
                    const visit = row.original;
                    if (visit.visit_type === 'physical' && visit.status === 'approved') {
                        return (
                            <Button size="sm" variant="outline" asChild>
                                <a
                                    href={`/visits/${visit.id}/proof`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex gap-2"
                                    title="Proof of appointment"
                                >
                                    <FileOutput className="h-4 w-4" />
                                    PDF
                                </a>
                            </Button>
                        );
                    }
                    if (visit.visit_type === 'virtual' && visit.status === 'approved') {
                        const canJoin = visit.visit_session_id && visit.schedule_started && !visit.schedule_ended;
                        if (canJoin) {
                            return (
                                <a
                                    href={`/admin/visit-session/${visit.visit_session_id}/join`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-white hover:bg-green-700"
                                    title="Join video call"
                                >
                                    <VideoIcon className="h-4 w-4" />
                                </a>
                            );
                        }
                        const tooltip = !visit.schedule_started
                            ? 'Video call is available from the scheduled start time.'
                            : visit.schedule_ended
                                ? 'Schedule has ended.'
                                : 'Not available';
                        return (
                            <span
                                className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md bg-muted text-muted-foreground"
                                title={tooltip}
                            >
                                <VideoIcon className="h-4 w-4" />
                            </span>
                        );
                    }
                    return <span className="text-sm text-muted-foreground">—</span>;
                },
            },
            {
                accessorKey: 'created_at',
                header: 'Created',
                cell: ({ row }) => (
                    <div className="text-sm text-muted-foreground">
                        {new Date(row.original.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </div>
                ),
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
                                        editForm.setData({
                                            scheduled_date: visit.scheduled_date,
                                            scheduled_time: visit.scheduled_time || '',
                                            visit_type: visit.visit_type,
                                            inmate_first_name: visit.inmate_first_name,
                                            inmate_middle_name: visit.inmate_middle_name || '',
                                            inmate_last_name: visit.inmate_last_name,
                                            notes: visit.notes || '',
                                            meeting_link: visit.meeting_link || '',
                                            jail_officer_id: visit.jail_officer_id?.toString() ?? '',
                                        });
                                        fetchEditSlotCapacities(visit.scheduled_date, visit.visit_type);
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Update
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
                                    <Check className="mr-2 h-4 w-4" />
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
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Reject
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedVisit(visit);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
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
            <Head title="Schedule Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Schedule Management</h1>
                        <p className="text-muted-foreground">
                            Manage all visit schedules from all visitors
                        </p>
                    </div>
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
                                searchKey="search"
                                searchPlaceholder="Search by visitor, inmate, date..."
                                headerActions={
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="status-filter" className="sr-only">Status</Label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger id="status-filter" className="w-[150px]">
                                                    <SelectValue placeholder="All Statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Statuses</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="approved">Approved</SelectItem>
                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="missed">Missed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Label htmlFor="visit-type-filter" className="sr-only">Visit Type</Label>
                                            <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                                                <SelectTrigger id="visit-type-filter" className="w-[150px]">
                                                    <SelectValue placeholder="All Types" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Types</SelectItem>
                                                    <SelectItem value="virtual">Virtual</SelectItem>
                                                    <SelectItem value="physical">Physical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={() => setIsCreateModalOpen(true)}>
                                            <Plus className="mr-2 size-4" />
                                            Create Schedule
                                        </Button>
                                    </>
                                }
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Create Schedule Modal */}
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Schedule</DialogTitle>
                            <DialogDescription>
                                Create a new visit schedule. It will be automatically approved.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="visit_type">
                                        Visit Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.visit_type}
                                        onValueChange={(value) => {
                                            form.setData('visit_type', value);
                                            form.setData('scheduled_time', '');
                                            if (selectedDate) {
                                                fetchSlotCapacities(selectedDate, value);
                                            }
                                        }}
                                    >
                                        <SelectTrigger id="visit_type">
                                            <SelectValue placeholder="Select visit type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="virtual">Virtual (10-min slots)</SelectItem>
                                            <SelectItem value="physical">Physical (1-hour slots)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.visit_type} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="user_id">
                                        Visitor <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.user_id}
                                        onValueChange={(value) => form.setData('user_id', value)}
                                    >
                                        <SelectTrigger id="user_id">
                                            <SelectValue placeholder="Select visitor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {visitors.map((visitor) => (
                                                <SelectItem key={visitor.id} value={visitor.id.toString()}>
                                                    {visitor.name} ({visitor.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.user_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="scheduled_date">
                                        Scheduled Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="scheduled_date"
                                        type="date"
                                        required
                                        min={minScheduleDate}
                                        value={form.data.scheduled_date}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                    />
                                    <InputError message={form.errors.scheduled_date} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="scheduled_time">
                                        Scheduled Time <span className="text-destructive">*</span>
                                    </Label>
                                    {form.data.scheduled_date ? (
                                        isDayUnavailable ? (
                                            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-amber-800 dark:text-amber-200">
                                                <strong>Unavailable.</strong> Schedule times for this day have ended. Please select another date.
                                            </div>
                                        ) : (
                                            <TimeSlotPicker
                                                selectedTime={form.data.scheduled_time}
                                                onTimeSelect={(time) => form.setData('scheduled_time', time)}
                                                slotCapacities={slotCapacities}
                                                loading={loadingSlots}
                                                visitType={currentVisitType === 'virtual' ? 'virtual' : 'physical'}
                                            />
                                        )
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Select a date first.</p>
                                    )}
                                    <InputError message={form.errors.scheduled_time} />
                                </div>

                                {currentVisitType === 'virtual' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="jail_officer_id">
                                            Jail Officer <span className="text-destructive">*</span>
                                        </Label>
                                        <Select
                                            value={form.data.jail_officer_id}
                                            onValueChange={(value) => form.setData('jail_officer_id', value)}
                                        >
                                            <SelectTrigger id="jail_officer_id">
                                                <SelectValue placeholder="Select jail officer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monitoringOfficers.map((mo) => (
                                                    <SelectItem key={mo.id} value={mo.id.toString()}>
                                                        {mo.name} ({mo.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.jail_officer_id} />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="inmate_first_name">
                                        Inmate First Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="inmate_first_name"
                                        type="text"
                                        required
                                        value={form.data.inmate_first_name}
                                        onChange={(e) => form.setData('inmate_first_name', e.target.value)}
                                        placeholder="First name"
                                    />
                                    <InputError message={form.errors.inmate_first_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="inmate_middle_name">Inmate Middle Name</Label>
                                    <Input
                                        id="inmate_middle_name"
                                        type="text"
                                        value={form.data.inmate_middle_name}
                                        onChange={(e) => form.setData('inmate_middle_name', e.target.value)}
                                        placeholder="Middle name (optional)"
                                    />
                                    <InputError message={form.errors.inmate_middle_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="inmate_last_name">
                                        Inmate Last Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="inmate_last_name"
                                        type="text"
                                        required
                                        value={form.data.inmate_last_name}
                                        onChange={(e) => form.setData('inmate_last_name', e.target.value)}
                                        placeholder="Last name"
                                    />
                                    <InputError message={form.errors.inmate_last_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        rows={2}
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        placeholder="Generated by super admin."
                                    />
                                    <InputError message={form.errors.notes} />
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        form.reset();
                                        form.setData('visit_type', 'virtual');
                                        form.setData('notes', 'Generated by super admin.');
                                        setSelectedDate('');
                                        setSlotCapacities({});
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? 'Creating...' : 'Create Schedule'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Reject Modal */}
                <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Schedule</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for rejecting this schedule. The visitor will see this reason.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="rejection_reason">
                                        Rejection Reason <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="rejection_reason"
                                        value={rejectForm.data.rejection_reason}
                                        onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                        placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                                        rows={4}
                                        className="min-h-[100px]"
                                    />
                                    {rejectForm.errors.rejection_reason && (
                                        <p className="text-sm text-destructive">{rejectForm.errors.rejection_reason}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters required. This reason will be visible to the visitor.
                                    </p>
                                </div>
                            </div>
                        )}
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
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={rejectForm.processing}
                            >
                                {rejectForm.processing ? 'Rejecting...' : 'Reject Schedule'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approve Modal */}
                <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Schedule</DialogTitle>
                            <DialogDescription>
                                {selectedVisit?.visit_type === 'physical'
                                    ? 'A unique QR code will be generated for this physical visit. The visitor can scan it from their proof of appointment document.'
                                    : 'Assign a monitoring officer who will oversee this virtual visit. They will be notified and can manage it from Visit Monitoring.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedVisit && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">Approving schedule for:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedVisit.visitor_name} - {selectedVisit.scheduled_date} at {selectedVisit.scheduled_time || 'N/A'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Visit Type: <span className="font-medium capitalize">{selectedVisit.visit_type}</span>
                                    </p>
                                </div>
                            )}

                            {selectedVisit?.visit_type === 'virtual' && (
                                <div className="space-y-2">
                                    <Label htmlFor="approve_jail_officer_id">
                                        Jail Officer <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={approveForm.data.jail_officer_id}
                                        onValueChange={(value) => approveForm.setData('jail_officer_id', value)}
                                    >
                                        <SelectTrigger id="approve_jail_officer_id">
                                            <SelectValue placeholder="Select jail officer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monitoringOfficers.map((officer) => (
                                                <SelectItem key={officer.id} value={officer.id.toString()}>
                                                    {officer.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={approveForm.errors.jail_officer_id} />
                                    <p className="text-xs text-muted-foreground">
                                        The selected officer will be notified and can oversee this virtual visit from their dashboard.
                                    </p>
                                </div>
                            )}

                            {selectedVisit?.visit_type === 'physical' && (
                                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                    <div className="flex items-start gap-3">
                                        <QrCode className="h-6 w-6 text-blue-600 mt-0.5" />
                                        <div className="space-y-1 flex-1">
                                            <p className="text-sm font-medium text-blue-900">QR Code Generation</p>
                                            <p className="text-xs text-blue-700">
                                                A unique QR code will be automatically generated upon approval. The visitor can access it from their proof of appointment document.
                                            </p>
                                        </div>
                                    </div>
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

                {/* Update Status Modal */}
                <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Schedule Status</DialogTitle>
                            <DialogDescription>
                                Change the status for this schedule
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={statusForm.data.status}
                                        onValueChange={(value) => {
                                            statusForm.setData('status', value as 'pending' | 'approved' | 'rejected' | 'missed' | 'completed' | 'cancelled');
                                        }}
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="missed">Missed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {statusForm.data.status === 'rejected' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="status_rejection_reason">
                                            Rejection Reason <span className="text-destructive">*</span>
                                        </Label>
                                        <Textarea
                                            id="status_rejection_reason"
                                            value={statusForm.data.rejection_reason}
                                            onChange={(e) => statusForm.setData('rejection_reason', e.target.value)}
                                            placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                                            rows={4}
                                            className="min-h-[100px]"
                                        />
                                        {statusForm.errors.rejection_reason && (
                                            <p className="text-sm text-destructive">{statusForm.errors.rejection_reason}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Minimum 10 characters required. This reason will be visible to the visitor.
                                        </p>
                                    </div>
                                )}
                                {statusForm.data.status === 'approved' && selectedVisit?.visit_type === 'virtual' && monitoringOfficers && monitoringOfficers.length > 0 && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="status_jail_officer_id">
                                            Jail Officer <span className="text-destructive">*</span>
                                        </Label>
                                        <Select
                                            value={statusForm.data.jail_officer_id}
                                            onValueChange={(value) => statusForm.setData('jail_officer_id', value)}
                                        >
                                            <SelectTrigger id="status_jail_officer_id">
                                                <SelectValue placeholder="Select jail officer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monitoringOfficers.map((officer) => (
                                                    <SelectItem key={officer.id} value={officer.id.toString()}>
                                                        {officer.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={statusForm.errors.jail_officer_id} />
                                        <p className="text-xs text-muted-foreground">
                                            Officer responsible for overseeing this virtual visit (required when approving).
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <Button
                                onClick={handleUpdateStatus}
                                disabled={statusForm.processing}
                            >
                                {statusForm.processing ? 'Updating...' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Schedule Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this schedule
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor name</Label>
                                    <Input readOnly value={selectedVisit.visitor_name ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor email</Label>
                                    <Input readOnly value={selectedVisit.visitor_email ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Scheduled date</Label>
                                    <Input readOnly value={new Date(selectedVisit.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Scheduled time</Label>
                                    <Input readOnly value={selectedVisit.scheduled_time ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visit type</Label>
                                    <div className="pt-2">{getVisitTypeBadge(selectedVisit.visit_type)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="pt-2">{getStatusBadge(selectedVisit.status)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Inmate name</Label>
                                    <Input readOnly value={`${selectedVisit.inmate_first_name} ${selectedVisit.inmate_middle_name || ''} ${selectedVisit.inmate_last_name}`.trim() || '—'} className="bg-muted" />
                                </div>
                                {selectedVisit.visit_type === 'virtual' && selectedVisit.status === 'approved' && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Join video call</Label>
                                        <div className="pt-2">
                                            {selectedVisit.visit_session_id && selectedVisit.schedule_started && !selectedVisit.schedule_ended
                                                ? (
                                                    <a href={`/admin/visit-session/${selectedVisit.visit_session_id}/join`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-green-600 text-white hover:bg-green-700" title="Join video call">
                                                        <VideoIcon className="h-5 w-5" />
                                                    </a>
                                                )
                                                : (
                                                    <span className="inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md bg-muted text-muted-foreground" title={!selectedVisit.schedule_started ? 'Video call is available from the scheduled start time.' : selectedVisit.schedule_ended ? 'Schedule has ended.' : 'Not available'}>
                                                        <VideoIcon className="h-5 w-5" />
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <Input readOnly value={selectedVisit.notes ?? '—'} className="bg-muted" />
                                </div>
                                {selectedVisit.rejection_reason && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Rejection reason</Label>
                                        <Input readOnly value={selectedVisit.rejection_reason} className="bg-muted text-destructive" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Created at</Label>
                                    <Input readOnly value={new Date(selectedVisit.created_at).toLocaleString('en-US')} className="bg-muted" />
                                </div>
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

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Update Schedule</DialogTitle>
                            <DialogDescription>
                                Change date and time. Other details are read-only.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    editForm.put(`/admin/schedules/${selectedVisit.id}`, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            toast.success('Schedule updated successfully.');
                                            setIsEditModalOpen(false);
                                            setSelectedVisit(null);
                                            editForm.reset();
                                        },
                                        onError: () => {
                                            toast.error('Failed to update schedule.');
                                        },
                                    });
                                }}
                            >
                                <div className="space-y-4">
                                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                        <p className="text-sm font-medium text-muted-foreground">Details (read-only)</p>
                                        <dl className="grid gap-2 text-sm">
                                            <div>
                                                <dt className="text-muted-foreground">Visitor</dt>
                                                <dd className="font-medium">{selectedVisit.visitor_name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Inmate</dt>
                                                <dd className="font-medium">
                                                    {selectedVisit.inmate_first_name}
                                                    {selectedVisit.inmate_middle_name ? ` ${selectedVisit.inmate_middle_name}` : ''} {selectedVisit.inmate_last_name}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Visit type</dt>
                                                <dd>{getVisitTypeBadge(selectedVisit.visit_type)}</dd>
                                            </div>
                                            {selectedVisit.visit_type === 'virtual' && selectedVisit.meeting_link && (
                                                <div>
                                                    <dt className="text-muted-foreground">Meeting link</dt>
                                                    <dd className="break-all text-xs">{selectedVisit.meeting_link}</dd>
                                                </div>
                                            )}
                                            {selectedVisit.visit_type === 'physical' && selectedVisit.access_key && (
                                                <div>
                                                    <dt className="text-muted-foreground">Access key</dt>
                                                    <dd className="font-mono">{selectedVisit.access_key}</dd>
                                                </div>
                                            )}
                                            {(editForm.data.notes || selectedVisit.notes) && (
                                                <div>
                                                    <dt className="text-muted-foreground">Notes</dt>
                                                    <dd>{editForm.data.notes || selectedVisit.notes || '—'}</dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit_scheduled_date">
                                            Scheduled Date <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="edit_scheduled_date"
                                            type="date"
                                            required
                                            min={minScheduleDate}
                                            value={editForm.data.scheduled_date}
                                            onChange={(e) => {
                                                editForm.setData('scheduled_date', e.target.value);
                                                editForm.setData('scheduled_time', '');
                                                fetchEditSlotCapacities(e.target.value, editForm.data.visit_type);
                                            }}
                                        />
                                        <InputError message={editForm.errors.scheduled_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit_scheduled_time">
                                            Scheduled Time <span className="text-destructive">*</span>
                                        </Label>
                                        {editForm.data.scheduled_date ? (
                                            editDayUnavailable ? (
                                                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-amber-800 dark:text-amber-200">
                                                    This day is no longer available for scheduling.
                                                </div>
                                            ) : (
                                                <TimeSlotPicker
                                                    selectedTime={editForm.data.scheduled_time}
                                                    onTimeSelect={(time) => editForm.setData('scheduled_time', time)}
                                                    slotCapacities={editSlotCapacities}
                                                    loading={loadingEditSlots}
                                                    visitType={selectedVisit.visit_type === 'virtual' ? 'virtual' : 'physical'}
                                                />
                                            )
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Select a date.</p>
                                        )}
                                        <InputError message={editForm.errors.scheduled_time} />
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditModalOpen(false);
                                            setSelectedVisit(null);
                                            editForm.reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={editForm.processing}>
                                        {editForm.processing ? 'Updating...' : 'Update Schedule'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Schedule</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this schedule? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedVisit && (
                            <div className="space-y-4">
                                <div className="rounded-lg border p-4 bg-muted/50">
                                    <p className="text-sm font-medium">Schedule Details:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Visitor: {selectedVisit.visitor_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Date: {new Date(selectedVisit.scheduled_date).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Time: {selectedVisit.scheduled_time || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setSelectedVisit(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (!selectedVisit) {
                                        return;
                                    }
                                    router.delete(`/admin/schedules/${selectedVisit.id}`, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            toast.success('Schedule deleted successfully.');
                                            setIsDeleteModalOpen(false);
                                            setSelectedVisit(null);
                                        },
                                        onError: () => {
                                            toast.error('Failed to delete schedule.');
                                        },
                                    });
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

