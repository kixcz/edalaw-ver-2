import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Scale, Plus, Clock, CheckCircle, XCircle, Gavel, Hourglass, CircleCheck, CircleX } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PrivacyNotice } from '@/components/privacy-notice';
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
        title: 'Appeal Management',
        href: '/visitor/appeals',
    },
];

type Appeal = {
    id: number;
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
    };
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    decision_notes: string | null;
    submitted_at: string;
    deadline: string | null;
    is_within_deadline: boolean;
    documents: Array<{
        id: number;
        file_name: string;
        file_path: string;
    }>;
    created_at: string;
};

type RejectedItem = {
    id: number;
    type: 'visit' | 'eburol';
    type_label: string;
    scheduled_date?: string;
    scheduled_time?: string;
    visit_type?: string;
    inmate_name?: string;
    deceased_name?: string;
    wake_start_date?: string;
    wake_end_date?: string;
    rejected_at: string;
    can_appeal: boolean;
    appeal_deadline: string;
};

type Props = {
    appeals: Appeal[];
    rejected_visits: RejectedItem[];
    rejected_eburols: RejectedItem[];
    stats?: {
        total_appeals: number;
        pending_appeals: number;
        approved_appeals: number;
        rejected_appeals: number;
    };
};

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

function getRequestStatusBadge(status: string) {
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

export default function Appeals({ appeals, rejected_visits, rejected_eburols, stats }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RejectedItem | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [appealableFilter, setAppealableFilter] = useState<string>('all');
    const [appealableTypeFilter, setAppealableTypeFilter] = useState<string>('all');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
    useToast();

    const form = useForm({
        appealable_type: '',
        appealable_id: 0,
        reason: '',
        documents: [] as File[],
        privacy_acknowledged: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/visitor/appeals', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setIsModalOpen(false);
                setSelectedItem(null);
                toast.success('Appeal submitted successfully.');
            },
            onError: (errors) => {
                console.error('Appeal submission errors:', errors);
                
                // Get the first error message to show in toast
                const errorMessages: string[] = [];
                
                // Check for field-specific errors
                if (errors.reason) {
                    errorMessages.push(Array.isArray(errors.reason) ? errors.reason[0] : errors.reason);
                }
                if (errors.documents) {
                    errorMessages.push(Array.isArray(errors.documents) ? errors.documents[0] : errors.documents);
                }
                if (errors.appealable_type) {
                    errorMessages.push(Array.isArray(errors.appealable_type) ? errors.appealable_type[0] : errors.appealable_type);
                }
                if (errors.appealable_id) {
                    errorMessages.push(Array.isArray(errors.appealable_id) ? errors.appealable_id[0] : errors.appealable_id);
                }
                
                // Check for general appeal error
                if (errors.appeal) {
                    errorMessages.push(Array.isArray(errors.appeal) ? errors.appeal[0] : errors.appeal);
                }
                
                // Show the first error message in toast
                if (errorMessages.length > 0) {
                    toast.error(errorMessages[0]);
                } else {
                    toast.error('Failed to submit appeal. Please check the form and try again.');
                }
            },
        });
    };

    const handleOpenModal = (item: RejectedItem) => {
        if (!item.can_appeal) {
            toast.error('The deadline for submitting an appeal has passed (48 hours after rejection).');
            return;
        }
        setSelectedItem(item);
        form.setData({
            appealable_type: item.type,
            appealable_id: item.id,
            reason: '',
            documents: [],
        });
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        form.reset();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        form.setData('documents', files);
    };

    const allRejectedItems = [...rejected_visits, ...rejected_eburols];

    const filteredAppeals = useMemo(() => {
        return appeals.filter((appeal) => {
            const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
            
            // Check if appealable data is still available (can be appealed)
            // This is based on whether there are rejected items that can still be appealed
            let canAppeal = false;
            if (appeal.appealable_data.type === 'visit') {
                const rejectedItem = rejected_visits.find(v => v.id === appeal.appealable_data.id);
                canAppeal = rejectedItem?.can_appeal || false;
            } else {
                const rejectedItem = rejected_eburols.find(e => e.id === appeal.appealable_data.id);
                canAppeal = rejectedItem?.can_appeal || false;
            }
            
            // For appeals that are already submitted, we check if the original item can still be appealed
            // If appeal status is pending and within deadline, the appealable is still "available"
            const appealableAvailable = appeal.status === 'pending' && appeal.is_within_deadline;
            
            const matchesAppealable = appealableFilter === 'all' || 
                (appealableFilter === 'available' && (appealableAvailable || canAppeal)) ||
                (appealableFilter === 'unavailable' && !appealableAvailable && !canAppeal);
            
            // Filter by appealable type (visit or eburol)
            const matchesAppealableType = appealableTypeFilter === 'all' || 
                (appealableTypeFilter === 'visit' && appeal.appealable_data.type === 'visit') ||
                (appealableTypeFilter === 'eburol' && appeal.appealable_data.type === 'eburol');
            
            return matchesStatus && matchesAppealable && matchesAppealableType;
        });
    }, [appeals, statusFilter, appealableFilter, appealableTypeFilter, rejected_visits, rejected_eburols]);

    const columns: ColumnDef<Appeal>[] = useMemo(() => [
        {
            accessorKey: 'appealable_type',
            header: 'Type',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.appealable_type}</div>
            ),
        },
        {
            accessorKey: 'appealable_data',
            header: 'Details',
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
            accessorKey: 'status',
            header: 'Appeal Status',
            cell: ({ row }) => {
                const appeal = row.original;
                return (
                    <div className="flex items-center gap-2">
                        {getStatusBadge(appeal.status)}
                        {!appeal.is_within_deadline && appeal.status === 'pending' && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                <Clock className="mr-1 h-3 w-3" />
                                Past Deadline
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'appealable_data.status',
            header: 'Request Status',
            cell: ({ row }) => {
                const appeal = row.original;
                const requestStatus = appeal.appealable_data.status;
                if (!requestStatus) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                return getRequestStatusBadge(requestStatus);
            },
        },
        {
            accessorKey: 'submitted_at',
            header: 'Submitted',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.original.submitted_at).toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: 'deadline',
            header: 'Deadline',
            cell: ({ row }) => {
                const appeal = row.original;
                if (!appeal.deadline) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                return (
                    <div className="text-sm text-muted-foreground">
                        {new Date(appeal.deadline).toLocaleString()}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const appeal = row.original;
                return (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedAppeal(appeal);
                            setIsViewModalOpen(true);
                        }}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                    </Button>
                );
            },
        },
    ], []);

    const headerActions = (
        <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by appeal status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Appeal Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>

            <Select value={appealableTypeFilter} onValueChange={setAppealableTypeFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="visit">Visit/Schedule</SelectItem>
                    <SelectItem value="eburol">E-Burol</SelectItem>
                </SelectContent>
            </Select>

            <Select value={appealableFilter} onValueChange={setAppealableFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by appealable" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Appealable Items</SelectItem>
                    <SelectItem value="available">Can Still Appeal</SelectItem>
                    <SelectItem value="unavailable">Cannot Appeal Anymore</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appeal Management" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-700 rounded-xl"><Gavel className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Appeal Management</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Appeal rejected visit schedules or e-burol applications</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Gavel className="w-5 h-5" />} value={stats?.total_appeals || 0} label="Total Appeals" accent="bg-slate-700" iconBg="bg-slate-50" iconColor="text-slate-700" />
                        <StatCard icon={<Hourglass className="w-5 h-5" />} value={stats?.pending_appeals || 0} label="Pending" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CircleCheck className="w-5 h-5" />} value={stats?.approved_appeals || 0} label="Approved" accent="bg-green-600" iconBg="bg-green-50" iconColor="text-green-600" />
                        <StatCard icon={<CircleX className="w-5 h-5" />} value={stats?.rejected_appeals || 0} label="Rejected" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    {/* Rejected Items Available for Appeal */}
                    {allRejectedItems.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardContent>
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">Rejected Requests Available for Appeal</h3>
                                <p className="text-xs text-slate-500 mt-0.5">You can appeal these rejected requests within 24-48 hours</p>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                {allRejectedItems.map((item) => (
                                    <Card key={`${item.type}-${item.id}`} className={`border-l-4 ${item.can_appeal ? 'border-l-orange-500' : 'border-l-gray-400 opacity-60'}`}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <CardTitle className="text-lg">
                                                            {item.type_label}
                                                        </CardTitle>
                                                        <Badge variant="destructive">Rejected</Badge>
                                                        {!item.can_appeal && (
                                                            <Badge variant="outline" className="bg-gray-500/10 text-gray-600 dark:text-gray-400">
                                                                <Clock className="mr-1 h-3 w-3" />
                                                                Past Deadline
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <CardDescription>
                                                        {item.type === 'visit' ? (
                                                            <>
                                                                Inmate: {item.inmate_name} | 
                                                                Date: {item.scheduled_date} {item.scheduled_time && `at ${item.scheduled_time}`} | 
                                                                Type: {item.visit_type}
                                                            </>
                                                        ) : (
                                                            <>
                                                                Deceased: {item.deceased_name} | 
                                                                Inmate: {item.inmate_name} | 
                                                                Wake: {item.wake_start_date} to {item.wake_end_date}
                                                            </>
                                                        )}
                                                    </CardDescription>
                                                    <CardDescription>
                                                        Rejected: {new Date(item.rejected_at).toLocaleString()}
                                                        {item.can_appeal && (
                                                            <> | Deadline: {new Date(item.appeal_deadline).toLocaleString()}</>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenModal(item)}
                                                    disabled={!item.can_appeal}
                                                >
                                                    <Plus className="mr-2 size-4" />
                                                    Appeal
                                                </Button>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Existing Appeals */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Appeals</CardTitle>
                        <CardDescription>
                            View all your submitted appeals and their status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {appeals.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Scale className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No appeals submitted yet.</p>
                                {allRejectedItems.length === 0 && (
                                    <p className="text-sm mt-2">You have no rejected requests to appeal.</p>
                                )}
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={filteredAppeals}
                                searchKey="appeal_search"
                                searchPlaceholder="Search appeals by type, reason, or details..."
                                initialSorting={[{ id: 'submitted_at', desc: true }]}
                                enableGlobalFilter={true}
                                headerActions={headerActions}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* View Appeal Details Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Appeal Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this appeal
                            </DialogDescription>
                        </DialogHeader>
                        {selectedAppeal && (
                            <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Type</Label>
                                    <Input readOnly value={selectedAppeal.appealable_type} className="bg-muted" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="pt-2">{getStatusBadge(selectedAppeal.status)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Details</Label>
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
                                    <Label className="text-muted-foreground">Submitted</Label>
                                    <Input readOnly value={new Date(selectedAppeal.submitted_at).toLocaleString()} className="bg-muted" />
                                </div>
                                {selectedAppeal.deadline && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground">Deadline</Label>
                                        <Input readOnly value={new Date(selectedAppeal.deadline).toLocaleString()} className="bg-muted" />
                                    </div>
                                )}
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
                                                    <a href={`/visitor/appeals/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        {doc.file_name}
                                                    </a>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedAppeal.status !== 'pending' && (
                                    <>
                                        {selectedAppeal.decision_notes && (
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">{selectedAppeal.status === 'approved' ? 'Approved' : 'Rejected'} decision notes</Label>
                                                <Textarea readOnly value={selectedAppeal.decision_notes} className="bg-muted min-h-[60px]" />
                                            </div>
                                        )}
                                        {(selectedAppeal.reviewed_by || selectedAppeal.reviewed_at) && (
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">Reviewed by</Label>
                                                <Input readOnly value={`BJMP officer${selectedAppeal.reviewed_at ? ` on ${new Date(selectedAppeal.reviewed_at).toLocaleString()}` : ''}`} className="bg-muted" />
                                            </div>
                                        )}
                                    </>
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

                {/* Submit Appeal Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Submit Appeal</DialogTitle>
                            <DialogDescription>
                                Provide a reason for your appeal and optionally attach supporting documents.
                                Appeals must be submitted within 24-48 hours after rejection.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <PrivacyNotice variant="appeal" />
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 py-4">
                                {selectedItem && (
                                    <div className="rounded-lg bg-muted p-4">
                                        <Label className="text-sm font-semibold">Appealing:</Label>
                                        <p className="text-sm mt-1">
                                            {selectedItem.type_label} - {selectedItem.type === 'visit' ? `Inmate: ${selectedItem.inmate_name}` : `Deceased: ${selectedItem.deceased_name}`}
                                        </p>
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="reason">
                                        Appeal Reason <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="reason"
                                        required
                                        rows={6}
                                        value={form.data.reason}
                                        onChange={(e) => form.setData('reason', e.target.value)}
                                        placeholder="Please provide a detailed reason for your appeal. Explain why you believe the rejection should be reconsidered..."
                                        minLength={10}
                                        maxLength={2000}
                                    />
                                    <InputError message={form.errors.reason} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters, maximum 2000 characters
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="documents">
                                        Supporting Documents (Optional)
                                    </Label>
                                    <Input
                                        id="documents"
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                    />
                                    <InputError message={form.errors.documents} />
                                    {form.errors.appeal && (
                                        <div className="text-sm text-destructive">
                                            {Array.isArray(form.errors.appeal) ? form.errors.appeal[0] : form.errors.appeal}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        You can upload up to 5 files (PDF, DOC, DOCX, JPG, JPEG, PNG). Max 5MB per file.
                                    </p>
                                    {form.data.documents.length > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            Selected: {form.data.documents.length} file(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={handleModalClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing} className="bg-primary hover:bg-primary/90 text-white">
                                    {form.processing ? 'Submitting...' : 'Submit Appeal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                </div>
            </div>
       
        </AppLayout>
    );
}
