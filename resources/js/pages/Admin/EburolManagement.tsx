import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Heart, FileText, MoreVertical, Eye, Check, X, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';
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
        title: 'E-Burol Management',
        href: '/admin/eburols',
    },
];

type Eburol = {
    id: number;
    user_id: number;
    visitor_name: string;
    visitor_email: string;
    inmate_name: string;
    deceased_name: string;
    deceased_date_of_death: string;
    relationship_to_inmate: string;
    wake_start_date: string;
    wake_end_date: string;
    preferred_time: string | null;
    wake_location: string;
    additional_details: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    admin_notes: string | null;
    rejection_reason: string | null;
    jail_officer_id: number | null;
    death_certificate_path: string | null;
    relationship_proof_path: string | null;
    created_at: string;
    inmate_tunnel_code?: string | null;
    inmate_tunnel_status?: 'active' | 'expired' | 'used' | null;
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
    eburols: Eburol[];
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        completed: number;
    };
    visitors?: Visitor[];
    monitoringOfficers?: MonitoringOfficer[];
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
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

export default function EburolManagement({ eburols, stats, visitors = [], monitoringOfficers = [] }: Props) {
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEburol, setSelectedEburol] = useState<Eburol | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    useToast();

    const rejectForm = useForm({
        rejection_reason: '',
    });

    const approveForm = useForm({
        jail_officer_id: '',
    });

    const statusForm = useForm({
        status: 'pending' as 'pending' | 'approved' | 'rejected' | 'completed',
        rejection_reason: '',
        jail_officer_id: '',
    });

    const openApproveModal = (eburol: Eburol) => {
        setSelectedEburol(eburol);
        approveForm.setData('jail_officer_id', '');
        setIsApproveModalOpen(true);
    };

    const handleApproveSubmit = () => {
        if (!selectedEburol || !approveForm.data.jail_officer_id) {
            toast.error('Please select a jail officer.');
            return;
        }
        approveForm.post(`/admin/eburols/${selectedEburol.id}/approve`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('E-Burol application approved successfully.');
                setIsApproveModalOpen(false);
                setSelectedEburol(null);
                approveForm.reset();
            },
            onError: () => {
                toast.error('Failed to approve e-burol application.');
            },
        });
    };

    const handleReject = () => {
        if (!selectedEburol) {
            return;
        }

        if (!rejectForm.data.rejection_reason || rejectForm.data.rejection_reason.trim().length < 10) {
            toast.error('Rejection reason is required (minimum 10 characters)');
            return;
        }

        rejectForm.post(`/admin/eburols/${selectedEburol.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('E-Burol application rejected successfully.');
                setIsRejectModalOpen(false);
                setSelectedEburol(null);
                rejectForm.reset();
            },
            onError: () => {
                toast.error('Failed to reject e-burol application.');
            },
        });
    };

    const handleUpdateStatus = () => {
        if (!selectedEburol) {
            return;
        }
        if (statusForm.data.status === 'rejected' && (!statusForm.data.rejection_reason || statusForm.data.rejection_reason.trim().length < 10)) {
            toast.error('Rejection reason is required (minimum 10 characters)');
            return;
        }
        statusForm.post(`/admin/eburols/${selectedEburol.id}/update-status`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('E-Burol status updated successfully.');
                setIsStatusModalOpen(false);
                setSelectedEburol(null);
                statusForm.reset();
            },
            onError: () => {
                toast.error('Failed to update e-burol status.');
            },
        });
    };

    const filteredEburols = useMemo(() => {
        return eburols.filter((eburol) => {
            return statusFilter === 'all' || eburol.status === statusFilter;
        });
    }, [eburols, statusFilter]);

    const columns: ColumnDef<Eburol>[] = useMemo(() => [
        {
            accessorKey: 'visitor_name',
            header: 'Visitor',
            cell: ({ row }) => {
                const eburol = row.original;
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{eburol.visitor_name}</div>
                        <div className="text-sm text-muted-foreground">{eburol.visitor_email}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'inmate_name',
            header: 'Inmate',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.inmate_name}</div>
            ),
        },
        {
            accessorKey: 'deceased_name',
            header: 'Deceased',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.deceased_name}</div>
            ),
        },
        {
            accessorKey: 'relationship_to_inmate',
            header: 'Relationship',
            cell: ({ row }) => (
                <div className="text-sm">{row.original.relationship_to_inmate}</div>
            ),
        },
        {
            accessorKey: 'wake_start_date',
            header: 'Wake Period',
            cell: ({ row }) => {
                const eburol = row.original;
                return (
                    <div className="space-y-1">
                        <div className="text-sm font-medium">
                            {new Date(eburol.wake_start_date).toLocaleDateString()} - {new Date(eburol.wake_end_date).toLocaleDateString()}
                        </div>
                        {eburol.preferred_time && (
                            <div className="text-xs text-muted-foreground">
                                Preferred: {eburol.preferred_time}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'wake_location',
            header: 'Location',
            cell: ({ row }) => (
                <div className="max-w-[200px] text-sm truncate">{row.original.wake_location}</div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: 'inmate_tunnel',
            header: 'Inmate tunnel',
            cell: ({ row }) => {
                const code = row.original.inmate_tunnel_code;
                const status = row.original.inmate_tunnel_status;
                if (!code) return <span className="text-muted-foreground">—</span>;
                const statusLabel = status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : status === 'used' ? 'Used' : '—';
                const statusVariant = status === 'active' ? 'default' : status === 'expired' ? 'destructive' : 'secondary';
                return (
                    <div className="flex flex-col gap-1">
                        <code className="font-mono text-sm tracking-wider">{code}</code>
                        {status && (
                            <Badge variant={statusVariant} className="text-xs w-fit">
                                {statusLabel}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'created_at',
            header: 'Submitted',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const eburol = row.original;
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
                                    setSelectedEburol(eburol);
                                    setIsViewModalOpen(true);
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedEburol(eburol);
                                    statusForm.setData({
                                        status: eburol.status,
                                        rejection_reason: eburol.rejection_reason || '',
                                        jail_officer_id: eburol.jail_officer_id?.toString() ?? '',
                                    });
                                    setIsStatusModalOpen(true);
                                }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Update Status
                            </DropdownMenuItem>
                            {eburol.status === 'pending' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openApproveModal(eburol)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedEburol(eburol);
                                            rejectForm.setData('rejection_reason', '');
                                            setIsRejectModalOpen(true);
                                        }}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                    setSelectedEburol(eburol);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="E-Burol Management" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">E-Burol Management</h1>
                        <p className="text-muted-foreground">
                            Review and verify E-Burol applications and documents, provide justification for rejections
                        </p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid gap-4 md:grid-cols-5">
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
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All E-Burol Applications</CardTitle>
                        <CardDescription>
                            {filteredEburols.length} of {eburols.length} application{eburols.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredEburols.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Heart className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No e-burol applications found.</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={filteredEburols}
                                searchKey="visitor_name"
                                searchPlaceholder="Search by visitor, inmate, deceased..."
                                enableGlobalFilter
                                headerActions={headerActions}
                                initialSorting={[{ id: 'created_at', desc: true }]}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* View Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>E-Burol Application Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this e-burol application
                            </DialogDescription>
                        </DialogHeader>
                        {selectedEburol && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor</Label>
                                    <Input readOnly value={selectedEburol.visitor_name ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Visitor email</Label>
                                    <Input readOnly value={selectedEburol.visitor_email ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="pt-2">{getStatusBadge(selectedEburol.status)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Inmate name</Label>
                                    <Input readOnly value={selectedEburol.inmate_name ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Deceased name</Label>
                                    <Input readOnly value={selectedEburol.deceased_name ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Date of death</Label>
                                    <Input readOnly value={new Date(selectedEburol.deceased_date_of_death).toLocaleDateString()} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Relationship</Label>
                                    <Input readOnly value={selectedEburol.relationship_to_inmate ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Wake start date</Label>
                                    <Input readOnly value={new Date(selectedEburol.wake_start_date).toLocaleDateString()} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Wake end date</Label>
                                    <Input readOnly value={new Date(selectedEburol.wake_end_date).toLocaleDateString()} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Preferred time</Label>
                                    <Input readOnly value={selectedEburol.preferred_time ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Wake location</Label>
                                    <Input readOnly value={selectedEburol.wake_location ?? '—'} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Additional details</Label>
                                    <Input readOnly value={selectedEburol.additional_details ?? '—'} className="bg-muted" />
                                </div>
                                {selectedEburol.rejection_reason && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Rejection reason</Label>
                                        <Input readOnly value={selectedEburol.rejection_reason} className="bg-muted text-destructive" />
                                    </div>
                                )}
                                {selectedEburol.admin_notes && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Admin notes</Label>
                                        <Input readOnly value={selectedEburol.admin_notes} className="bg-muted" />
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    {selectedEburol.death_certificate_path && (
                                        <Button variant="outline" onClick={() => window.open(selectedEburol.death_certificate_path!, '_blank')}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            View death certificate
                                        </Button>
                                    )}
                                    {selectedEburol.relationship_proof_path && (
                                        <Button variant="outline" onClick={() => window.open(selectedEburol.relationship_proof_path!, '_blank')}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            View relationship proof
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    setSelectedEburol(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete confirmation modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Delete E-Burol application</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete the e-burol application and any associated documents.
                            </DialogDescription>
                        </DialogHeader>
                        {selectedEburol && (
                            <p className="text-sm text-muted-foreground">
                                Delete application #<strong>{selectedEburol.id}</strong> — Deceased: <strong>{selectedEburol.deceased_name}</strong>?
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setSelectedEburol(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (!selectedEburol) return;
                                    router.delete(`/admin/eburols/${selectedEburol.id}`, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            toast.success('E-Burol application deleted.');
                                            setIsDeleteModalOpen(false);
                                            setSelectedEburol(null);
                                        },
                                        onError: () => toast.error('Failed to delete E-Burol application.'),
                                    });
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Approve Modal */}
                <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Approve E-Burol Application</DialogTitle>
                            <DialogDescription>
                                Assign a monitoring officer who will be responsible for overseeing this e-burol. They will be notified and can manage it from their Visit Monitoring dashboard.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedEburol && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">Approving application for:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedEburol.deceased_name} - Inmate: {selectedEburol.inmate_name}
                                    </p>
                                </div>
                            )}
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
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsApproveModalOpen(false);
                                    setSelectedEburol(null);
                                    approveForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleApproveSubmit} disabled={approveForm.processing}>
                                {approveForm.processing ? 'Approving...' : 'Approve'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject Modal */}
                <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Reject E-Burol Application</DialogTitle>
                            <DialogDescription>
                                Provide a justification for rejecting this e-burol application. This reason will be sent to the visitor.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {selectedEburol && (
                                <div className="rounded-lg bg-muted p-4">
                                    <p className="text-sm font-medium">Rejecting application for:</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedEburol.deceased_name} - Inmate: {selectedEburol.inmate_name}
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
                                    placeholder="Please provide a detailed justification for rejecting this e-burol application..."
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
                                    setSelectedEburol(null);
                                    rejectForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleReject} disabled={rejectForm.processing}>
                                {rejectForm.processing ? 'Rejecting...' : 'Reject Application'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Update Status Modal */}
                <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Update E-Burol Status</DialogTitle>
                            <DialogDescription>
                                Update the status of this e-burol application
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={statusForm.data.status}
                                    onValueChange={(value) => statusForm.setData('status', value as 'pending' | 'approved' | 'rejected' | 'completed')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
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
                                        placeholder="Please provide a detailed justification for rejecting this e-burol application..."
                                        minLength={10}
                                        maxLength={1000}
                                    />
                                    <InputError message={statusForm.errors.rejection_reason} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters, maximum 1000 characters
                                    </p>
                                </div>
                            )}
                            {monitoringOfficers && monitoringOfficers.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="status_jail_officer_id">
                                        Jail Officer
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
                                        Officer responsible for overseeing this e-burol
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsStatusModalOpen(false);
                                    setSelectedEburol(null);
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
            </div>
        </AppLayout>
    );
}

