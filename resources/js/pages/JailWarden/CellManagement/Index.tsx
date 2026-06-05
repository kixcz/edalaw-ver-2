import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Fence, MoreVertical, Plus, Trash2, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';

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
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard/jail-warden',
    },
    {
        title: 'Cell Management',
        href: '/jail-warden/cells',
    },
];

export default function CellManagement({ auth, cells, annexes }: any) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<any>(null);

    const form = useForm({
        cell_number: '',
        capacity: '4',
        status: 'active',
        annex_id: '',
    });

    const openCreateModal = () => {
        form.setData({ cell_number: '', capacity: '4', status: 'active', annex_id: '' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (cell: any) => {
        setSelectedCell(cell);
        form.setData({
            cell_number: cell.cell_number,
            capacity: cell.capacity.toString(),
            status: cell.status,
            annex_id: cell.annex?.id?.toString() || '',
        });
        setIsEditModalOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting cell creation:', form.data);
        router.post('/dashboard/jail-warden/cells', form.data, {
            onSuccess: () => {
                console.log('Cell created successfully');
                form.reset();
                setIsCreateModalOpen(false);
            },
            onError: (error) => {
                console.error('Error creating cell:', error);
            },
        });
    };

    const submitUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCell) {
            router.put(`/dashboard/jail-warden/cells/${selectedCell.id}`, form.data, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedCell(null);
                },
            });
        }
    };

    const submitDelete = (cellId: number) => {
        router.delete(`/jail-warden/cells/${cellId}`);
    };

    const columns: ColumnDef<any>[] = useMemo(
        () => [
            {
                accessorKey: 'cell_number',
                header: 'Cell Number',
            },
            {
                accessorKey: 'capacity',
                header: 'Capacity',
            },
            {
                accessorKey: 'annex.name',
                header: 'Annex',
                cell: ({ row }) => row.original.annex?.name || '-',
            },
            {
                accessorKey: 'annex.dormitory.name',
                header: 'Dormitory',
                cell: ({ row }) => row.original.annex?.dormitory?.name || '-',
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
                        {row.original.status}
                    </Badge>
                ),
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
                                className="text-red-600"
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
        <AppLayout user={auth.user} breadcrumbs={breadcrumbs}>
            <Head title="Cell Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Fence className="h-6 w-6" />
                                        Cell Management
                                    </CardTitle>
                                    <CardDescription>Manage your branch's cells</CardDescription>
                                </div>
                                <Button onClick={openCreateModal}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Cell
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={columns}
                                data={cells.data || []}
                                pagination={{
                                    currentPage: cells.current_page,
                                    totalPages: cells.last_page,
                                    perPage: cells.per_page,
                                    total: cells.total,
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Cell</DialogTitle>
                        <DialogDescription>
                            Add a new cell to your branch. Select an annex to link it to.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="cell_number">Cell Number</Label>
                                <Input
                                    id="cell_number"
                                    value={form.data.cell_number}
                                    onChange={(e) => form.setData('cell_number', e.target.value)}
                                    placeholder="Enter cell number"
                                />
                                {form.errors.cell_number && (
                                    <p className="text-sm text-red-600">{form.errors.cell_number}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={form.data.capacity}
                                    onChange={(e) => form.setData('capacity', e.target.value)}
                                />
                                {form.errors.capacity && (
                                    <p className="text-sm text-red-600">{form.errors.capacity}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="annex_id">Annex</Label>
                                <Select
                                    value={form.data.annex_id}
                                    onValueChange={(value) => form.setData('annex_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select annex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {annexes?.map((annex: any) => (
                                            <SelectItem key={annex.id} value={annex.id.toString()}>
                                                {annex.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.annex_id && (
                                    <p className="text-sm text-red-600">{form.errors.annex_id}</p>
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
                                Create Cell
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Cell</DialogTitle>
                        <DialogDescription>Update cell information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-cell_number">Cell Number</Label>
                                <Input
                                    id="edit-cell_number"
                                    value={form.data.cell_number}
                                    onChange={(e) => form.setData('cell_number', e.target.value)}
                                />
                                {form.errors.cell_number && (
                                    <p className="text-sm text-red-600">{form.errors.cell_number}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-capacity">Capacity</Label>
                                <Input
                                    id="edit-capacity"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={form.data.capacity}
                                    onChange={(e) => form.setData('capacity', e.target.value)}
                                />
                                {form.errors.capacity && (
                                    <p className="text-sm text-red-600">{form.errors.capacity}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-annex_id">Annex</Label>
                                <Select
                                    value={form.data.annex_id}
                                    onValueChange={(value) => form.setData('annex_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {annexes?.map((annex: any) => (
                                            <SelectItem key={annex.id} value={annex.id.toString()}>
                                                {annex.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.annex_id && (
                                    <p className="text-sm text-red-600">{form.errors.annex_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) => form.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                                Update Cell
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
