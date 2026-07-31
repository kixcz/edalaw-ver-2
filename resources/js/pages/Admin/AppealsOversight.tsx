import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Scale, MoreVertical, Eye, CheckCircle, Clock, XCircle, FileText, Download } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Appeals Management',
        href: '/admin/appeals',
    },
];

type Appeal = {
    id: number;
    user_name: string;
    user_email: string;
    appealable_type: string;
    appealable_data: {
        type: 'visit' | 'eburol';
        id?: number;
        deleted?: boolean;
        scheduled_date?: string;
        scheduled_time?: string;
        visit_type?: string;
        inmate_name?: string;
        deceased_name?: string;
        wake_start_date?: string;
        wake_end_date?: string;
        status?: string;
        notes?: string;
        admin_notes?: string;
    };
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    decision_notes: string | null;
    submitted_at: string;
    deadline: string | null;
    documents: Array<{
        id: number;
        file_name: string;
        file_path: string;
        file_size: number;
        download_url?: string;
    }>;
    created_at: string;
};

type Props = {
    appeals: Appeal[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        by_type: {
            visit: number;
            eburol: number;
        };
    };
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
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

export default function AppealsOversight({ appeals, stats }: Props) {
    const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const reviewForm = useForm({
        status: 'approved' as 'approved' | 'rejected',
        decision_notes: '',
    });

    const updateStatusForm = useForm({
        status: 'pending' as 'pending' | 'approved' | 'rejected',
        decision_notes: '',
    });

    const filteredAppeals = useMemo(() => {
        return appeals.filter((appeal) => {
            const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
            const matchesType = typeFilter === 'all' || appeal.appealable_data.type === typeFilter;
            return matchesStatus && matchesType;
        });
    }, [appeals, statusFilter, typeFilter]);

    const handleOpenReviewModal = useCallback((appeal: Appeal) => {
        setSelectedAppeal(appeal);
        reviewForm.setData({
            status: appeal.status === 'pending' ? 'approved' : (appeal.status as 'approved' | 'rejected'),
            decision_notes: appeal.decision_notes || '',
        });
        setIsReviewModalOpen(true);
    }, [reviewForm]);

    const handleOpenUpdateStatusModal = useCallback((appeal: Appeal) => {
        setSelectedAppeal(appeal);
        updateStatusForm.setData({
            status: appeal.status,
            decision_notes: appeal.decision_notes || '',
        });
        setIsUpdateStatusModalOpen(true);
    }, [updateStatusForm]);

    const handleQuickStatusUpdate = useCallback((appeal: Appeal, newStatus: string) => {
        router.put(
            `/admin/appeals/${appeal.id}/update-status`,
            {
                status: newStatus,
                decision_notes: appeal.decision_notes || '',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Appeal status updated to ${newStatus}`);
                },
                onError: () => {
                    toast.error('Failed to update appeal status');
                },
            }
        );
    }, []);

    const submitReview = () => {
        if (!selectedAppeal) {
            return;
        }

        reviewForm.post(`/admin/appeals/${selectedAppeal.id}/review`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Appeal ${reviewForm.data.status} successfully`);
                setIsReviewModalOpen(false);
                setSelectedAppeal(null);
            },
            onError: (errors) => {
                toast.error('Failed to review appeal');
                console.error(errors);
            },
        });
    };

    const submitUpdateStatus = () => {
        if (!selectedAppeal) {
            return;
        }

        updateStatusForm.put(`/admin/appeals/${selectedAppeal.id}/update-status`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Appeal status updated to ${updateStatusForm.data.status}`);
                setIsUpdateStatusModalOpen(false);
                setSelectedAppeal(null);
            },
            onError: (errors) => {
                toast.error('Failed to update appeal status');
                console.error(errors);
            },
        });
    };

    const columns: ColumnDef<Appeal>[] = useMemo(
        () => [
            {
                accessorKey: 'user_name',
                header: 'Visitor',
                cell: ({ row }) => {
                    const appeal = row.original;
                    return (
                        <div>
                            <div className="font-medium">{appeal.user_name}</div>
                            <div className="text-sm text-muted-foreground">{appeal.user_email}</div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'appealable_type',
                header: 'Type',
                cell: ({ row }) => {
                    const type = row.original.appealable_data.type;
                    return (
                        <Badge variant="outline">
                            {type === 'visit' ? 'Visit Schedule' : 'E-Burol'}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: 'appealable_data',
                header: 'Details',
                cell: ({ row }) => {
                    const data = row.original.appealable_data;
                    if (data.deleted) {
                        return (
                            <span className="text-sm text-muted-foreground italic">
                                Original {data.type === 'visit' ? 'visit schedule' : 'e-burol application'} no longer available
                            </span>
                        );
                    }
                    if (data.type === 'visit') {
                        return (
                            <div className="text-sm">
                                <div className="font-medium">{data.inmate_name}</div>
                                <div className="text-muted-foreground">
                                    {data.scheduled_date} {data.scheduled_time && `at ${data.scheduled_time}`}
                                </div>
                                <div className="text-muted-foreground">
                                    {data.visit_type === 'virtual' ? 'Virtual' : 'Physical'}
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div className="text-sm">
                                <div className="font-medium">Deceased: {data.deceased_name}</div>
                                <div className="text-muted-foreground">Inmate: {data.inmate_name}</div>
                                <div className="text-muted-foreground">
                                    {data.wake_start_date} - {data.wake_end_date}
                                </div>
                            </div>
                        );
                    }
                },
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => {
                    const reason = row.original.reason;
                    return (
                        <div className="max-w-[300px] truncate" title={reason}>
                            {reason}
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
                accessorKey: 'reviewed_by',
                header: 'Reviewed By',
                cell: ({ row }) => {
                    const appeal = row.original;
                    return (
                        <div className="text-sm">
                            {appeal.reviewed_by ? (
                                <>
                                    <div>{appeal.reviewed_by}</div>
                                    {appeal.reviewed_at && (
                                        <div className="text-muted-foreground">
                                            {new Date(appeal.reviewed_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="text-muted-foreground">Not reviewed</span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'submitted_at',
                header: 'Submitted',
                cell: ({ row }) => {
                    const date = new Date(row.original.submitted_at);
                    return <div>{date.toLocaleDateString()}</div>;
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const appeal = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenReviewModal(appeal)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Review & Decide
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenUpdateStatusModal(appeal)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Update Status
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleQuickStatusUpdate(appeal, 'approved')}
                                    disabled={appeal.status === 'approved'}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Quick Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleQuickStatusUpdate(appeal, 'rejected')}
                                    disabled={appeal.status === 'rejected'}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Quick Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleQuickStatusUpdate(appeal, 'pending')}
                                    disabled={appeal.status === 'pending'}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Set to Pending
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [handleOpenReviewModal, handleOpenUpdateStatusModal, handleQuickStatusUpdate],
    );

    const headerActions = (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="visit">Visit Schedule</SelectItem>
                    <SelectItem value="eburol">E-Burol</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appeals Management" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold">Appeals Management</h1>
                    <p className="text-muted-foreground">
                        Monitor and review all appeals from visitors.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Appeals</CardTitle>
                            <Scale className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.approved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.rejected}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">By Type</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm">
                                <div>Visits: {stats.by_type.visit}</div>
                                <div>E-Burol: {stats.by_type.eburol}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredAppeals}
                    searchKey="user_email"
                    searchPlaceholder="Search by visitor email or name..."
                    headerActions={headerActions}
                />

                {/* Review Modal */}
                <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review Appeal</DialogTitle>
                            <DialogDescription>
                                Review and make a decision on this appeal
                            </DialogDescription>
                        </DialogHeader>
                        {selectedAppeal && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Visitor</Label>
                                    <div className="text-sm">
                                        <div className="font-medium">{selectedAppeal.user_name}</div>
                                        <div className="text-muted-foreground">{selectedAppeal.user_email}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Appeal Type</Label>
                                    <div className="text-sm">{selectedAppeal.appealable_type}</div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <div className="rounded-md border p-3 text-sm">{selectedAppeal.reason}</div>
                                </div>
                                {selectedAppeal.documents.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Supporting Documents</Label>
                                        <div className="space-y-2">
                                            {selectedAppeal.documents.map((doc) => (
                                                <a
                                                    key={doc.id}
                                                    href={doc.download_url ?? doc.file_path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    {doc.file_name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Decision</Label>
                                    <Select
                                        value={reviewForm.data.status}
                                        onValueChange={(value) =>
                                            reviewForm.setData('status', value as 'approved' | 'rejected')
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">Approve</SelectItem>
                                            <SelectItem value="rejected">Reject</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="decision_notes">Decision Notes *</Label>
                                    <Textarea
                                        id="decision_notes"
                                        value={reviewForm.data.decision_notes}
                                        onChange={(e) => reviewForm.setData('decision_notes', e.target.value)}
                                        placeholder="Provide detailed notes about your decision..."
                                        rows={4}
                                    />
                                    {reviewForm.errors.decision_notes && (
                                        <p className="text-sm text-red-600">{reviewForm.errors.decision_notes}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsReviewModalOpen(false);
                                    setSelectedAppeal(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={submitReview} disabled={reviewForm.processing}>
                                {reviewForm.processing ? 'Processing...' : 'Submit Decision'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Update Status Modal */}
                <Dialog open={isUpdateStatusModalOpen} onOpenChange={setIsUpdateStatusModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Update Appeal Status</DialogTitle>
                            <DialogDescription>
                                Update the status of this appeal
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={updateStatusForm.data.status}
                                    onValueChange={(value) =>
                                        updateStatusForm.setData('status', value as 'pending' | 'approved' | 'rejected')
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="update_decision_notes">Decision Notes (Optional)</Label>
                                <Textarea
                                    id="update_decision_notes"
                                    value={updateStatusForm.data.decision_notes}
                                    onChange={(e) => updateStatusForm.setData('decision_notes', e.target.value)}
                                    placeholder="Optional notes about the status update..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsUpdateStatusModalOpen(false);
                                    setSelectedAppeal(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={submitUpdateStatus} disabled={updateStatusForm.processing}>
                                {updateStatusForm.processing ? 'Updating...' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

