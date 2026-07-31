import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Scale, MoreVertical, Eye, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import InputError from '@/components/input-error';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Appeal Processing',
        href: '/bjmp-officer/appeals',
    },
];

type Appeal = {
    id: number;
    user_name: string;
    user_email: string;
    appealable_type: string;
    appealable_data: {
        type: 'visit' | 'eburol';
        id: number;
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
    };
};

function getStatusBadge(status: string) {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        pending: {
            variant: 'secondary',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            label: 'Pending Review',
        },
        approved: {
            variant: 'default',
            className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            label: 'Approved (Reversed)',
        },
        rejected: {
            variant: 'destructive',
            className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            label: 'Rejected (Final)',
        },
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

export default function AppealReview({ appeals, stats }: Props) {
    const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    useToast();

    const reviewForm = useForm({
        status: 'approved' as 'approved' | 'rejected',
        decision_notes: '',
    });

    const handleReview = () => {
        if (!selectedAppeal) {
            return;
        }

        if (!reviewForm.data.decision_notes || reviewForm.data.decision_notes.trim().length < 10) {
            toast.error('Decision notes are required (minimum 10 characters)');
            return;
        }

        reviewForm.post(`/bjmp-officer/appeals/${selectedAppeal.id}/review`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Appeal ${reviewForm.data.status} successfully`);
                setIsReviewModalOpen(false);
                setSelectedAppeal(null);
                reviewForm.reset();
            },
            onError: () => {
                toast.error('Failed to review appeal');
            },
        });
    };

    const filteredAppeals = useMemo(() => {
        return appeals.filter((appeal) => {
            const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
            const matchesType = typeFilter === 'all' || appeal.appealable_data.type === typeFilter;
            return matchesStatus && matchesType;
        });
    }, [appeals, statusFilter, typeFilter]);

    const columns: ColumnDef<Appeal>[] = useMemo(() => [
        {
            accessorKey: 'user_name',
            header: 'Visitor',
            cell: ({ row }) => {
                const appeal = row.original;
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{appeal.user_name}</div>
                        <div className="text-sm text-muted-foreground">{appeal.user_email}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'appealable_type',
            header: 'Type',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.appealable_type}</div>
            ),
        },
        {
            accessorKey: 'appealable_data',
            header: 'Original Request',
            cell: ({ row }) => {
                const appeal = row.original;
                const data = appeal.appealable_data;
                if (data.type === 'visit') {
                    return (
                        <div className="text-sm">
                            <div className="font-medium">Inmate: {data.inmate_name}</div>
                            <div className="text-muted-foreground">
                                {data.scheduled_date} {data.scheduled_time && `at ${data.scheduled_time}`}
                            </div>
                            <div className="text-muted-foreground">Type: {data.visit_type}</div>
                        </div>
                    );
                } else {
                    return (
                        <div className="text-sm">
                            <div className="font-medium">Deceased: {data.deceased_name}</div>
                            <div className="text-muted-foreground">Inmate: {data.inmate_name}</div>
                            <div className="text-muted-foreground">
                                Wake: {data.wake_start_date} to {data.wake_end_date}
                            </div>
                        </div>
                    );
                }
            },
        },
        {
            accessorKey: 'reason',
            header: 'Appeal Reason',
            cell: ({ row }) => (
                <div className="max-w-md text-sm truncate">{row.original.reason}</div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'submitted_at',
            header: 'Submitted',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.original.submitted_at).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const appeal = row.original;
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
                                    setSelectedAppeal(appeal);
                                    setIsViewModalOpen(true);
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            {appeal.status === 'pending' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedAppeal(appeal);
                                            reviewForm.setData({
                                                status: 'approved',
                                                decision_notes: '',
                                            });
                                            setIsReviewModalOpen(true);
                                        }}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve Appeal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedAppeal(appeal);
                                            reviewForm.setData({
                                                status: 'rejected',
                                                decision_notes: '',
                                            });
                                            setIsReviewModalOpen(true);
                                        }}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject Appeal
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

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
                    <SelectItem value="visit">Visit/Schedule</SelectItem>
                    <SelectItem value="eburol">E-Burol</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appeal Processing" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Appeal Processing</h1>
                        <p className="text-muted-foreground">
                            Review visitor appeals, approve or deny appeal requests, log appeal decisions for audit
                        </p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid gap-4 md:grid-cols-4">
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
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Appeals</CardTitle>
                        <CardDescription>
                            {filteredAppeals.length} of {appeals.length} appeal{appeals.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredAppeals.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Scale className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No appeals found.</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={filteredAppeals}
                                enableGlobalFilter={true}
                                searchPlaceholder="Search by visitor, reason, type..."
                                headerActions={headerActions}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* View Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Appeal Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this appeal
                            </DialogDescription>
                        </DialogHeader>
                        {selectedAppeal && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor</Label>
                                    <Input readOnly value={selectedAppeal.user_name ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor email</Label>
                                    <Input readOnly value={selectedAppeal.user_email ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="pt-2">{getStatusBadge(selectedAppeal.status)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Appeal type</Label>
                                    <Input readOnly value={selectedAppeal.appealable_type} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Submitted</Label>
                                    <Input readOnly value={new Date(selectedAppeal.submitted_at).toLocaleString()} className="bg-muted" />
                                </div>
                                {selectedAppeal.deadline && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Deadline</Label>
                                        <Input readOnly value={new Date(selectedAppeal.deadline).toLocaleString()} className="bg-muted" />
                                    </div>
                                )}
                                {(selectedAppeal.reviewed_by || selectedAppeal.reviewed_at) && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Reviewed by</Label>
                                        <Input readOnly value={`BJMP officer${selectedAppeal.reviewed_at ? ` on ${new Date(selectedAppeal.reviewed_at).toLocaleString()}` : ''}`} className="bg-muted" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Original request details</Label>
                                    <Input
                                        readOnly
                                        className="bg-muted"
                                        value={
                                            selectedAppeal.appealable_data.type === 'visit'
                                                ? `Inmate: ${selectedAppeal.appealable_data.inmate_name} | Date: ${selectedAppeal.appealable_data.scheduled_date} ${selectedAppeal.appealable_data.scheduled_time ? `at ${selectedAppeal.appealable_data.scheduled_time}` : ''} | Type: ${selectedAppeal.appealable_data.visit_type}`
                                                : `Deceased: ${selectedAppeal.appealable_data.deceased_name} | Inmate: ${selectedAppeal.appealable_data.inmate_name} | Wake: ${selectedAppeal.appealable_data.wake_start_date} to ${selectedAppeal.appealable_data.wake_end_date}`
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Appeal reason</Label>
                                    <Textarea readOnly value={selectedAppeal.reason} className="bg-muted min-h-[80px]" />
                                </div>
                                {selectedAppeal.documents.length > 0 && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Supporting documents</Label>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {selectedAppeal.documents.map((doc) => (
                                                <Button key={doc.id} variant="outline" size="sm" asChild>
                                                    <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        {doc.file_name}
                                                    </a>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedAppeal.decision_notes && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">{selectedAppeal.status === 'approved' ? 'Approved' : 'Rejected'} decision notes</Label>
                                        <Textarea readOnly value={selectedAppeal.decision_notes} className="bg-muted min-h-[60px]" />
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    setSelectedAppeal(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Review Modal */}
                <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {reviewForm.data.status === 'approved' ? 'Approve' : 'Reject'} Appeal
                            </DialogTitle>
                            <DialogDescription>
                                {reviewForm.data.status === 'approved' 
                                    ? 'Approve this appeal and reverse the original decision. The original request will be automatically approved.'
                                    : 'Reject this appeal. This is the final decision and cannot be appealed further.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedAppeal && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">Reviewing appeal for:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedAppeal.appealable_type} - {selectedAppeal.user_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Appeal Reason: {selectedAppeal.reason.substring(0, 100)}...
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="decision_notes">
                                    Decision Notes <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="decision_notes"
                                    required
                                    rows={6}
                                    value={reviewForm.data.decision_notes}
                                    onChange={(e) => reviewForm.setData('decision_notes', e.target.value)}
                                    placeholder="Please provide detailed notes about your decision. This will be logged for audit purposes and sent to the visitor..."
                                    minLength={10}
                                    maxLength={1000}
                                />
                                <InputError message={reviewForm.errors.decision_notes} />
                                <p className="text-xs text-muted-foreground">
                                    Minimum 10 characters, maximum 1000 characters
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsReviewModalOpen(false);
                                    setSelectedAppeal(null);
                                    reviewForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleReview} disabled={reviewForm.processing}>
                                {reviewForm.processing 
                                    ? (reviewForm.data.status === 'approved' ? 'Approving...' : 'Rejecting...')
                                    : (reviewForm.data.status === 'approved' ? 'Approve Appeal' : 'Reject Appeal')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

