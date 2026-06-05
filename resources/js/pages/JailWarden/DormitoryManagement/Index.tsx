import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, MoreVertical, Plus, Trash2, Edit } from 'lucide-react';
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
        title: 'Dormitory Management',
        href: '/jail-warden/dormitories',
    },
];

export default function DormitoryManagement({ auth, dormitories, jails }: any) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDormitory, setSelectedDormitory] = useState<any>(null);

    const form = useForm({
        name: '',
        type: '',
        description: '',
        status: 'active',
        jail_id: '',
    });

    const openCreateModal = () => {
        form.setData({ name: '', type: '', description: '', status: 'active', jail_id: '' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (dormitory: any) => {
        setSelectedDormitory(dormitory);
        form.setData({
            name: dormitory.name,
            type: dormitory.type,
            description: dormitory.description || '',
            status: dormitory.status,
            jail_id: dormitory.jail?.id?.toString() || '',
        });
        setIsEditModalOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting dormitory creation:', form.data);
        router.post('/jail-warden/dormitories', form.data, {
            onSuccess: () => {
                console.log('Dormitory created successfully');
                form.reset();
                setIsCreateModalOpen(false);
            },
            onError: (error) => {
                console.error('Error creating dormitory:', error);
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
            {
                accessorKey: 'name',
                header: 'Name',
            },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <Badge variant="outline">{row.original.type}</Badge>
                ),
            },
            {
                accessorKey: 'jail.name',
                header: 'Jail',
                cell: ({ row }) => row.original.jail?.name || '-',
            },
            {
                accessorKey: 'annexes_count',
                header: 'Annexes',
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
                                className="text-red-600"
                                disabled={row.original.cells_count > 0}
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
            <Head title="Dormitory Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="h-6 w-6" />
                                        Dormitory Management
                                    </CardTitle>
                                    <CardDescription>Manage your branch's dormitories</CardDescription>
                                </div>
                                <Button onClick={openCreateModal}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Dormitory
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={columns}
                                data={dormitories.data || []}
                                pagination={{
                                    currentPage: dormitories.current_page,
                                    totalPages: dormitories.last_page,
                                    perPage: dormitories.per_page,
                                    total: dormitories.total,
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
                        <DialogTitle>Create New Dormitory</DialogTitle>
                        <DialogDescription>
                            Add a new dormitory to your branch. Select a jail to link it to.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Enter dormitory name"
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-red-600">{form.errors.name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jail_id">Jail</Label>
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
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={form.data.type}
                                    onValueChange={(value) => form.setData('type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="juvenile">Juvenile</SelectItem>
                                        <SelectItem value="medical">Medical</SelectItem>
                                        <SelectItem value="solitary">Solitary</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.type && (
                                    <p className="text-sm text-red-600">{form.errors.type}</p>
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
                                Create Dormitory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Dormitory</DialogTitle>
                        <DialogDescription>Update dormitory information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitUpdate}>
                        <div className="space-y-4 py-4">
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
                                <Label htmlFor="edit-type">Type</Label>
                                <Select
                                    value={form.data.type}
                                    onValueChange={(value) => form.setData('type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="juvenile">Juvenile</SelectItem>
                                        <SelectItem value="medical">Medical</SelectItem>
                                        <SelectItem value="solitary">Solitary</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.type && (
                                    <p className="text-sm text-red-600">{form.errors.type}</p>
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
                                <Label htmlFor="edit-jail_id">Jail</Label>
                                <Select
                                    value={form.data.jail_id}
                                    onValueChange={(value) => form.setData('jail_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                                Update Dormitory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
