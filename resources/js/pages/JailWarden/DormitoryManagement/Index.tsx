import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, MoreVertical, Plus, Trash2, Edit, List, BarChart2, Layers, CheckCircle, XCircle, Grid } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
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
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

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

type Props = {
    auth: { user: any };
    dormitories: { data: any[]; current_page: number; last_page: number; per_page: number; total: number };
    annexes: any[];
    stats: { total_dormitories: number; active_dormitories: number; inactive_dormitories: number; total_cells: number };
    chartData: { dormitories_by_status: { status: string; count: number }[]; dormitories_by_type: { type: string; count: number }[] };
};

export default function DormitoryManagement({ auth, dormitories, annexes, stats, chartData }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDormitory, setSelectedDormitory] = useState<any>(null);

    const form = useForm({
        name: '',
        type: '',
        description: '',
        status: 'active',
        annex_id: '',
    });

    const openCreateModal = () => {
        form.setData({ name: '', type: '', description: '', status: 'active', annex_id: '' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (dormitory: any) => {
        setSelectedDormitory(dormitory);
        form.setData({
            name: dormitory.name,
            type: dormitory.type,
            description: dormitory.description || '',
            status: dormitory.status,
            annex_id: dormitory.annex?.id?.toString() || '',
        });
        setIsEditModalOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/jail-warden/dormitories', form.data, {
            onSuccess: () => {
                form.reset();
                setIsCreateModalOpen(false);
            },
        });
    };

    const submitUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDormitory) {
            router.put(`/jail-warden/dormitories/${selectedDormitory.id}`, form.data, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedDormitory(null);
                },
            });
        }
    };

    const submitDelete = (dormitoryId: number) => {
        router.delete(`/jail-warden/dormitories/${dormitoryId}`);
    };

    const columns: ColumnDef<any>[] = useMemo(
        () => [
            { accessorKey: 'name', header: 'Name' },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{row.original.type}</span>,
            },
            { accessorKey: 'annex.name', header: 'Annex', cell: ({ row }) => row.original.annex?.name || '-' },
            { accessorKey: 'jail.name', header: 'Jail', cell: ({ row }) => row.original.jail?.name || '-' },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${row.original.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {row.original.status}
                    </span>
                ),
            },
            { accessorKey: 'cells_count', header: 'Cells' },
            {
                id: 'actions',
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditModal(row.original)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => submitDelete(row.original.id)} className="text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        []
    );

    return (
        <AppLayout>
            <Head title="Dormitory Management" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-600 rounded-xl"><Building className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Dormitory Management</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Manage dormitories across all annexes</p>
                            </div>
                        </div>
                        <Button onClick={openCreateModal} className="h-9"><Plus className="h-4 w-4 mr-2" />Create Dormitory</Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Building className="w-5 h-5" />} value={stats.total_dormitories} label="Total Dormitories" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.active_dormitories} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<XCircle className="w-5 h-5" />} value={stats.inactive_dormitories} label="Inactive" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<Grid className="w-5 h-5" />} value={stats.total_cells} label="Total Cells" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Dormitories
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Dormitory Records</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{dormitories.total} total dormitories</p>
                                </div>
                                <div className="p-6">
                                    <DataTable columns={columns} data={dormitories.data || []} />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Dormitories by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Active vs Inactive distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.dormitories_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.dormitories_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Dormitories by Type</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution by type</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.dormitories_by_type} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} name="Dormitories" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Dormitory</DialogTitle><DialogDescription>Add a new dormitory to an annex</DialogDescription></DialogHeader>
                    <form onSubmit={submitCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Enter dormitory name" />{form.errors.name && <p className="text-sm text-red-600">{form.errors.name}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="type">Type</Label><Input id="type" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} placeholder="Enter type" />{form.errors.type && <p className="text-sm text-red-600">{form.errors.type}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="annex_id">Annex</Label><Select value={form.data.annex_id} onValueChange={(value) => form.setData('annex_id', value)}><SelectTrigger><SelectValue placeholder="Select annex" /></SelectTrigger><SelectContent>{annexes?.map((annex: any) => (<SelectItem key={annex.id} value={annex.id.toString()}>{annex.name}</SelectItem>))}</SelectContent></Select>{form.errors.annex_id && <p className="text-sm text-red-600">{form.errors.annex_id}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="description">Description</Label><Input id="description" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder="Enter description" />{form.errors.description && <p className="text-sm text-red-600">{form.errors.description}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>{form.errors.status && <p className="text-sm text-red-600">{form.errors.status}</p>}</div>
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button><Button type="submit" disabled={form.processing}>Create Dormitory</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Dormitory</DialogTitle><DialogDescription>Update dormitory information</DialogDescription></DialogHeader>
                    <form onSubmit={submitUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />{form.errors.name && <p className="text-sm text-red-600">{form.errors.name}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="edit-type">Type</Label><Input id="edit-type" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} />{form.errors.type && <p className="text-sm text-red-600">{form.errors.type}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="edit-annex_id">Annex</Label><Select value={form.data.annex_id} onValueChange={(value) => form.setData('annex_id', value)}><SelectTrigger><SelectValue placeholder="Select annex" /></SelectTrigger><SelectContent>{annexes?.map((annex: any) => (<SelectItem key={annex.id} value={annex.id.toString()}>{annex.name}</SelectItem>))}</SelectContent></Select>{form.errors.annex_id && <p className="text-sm text-red-600">{form.errors.annex_id}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="edit-description">Description</Label><Input id="edit-description" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />{form.errors.description && <p className="text-sm text-red-600">{form.errors.description}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="edit-status">Status</Label><Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>{form.errors.status && <p className="text-sm text-red-600">{form.errors.status}</p>}</div>
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button type="submit" disabled={form.processing}>Update Dormitory</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
