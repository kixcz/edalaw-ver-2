import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, MoreVertical, Plus, Search, Trash2, Edit, Archive } from 'lucide-react';
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
        title: 'Annex Management',
        href: '/jail-officer/annexes',
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
};

type Annex = {
    id: number;
    dormitory_id: number;
    name: string;
    description: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    dormitory: Dormitory;
};

type Props = {
    annexes: {
        data: Annex[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    jails: Jail[];
    dormitories: Dormitory[];
    filters: {
        dormitory_id: number | null;
        jail_id: number | null;
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

export default function AnnexManagement({ annexes, jails, dormitories, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState('');
    const [jailFilter, setJailFilter] = useState(filters.jail_id ? String(filters.jail_id) : 'all');
    const [dormitoryFilter, setDormitoryFilter] = useState(filters.dormitory_id ? String(filters.dormitory_id) : 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAnnex, setSelectedAnnex] = useState<Annex | null>(null);

    // Forms
    const createForm = useForm({
        dormitory_id: '',
        name: '',
        description: '',
        status: 'active',
    });

    const editForm = useForm({
        dormitory_id: '',
        name: '',
        description: '',
        status: 'active',
    });

    const deleteForm = useForm({});

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/jail-officer/annexes', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAnnex) return;
        
        editForm.put(`/jail-officer/annexes/${selectedAnnex.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedAnnex(null);
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAnnex) return;
        
        deleteForm.delete(`/jail-officer/annexes/${selectedAnnex.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedAnnex(null);
            },
        });
    };

    const openEditModal = (annex: Annex) => {
        setSelectedAnnex(annex);
        editForm.setData({
            dormitory_id: String(annex.dormitory_id),
            name: annex.name,
            description: annex.description || '',
            status: annex.status,
        });
        setIsEditModalOpen(true);
    };

    const columns: ColumnDef<Annex>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div className="font-medium">{row.original.name}</div>
                ),
            },
            {
                accessorKey: 'dormitory',
                header: 'Dormitory',
                cell: ({ row }) => (
                    <div>
                        <div>{row.original.dormitory?.name || 'No Dormitory'}</div>
                        <div className="text-sm text-muted-foreground">
                            Jail: {row.original.dormitory?.jail?.name || '-'}
                        </div>
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
                    const annex = row.original;
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
                                <DropdownMenuItem onClick={() => openEditModal(annex)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedAnnex(annex);
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

    // Filter dormitories based on selected jail
    const filteredDormitories = useMemo(() => {
        if (jailFilter === 'all') return dormitories;
        return dormitories.filter(d => String(d.jail_id) === jailFilter);
    }, [dormitories, jailFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Annex Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Annex Management</h1>
                        <p className="text-muted-foreground">
                            Manage annexes and buildings within dormitories
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Annex
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
                        <CardTitle>Annexes</CardTitle>
                        <CardDescription>View and manage all annexes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search annexes..."
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
                            <Select value={dormitoryFilter} onValueChange={(value) => setDormitoryFilter(value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by dormitory" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Dormitories</SelectItem>
                                    {filteredDormitories.map((dorm) => (
                                        <SelectItem key={dorm.id} value={String(dorm.id)}>
                                            {dorm.name}
                                        </SelectItem>
                                    ))}
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
                            data={annexes.data}
                            pagination={{
                                currentPage: annexes.current_page,
                                lastPage: annexes.last_page,
                                perPage: annexes.per_page,
                                total: annexes.total,
                                onPageChange: (page) => {
                                    const params = new URLSearchParams();
                                    params.set('page', page.toString());
                                    if (jailFilter !== 'all') params.set('jail_id', jailFilter);
                                    if (dormitoryFilter !== 'all') params.set('dormitory_id', dormitoryFilter);
                                    if (statusFilter !== 'all') params.set('status', statusFilter);
                                    router.get('/jail-officer/annexes?' + params.toString(), {
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
                        <DialogTitle>Create Annex</DialogTitle>
                        <DialogDescription>Add a new annex or building to a dormitory</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="create_jail_id">Jail</Label>
                                <Select
                                    value={jailFilter}
                                    onValueChange={(value) => {
                                        setJailFilter(value);
                                        setDormitoryFilter('all');
                                        createForm.setData('dormitory_id', '');
                                    }}
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
                            </div>
                            <div>
                                <Label htmlFor="create_dormitory_id">Dormitory</Label>
                                <Select
                                    value={createForm.data.dormitory_id}
                                    onValueChange={(value) => createForm.setData('dormitory_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a dormitory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredDormitories.map((dorm) => (
                                            <SelectItem key={dorm.id} value={String(dorm.id)}>
                                                {dorm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.dormitory_id && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.dormitory_id}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="create_name">Name</Label>
                                <Input
                                    id="create_name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="e.g., Annex 1, Building A"
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.name}</p>
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
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="edit_dormitory_id">Dormitory</Label>
                                <Select
                                    value={editForm.data.dormitory_id}
                                    onValueChange={(value) => editForm.setData('dormitory_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a dormitory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dormitories.map((dorm) => (
                                            <SelectItem key={dorm.id} value={String(dorm.id)}>
                                                {dorm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editForm.errors.dormitory_id && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.dormitory_id}</p>
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
                                Update Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Annex</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedAnnex?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDeleteSubmit}>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deleteForm.processing}>
                                Delete Annex
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
