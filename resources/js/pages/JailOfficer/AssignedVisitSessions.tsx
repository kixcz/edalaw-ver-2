import { Head, useForm } from '@inertiajs/react';
import { Camera, CheckCircle, Clock, Download, FileText, Image, MoreVertical, XCircle, List, BarChart2, Calendar, CheckCircle2, AlertCircle, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import axios from 'axios';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

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
    relationship_proof_path: string | null;
    additional_proof_path: string | null;
    notes: string | null;
};

type Props = {
    visits: Visit[];
    stats: { total_visits: number; pending_visits: number; approved_visits: number; rejected_visits: number; completed_visits: number; virtual_visits: number };
    chartData: { visits_by_status: { status: string; count: number }[]; visits_by_type: { type: string; count: number }[] };
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
        pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
        completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    };
    const config = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.className}`}>{config.label}</span>;
}

function getVisitTypeBadge(type: string) {
    const isVirtual = type === 'virtual';
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${isVirtual ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {isVirtual ? 'Virtual' : 'Physical'}
        </span>
    );
}

function DocumentCard({ title, path, icon }: { title: string; path: string; icon: React.ReactNode }) {
    const fileUrl = `/storage/${path}`;
    const fileName = path.split('/').pop() || 'Document';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension || '');

    return (
        <div className="border border-border rounded-lg p-4 bg-card hover:border-border transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-blue-50 text-blue-600 rounded-lg p-2 flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{fileName}</p>
                    </div>
                </div>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0"
                >
                    <Download className="h-3.5 w-3.5" />
                    View
                </a>
            </div>
            {isImage && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <img 
                        src={fileUrl} 
                        alt={title}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default function AssignedVisitSessions({ visits, stats, chartData, pagination, filters: initialFilters }: Props) {
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
                                        className="text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"
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
                                        className="text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                </>
                            )}
                            
                            {isApproved && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Media Controls</DropdownMenuLabel>
                                    <DropdownMenuItem 
                                        onClick={() => {
                                            const videoWindow = window.open('', '_blank');
                                            if (videoWindow) {
                                                videoWindow.postMessage({ type: 'toggle-mic' }, '*');
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Mic className="mr-2 h-4 w-4" />
                                        Allow Microphone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => {
                                            const videoWindow = window.open('', '_blank');
                                            if (videoWindow) {
                                                videoWindow.postMessage({ type: 'toggle-camera' }, '*');
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Video className="mr-2 h-4 w-4" />
                                        Allow Camera
                                    </DropdownMenuItem>
                                </>
                            )}
                            
                            <DropdownMenuItem onClick={() => setSelectedVisit(visit)} className="gap-2 cursor-pointer">
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
            alert(error?.response?.data?.errors?.approve?.[0] || error?.response?.data?.message || 'Failed to approve visit');
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
        <AppLayout>
            <Head title="Assigned Visit Sessions" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><Calendar className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Assigned Visit Sessions</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Review and manage virtual visit schedules for PDLs in your assigned area</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Calendar className="w-5 h-5" />} value={stats.total_visits} label="Total Visits" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<Clock className="w-5 h-5" />} value={stats.pending_visits} label="Pending" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.approved_visits} label="Approved" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<AlertCircle className="w-5 h-5" />} value={stats.rejected_visits} label="Rejected" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Visits
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Visit Records</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{filteredVisits.length} of {visits.length} visits</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[150px] h-9">
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
                                            <SelectTrigger className="w-[150px] h-9">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="virtual">Virtual</SelectItem>
                                                <SelectItem value="physical">Physical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <DataTable
                                        columns={columns}
                                        data={filteredVisits}
                                        searchKey="visit_search"
                                        searchPlaceholder="Search by visitor or PDL..."
                                        initialSorting={[{ id: 'scheduled_date', desc: true }]}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Visits by Status</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of visit statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.visits_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.visits_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Visits by Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Virtual vs Physical distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.visits_by_type} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Visits" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Approve Modal */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Approve Visit Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Review the visit details and attached documents before approving. This will create a video room and notify the visitor.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedVisit && (
                        <div className="py-4 space-y-6">
                            <div className="bg-muted rounded-lg p-4 space-y-4">
                                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Visit Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor</span>
                                        <div className="font-medium">{selectedVisit.visitor_name}</div>
                                        <div className="text-xs text-muted-foreground">{selectedVisit.visitor_email}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">PDL</span>
                                        <div className="font-medium">{selectedVisit.inmate_name}</div>
                                        {selectedVisit.cell_info && (
                                            <div className="text-xs text-muted-foreground">
                                                {selectedVisit.cell_info.cell_number}
                                                {selectedVisit.cell_info.floor && `, Floor ${selectedVisit.cell_info.floor}`}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Date</span>
                                        <div className="font-medium">
                                            {new Date(selectedVisit.scheduled_date).toLocaleDateString('en-US', { 
                                                month: 'long', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Time</span>
                                        <div className="font-medium">{selectedVisit.scheduled_time}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visit Type</span>
                                        <div className="font-medium capitalize">{selectedVisit.visit_type}</div>
                                    </div>
                                    {selectedVisit.cell_info?.annex_name && (
                                        <div>
                                            <span className="text-muted-foreground text-xs block mb-1">Building</span>
                                            <div className="font-medium">{selectedVisit.cell_info.annex_name}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedVisit.notes && (
                                    <div>
                                        <span className="text-muted-foreground text-xs block mb-1">Visitor Notes</span>
                                        <div className="text-sm bg-card border border-border rounded p-3 mt-1">
                                            {selectedVisit.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(selectedVisit.relationship_proof_path || selectedVisit.additional_proof_path) && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">Attached Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedVisit.relationship_proof_path && (
                                            <DocumentCard
                                                title="Relationship Proof"
                                                path={selectedVisit.relationship_proof_path}
                                                icon={<Image className="h-4 w-4" />}
                                            />
                                        )}
                                        {selectedVisit.additional_proof_path && (
                                            <DocumentCard
                                                title="Additional Proof"
                                                path={selectedVisit.additional_proof_path}
                                                icon={<FileText className="h-4 w-4" />}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 bg-card pt-4 pb-2 border-t border-border">
                        <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" type="button">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Visit
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
        </AppLayout>
    );
}
