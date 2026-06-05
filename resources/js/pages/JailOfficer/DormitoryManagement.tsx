import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, MoreVertical, Plus, Search, Trash2, Edit } from 'lucide-react';
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
        href: '/dashboard',
    },
    {
        title: 'Dormitory Management',
        href: '/jail-officer/dormitories',
    },
];

type Jail = {
    id: number;
    name: string;
    code: string;
};

type Dormitory = {
    id: number;
    jail_id: number;
    name: string;
    type: string;
    description: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    jail: Jail;
};

type Props = {
    dormitories: {
        data: Dormitory[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    jails: Jail[];
    filters: {
        jail_id: number | null;
        type: string;
        status: string;
    };
};

function getStatusBadge(status: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
        active: { variant: 'default', label: 'Active' },
        inactive: { variant: 'secondary', label: 'Inactive' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function DormitoryManagement({ dormitories, jails, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState('');
    const [jailFilter, setJailFilter] = useState(filters.jail_id ? String(filters.jail_id) : 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDormitory, setSelectedDormitory] = useState<Dormitory | null>(null);

    // Forms
    const createForm = useForm({
        jail_id: '',
        name: '',
        type: '',
        description: '',
        status: 'active',
    });

    const editForm = useForm({
        jail_id: '',
        name: '',
        type: '',
        description: '',
        status: 'active',
    });

    const deleteForm = useForm({});

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/jail-officer/dormitories', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDormitory) return;
        
        editForm.put(`/jail-officer/dormitories/${selectedDormitory.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedDormitory(null);
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDormitory) return;
        
        deleteForm.delete(`/jail-officer/dormitories/${selectedDormitory.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedDormitory(null);
            },
        });
    };

    const openEditModal = (dormitory: Dormitory) => {
        setSelectedDormitory(dormitory);
        editForm.setData({
            jail_id: String(dormitory.jail_id),
            name: dormitory.name,
            type: dormitory.type,
            description: dormitory.description || '',
            status: dormitory.status,
        });
        setIsEditModalOpen(true);
    };

    const columns: ColumnDef<Dormitory>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.name}</div>
                        <div className="text-sm text-muted-foreground">Type: {row.original.type}</div>
                    </div>
                ),
            },
            {
                accessorKey: 'jail',
                header: 'Jail',
                cell: ({ row }) => (
                    <div>
                        <div>{row.original.jail?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{row.original.jail?.code || ''}</div>
                    </div>
                ),
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => row.original.description || '-',
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
                    const dormitory = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditModal(dormitory)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => () => {
                                        setSelectedDormitory(dormitory);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dormitory Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Dormitory Management</h1>
                        <p className="text-muted-foreground">
                            Manage dormitories within jails
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Dormitory
                    </Button>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-500/10 p-4 text-green-600">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-destructive">{flash.error}</div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Dormitories</CardTitle>
                        <CardDescription>View and manage all dormitories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search dormitories..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <Select value={jailFilter} onValueChange={(value) => setJailFilter(value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by jail" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Jails</SelectItem>
                                    {jails.map((jail) => (
                                        <SelectItem key={jail.id} value={String(jail.id)}>
                                            {jail.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="juvenile">Juvenile</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DataTable
                            columns={columns}
                            data={dormitories.data}
                            pagination={{
                                currentPage: dormitories.current_page,
                                lastPage: dormitories.last_page,
                                perPage: dormitories.per_page,
                                total: dormitories.total,
                                onPageChange: (page) => {
                                    const params = new URLSearchParams();
                                    params.set('page', page.toString());
                                    if (jailFilter !== 'all') params.set('jail_id', jailFilter);
                                    if (typeFilter !== 'all') params.set('type', typeFilter);
                                    if (statusFilter !== 'all') params.set('status', statusFilter);
                                    router.get('/jail-officer/dormitories?' + params.toString(), {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                },
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Dormitory</DialogTitle>
                        <DialogDescription>Add a new dormitory to a jail</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="create_jail_id">Jail</Label>
                                <Select
                                    value={createForm.data.jail_id}
                                    onValueChange={(value) => createForm.setData('jail_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails.map((jail) => (
                                            <SelectItem key={jail.id} value={String(jail.id)}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.jail_id && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.jail_id}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_name">Name</Label>
                                <Input
                                    id="create_name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_type">Type</Label>
                                <Select
                                    value={createForm.data.type}
                                    onValueChange={(value) => createForm.setData('type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="juvenile">Juvenile</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {createForm.errors.type && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.type}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_description">Description</Label>
                                <textarea
                                    id="create_description"
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {createForm.errors.description && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.description}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_status">Status</Label>
                                <Select
                                    value={createForm.data.status}
                                    onValueChange={(value) => createForm.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {createForm.errors.status && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.status}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
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
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="edit_jail_id">Jail</Label>
                                <Select
                                    value={editForm.data.jail_id}
                                    onValueChange={(value) => editForm.setData('jail_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails.map((jail) => (
                                            <SelectItem key={jail.id} value={String(jail.id)}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editForm.errors.jail_id && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.jail_id}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_name">Name</Label>
                                <Input
                                    id="edit_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                />
                                {editForm.errors.name && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_type">Type</Label>
                                <Select
                                    value={editForm.data.type}
                                    onValueChange={(value) => editForm.setData('type', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="juvenile">Juvenile</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {editForm.errors.type && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.type}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_description">Description</Label>
                                <textarea
                                    id="edit_description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {editForm.errors.description && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.description}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_status">Status</Label>
                                <Select
                                    value={editForm.data.status}
                                    onValueChange={(value) => editForm.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {editForm.errors.status && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.status}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Update Dormitory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Dormitory</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedDormitory?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeleteSubmit}>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deleteForm.processing}>
                                Delete Dormitory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
