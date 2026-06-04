import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, MoreVertical, Plus, Search, Trash2, Edit, MapPin, Warehouse } from 'lucide-react';
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
        title: 'Jail Management',
        href: '/jail-officer/jails',
    },
];

type Jail = {
    id: number;
    name: string;
    code: string;
    location: string | null;
    description: string | null;
    status: 'active' | 'inactive';
    dormitories_count: number;
    annexes_count: number;
    created_at: string;
};

type Props = {
    jails: {
        data: Jail[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
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

export default function JailManagement({ jails, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedJail, setSelectedJail] = useState<Jail | null>(null);

    // Forms
    const createForm = useForm({
        name: '',
        code: '',
        location: '',
        description: '',
        status: 'active',
    });

    const editForm = useForm({
        name: '',
        code: '',
        location: '',
        description: '',
        status: 'active',
    });

    const deleteForm = useForm({});

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/jail-officer/jails', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJail) return;
        
        editForm.put(`/jail-officer/jails/${selectedJail.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedJail(null);
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJail) return;
        
        deleteForm.delete(`/jail-officer/jails/${selectedJail.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedJail(null);
            },
        });
    };

    const openEditModal = (jail: Jail) => {
        setSelectedJail(jail);
        editForm.setData({
            name: jail.name,
            code: jail.code,
            location: jail.location || '',
            description: jail.description || '',
            status: jail.status,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (jail: Jail) => {
        setSelectedJail(jail);
        setIsDeleteModalOpen(true);
    };

    const columns: ColumnDef<Jail>[] = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'Code',
                cell: ({ row }) => (
                    <div className="font-medium">{row.original.code}</div>
                ),
            },
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.name}</div>
                        {row.original.location && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {row.original.location}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'dormitories_count',
                header: 'Dormitories',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{row.original.dormitories_count}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'annexes_count',
                header: 'Annexes',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground"><Warehouse className="h-4 w-4" /></span>
                        <span>{row.original.annexes_count}</span>
                    </div>
                ),
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
                    const jail = row.original;
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
                                <DropdownMenuItem onClick={() => router.visit(`/jail-officer/jails/${jail.id}`)}>
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditModal(jail)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => openDeleteModal(jail)}
                                    className="text-destructive"
                                    disabled={jail.dormitories_count > 0}
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
            <Head title="Jail Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Jail Management</h1>
                        <p className="text-muted-foreground">
                            Manage jails and their hierarchical structure
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Jail
                    </Button>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-500/10 p-4 text-green-600">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                        {flash.error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Jails</CardTitle>
                        <CardDescription>
                            View and manage all jails
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search jails..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
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
                            data={jails.data}
                            pagination={{
                                currentPage: jails.current_page,
                                lastPage: jails.last_page,
                                perPage: jails.per_page,
                                total: jails.total,
                                onPageChange: (page) => {
                                    const params = new URLSearchParams();
                                    params.set('page', page.toString());
                                    if (searchQuery) params.set('search', searchQuery);
                                    if (statusFilter !== 'all') params.set('status', statusFilter);
                                    router.get('/jail-officer/jails?' + params.toString(), {
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
                        <DialogTitle>Create Jail</DialogTitle>
                        <DialogDescription>
                            Add a new jail to the system
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="create_name">Name</Label>
                                <Input
                                    id="create_name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="e.g., Digos City Jail"
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_code">Code</Label>
                                <Input
                                    id="create_code"
                                    value={createForm.data.code}
                                    onChange={(e) => createForm.setData('code', e.target.value)}
                                    placeholder="e.g., DCJ"
                                />
                                {createForm.errors.code && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.code}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_location">Location</Label>
                                <Input
                                    id="create_location"
                                    value={createForm.data.location}
                                    onChange={(e) => createForm.setData('location', e.target.value)}
                                    placeholder="e.g., Davao del Sur"
                                />
                                {createForm.errors.location && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.location}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_description">Description</Label>
                                <textarea
                                    id="create_description"
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Optional description"
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
                                Create Jail
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Jail</DialogTitle>
                        <DialogDescription>
                            Update jail information
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4 py-4">
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
                                <Label htmlFor="edit_code">Code</Label>
                                <Input
                                    id="edit_code"
                                    value={editForm.data.code}
                                    onChange={(e) => editForm.setData('code', e.target.value)}
                                />
                                {editForm.errors.code && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.code}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_location">Location</Label>
                                <Input
                                    id="edit_location"
                                    value={editForm.data.location}
                                    onChange={(e) => editForm.setData('location', e.target.value)}
                                />
                                {editForm.errors.location && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.location}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_description">Description</Label>
                                <textarea
                                    id="edit_description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                Update Jail
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Jail</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedJail?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeleteSubmit}>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deleteForm.processing}>
                                Delete Jail
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
