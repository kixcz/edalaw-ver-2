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
                        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

type Props = {
    auth: { user: any };
    annexes: any[];
    jails: any[];
    region_id: number;
    stats: { total_annexes: number; active_annexes: number; inactive_annexes: number };
};

export default function AnnexManagement({ auth, annexes, jails, stats }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAnnex, setSelectedAnnex] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [jailFilter, setJailFilter] = useState('all');

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
        router.post('/regional-supervisor/annexes', form.data, {
            onSuccess: () => {
                form.reset();
                setIsCreateModalOpen(false);
            },
        });
    };

    const submitUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAnnex) {
            router.put(`/regional-supervisor/annexes/${selectedAnnex.id}`, form.data, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedAnnex(null);
                },
            });
        }
    };

    const submitDelete = (annexId: number) => {
        router.delete(`/regional-supervisor/annexes/${annexId}`);
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${row.original.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground border-border'}`}>
                        {row.original.status}
                    </span>
                ),
            },
            {
                accessorKey: 'jail',
                header: 'Jail',
                cell: ({ row }) => row.original.jail ? `${row.original.jail.name} (${row.original.jail.branch?.name || '-'})` : '-',
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

    const filteredAnnexes = useMemo(() => {
        return (annexes || []).filter((a: any) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (jailFilter !== 'all' && a.jail?.id?.toString() !== jailFilter) return false;
            return true;
        });
    }, [annexes, statusFilter, jailFilter]);

    return (
        <AppLayout user={auth.user}>
            <Head title="Annex Management" />
            <div className="min-h-screen bg-muted">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-600 rounded-xl"><Building2 className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Annex Management</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Manage your region's annexes</p>
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
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard icon={<Building2 className="w-5 h-5" />} value={stats.total_annexes} label="Total Annexes" accent="bg-orange-600" iconBg="bg-orange-50" iconColor="text-orange-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.active_annexes} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<XCircle className="w-5 h-5" />} value={stats.inactive_annexes} label="Inactive" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    <Card className="border-0 shadow-sm">
                        <div className="px-6 py-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Annex Records</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{annexes?.length || 0} total annexes</p>
                        </div>
                        <div className="p-6">
                            <DataTable
                                columns={columns}
                                data={filteredAnnexes}
                                searchKey="name"
                                headerActions={
                                    <>
                                        <Select value={jailFilter} onValueChange={setJailFilter}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by jail" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Jails</SelectItem>
                                                {(jails || []).map((jail: any) => (
                                                    <SelectItem key={jail.id} value={jail.id.toString()}>
                                                        {jail.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[150px]">
                                                <SelectValue placeholder="Filter by status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </>
                                }
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Annex</DialogTitle>
                        <DialogDescription>
                            Add a new annex to your region.
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
                                                {jail.name} ({jail.branch_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.jail_id && (
                                    <p className="text-sm text-destructive">{form.errors.jail_id}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.name}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.description}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.status}</p>
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
                            <Button type="submit" disabled={form.processing} className="bg-primary hover:bg-primary/90 text-white">
                                Create Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Annex</DialogTitle>
                        <DialogDescription>Update annex information.</DialogDescription>
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
                                                {jail.name} ({jail.branch_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.jail_id && (
                                    <p className="text-sm text-destructive">{form.errors.jail_id}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.name}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.description}</p>
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
                                    <p className="text-sm text-destructive">{form.errors.status}</p>
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
                            <Button type="submit" disabled={form.processing} className="bg-primary hover:bg-primary/90 text-white">
                                Update Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
