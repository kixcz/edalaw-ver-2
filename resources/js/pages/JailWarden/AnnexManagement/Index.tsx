import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, MoreVertical, Plus, Trash2, Edit, List, BarChart2, Layers, CheckCircle, XCircle, Grid } from 'lucide-react';
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

const COLORS = ['#f97316', '#10b981', '#3b82f6'];

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
    annexes: { data: any[]; current_page: number; last_page: number; per_page: number; total: number };
    jails: any[];
    branch: { id: number; name: string };
    stats: { total_annexes: number; active_annexes: number; inactive_annexes: number; total_cells: number; total_dormitories: number };
    chartData: { annexes_by_status: { status: string; count: number }[]; annexes_by_jail: { jail: string; count: number }[] };
};

export default function AnnexManagement({ auth, annexes, jails, branch, stats, chartData }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAnnex, setSelectedAnnex] = useState<any>(null);

    const form = useForm({
        jail_id: '',
        name: '',
        description: '',
        status: 'active',
    });

    const openCreateModal = () => {
        form.setData({ jail_id: '', name: '', description: '', status: 'active' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (annex: any) => {
        setSelectedAnnex(annex);
        form.setData({
            jail_id: annex.jail?.id?.toString() || '',
            name: annex.name,
            description: annex.description || '',
            status: annex.status,
        });
        setIsEditModalOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/jail-warden/annexes', form.data, {
            onSuccess: () => {
                form.reset();
                setIsCreateModalOpen(false);
            },
        });
    };

    const submitUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAnnex) {
            router.put(`/jail-warden/annexes/${selectedAnnex.id}`, form.data, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedAnnex(null);
                },
            });
        }
    };

    const submitDelete = (annexId: number) => {
        router.delete(`/jail-warden/annexes/${annexId}`);
    };

    const columns: ColumnDef<any>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => row.original.description || '-',
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${row.original.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {row.original.status}
                    </span>
                ),
            },
            {
                accessorKey: 'jail',
                header: 'Jail',
                cell: ({ row }) => row.original.jail?.name || '-',
            },
            {
                accessorKey: 'cells_count',
                header: 'Cells',
            },
            {
                id: 'actions',
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditModal(row.original)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => submitDelete(row.original.id)}
                                className="text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        []
    );

    return (
        <AppLayout user={auth.user}>
            <Head title="Annex Management" />
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-600 rounded-xl"><Building2 className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Annex Management</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Manage your branch's annexes</p>
                            </div>
                        </div>
                        <Button onClick={openCreateModal} className="h-9">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Annex
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard icon={<Building2 className="w-5 h-5" />} value={stats.total_annexes} label="Total Annexes" accent="bg-orange-600" iconBg="bg-orange-50" iconColor="text-orange-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.active_annexes} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<XCircle className="w-5 h-5" />} value={stats.inactive_annexes} label="Inactive" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<Grid className="w-5 h-5" />} value={stats.total_cells} label="Total Cells" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<Layers className="w-5 h-5" />} value={stats.total_dormitories} label="Dormitories" accent="bg-purple-600" iconBg="bg-purple-50" iconColor="text-purple-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Annexes
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800">Annex Records</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{annexes.total} total annexes</p>
                                </div>
                                <div className="p-6">
                                    <DataTable
                                        columns={columns}
                                        data={annexes.data || []}
                                        pagination={{
                                            currentPage: annexes.current_page,
                                            totalPages: annexes.last_page,
                                            perPage: annexes.per_page,
                                            total: annexes.total,
                                        }}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Annexes by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Active vs Inactive distribution</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.annexes_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>
                                                    {chartData.annexes_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Annexes by Jail</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution across jails</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.annexes_by_jail} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="jail" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} name="Annexes" />
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
                    <DialogHeader>
                        <DialogTitle>Create New Annex</DialogTitle>
                        <DialogDescription>
                            Add a new annex to your branch. The annex will be automatically linked to your branch.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="jail">Jail</Label>
                                <Select
                                    value={form.data.jail_id}
                                    onValueChange={(value) => form.setData('jail_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails?.map((jail: any) => (
                                            <SelectItem key={jail.id} value={jail.id.toString()}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.jail_id && (
                                    <p className="text-sm text-red-600">{form.errors.jail_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Enter annex name"
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-red-600">{form.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    placeholder="Enter description"
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-red-600">{form.errors.description}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) => form.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.status && (
                                    <p className="text-sm text-red-600">{form.errors.status}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Create Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Annex</DialogTitle>
                        <DialogDescription>Update annex information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-jail">Jail</Label>
                                <Select
                                    value={form.data.jail_id}
                                    onValueChange={(value) => form.setData('jail_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails?.map((jail: any) => (
                                            <SelectItem key={jail.id} value={jail.id.toString()}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.jail_id && (
                                    <p className="text-sm text-red-600">{form.errors.jail_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-red-600">{form.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Input
                                    id="edit-description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-red-600">{form.errors.description}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) => form.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.status && (
                                    <p className="text-sm text-red-600">{form.errors.status}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Update Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
