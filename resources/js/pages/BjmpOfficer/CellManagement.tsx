import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, MoreVertical, Plus, Search, Trash2, Edit, Users } from 'lucide-react';
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
        title: 'Cell Management',
        href: '/bjmp-officer/cells',
    },
];

type Cell = {
    id: number;
    cell_number: string;
    capacity: number;
    status: 'active' | 'inactive';
    inmates_count: number;
    created_at: string;
    annex?: {
        id: number;
        name: string;
        dormitory_id: number;
        dormitory?: {
            id: number;
            name: string;
            jail_id: number;
            jail?: {
                id: number;
                name: string;
                code: string;
            };
        };
    };
};

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
};

type Props = {
    cells: {
        data: Cell[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    jails: Jail[];
    dormitories: Dormitory[];
    annexes: Annex[];
    filters: {
        search: string;
        annex_id: number | null;
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

export default function CellManagement({ cells, jails = [], dormitories = [], annexes = [], filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const [jailFilter, setJailFilter] = useState(filters.jail_id ? String(filters.jail_id) : 'all');
    const [dormitoryFilter, setDormitoryFilter] = useState(filters.dormitory_id ? String(filters.dormitory_id) : 'all');
    const [annexFilter, setAnnexFilter] = useState(filters.annex_id ? String(filters.annex_id) : 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);

    // Forms
    const createForm = useForm({
        jail_id: '',
        dormitory_id: '',
        annex_id: '',
        cell_number: '',
        capacity: 4,
        status: 'active',
    });

    const editForm = useForm({
        jail_id: '',
        dormitory_id: '',
        annex_id: '',
        cell_number: '',
        capacity: 4,
        status: 'active',
    });

    const deleteForm = useForm({});

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (jailFilter !== 'all') params.set('jail_id', jailFilter);
        if (dormitoryFilter !== 'all') params.set('dormitory_id', dormitoryFilter);
        if (annexFilter !== 'all') params.set('annex_id', annexFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        router.get('/bjmp-officer/cells?' + params.toString(), { preserveState: true, preserveScroll: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/bjmp-officer/cells', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCell) return;
        editForm.put(`/bjmp-officer/cells/${selectedCell.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedCell(null);
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCell) return;
        deleteForm.delete(`/bjmp-officer/cells/${selectedCell.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedCell(null);
            },
        });
    };

    const openEditModal = (cell: Cell) => {
        setSelectedCell(cell);
        editForm.setData({
            annex_id: cell.annex?.id ? String(cell.annex.id) : '',
            cell_number: cell.cell_number,
            capacity: cell.capacity,
            status: cell.status,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (cell: Cell) => {
        setSelectedCell(cell);
        setIsDeleteModalOpen(true);
    };

    const columns: ColumnDef<Cell>[] = useMemo(
        () => [
            {
                accessorKey: 'annex',
                header: 'Location',
                cell: ({ row }) => (
                    <div className="text-sm">
                        <div className="font-medium">{row.original.annex?.name || 'N/A'}</div>
                        <div className="text-muted-foreground">
                            {row.original.annex?.dormitory?.name || ''}
                            {row.original.annex?.dormitory?.jail?.name ? ` (${row.original.annex.dormitory.jail.name})` : ''}
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'cell_number',
                header: 'Cell Number',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{row.original.cell_number}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'capacity',
                header: 'Capacity',
                cell: ({ row }) => (
                    <span>{row.original.capacity} inmates</span>
                ),
            },
            {
                accessorKey: 'inmates_count',
                header: 'Current Inmates',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                            {row.original.inmates_count} / {row.original.capacity}
                        </span>
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
                    const cell = row.original;
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
                                <DropdownMenuItem onClick={() => openEditModal(cell)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => openDeleteModal(cell)}
                                    className="text-destructive"
                                    disabled={cell.inmates_count > 0}
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
            <Head title="Cell Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Cell Management</h1>
                        <p className="text-muted-foreground">
                            Manage prison cells and their capacity
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Cell
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
                        <CardTitle>Cells</CardTitle>
                        <CardDescription>
                            View and manage all prison cells
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search cells..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <Select value={jailFilter} onValueChange={(value) => { setJailFilter(value); setDormitoryFilter('all'); setAnnexFilter('all'); handleSearch(); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by jail" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Jails</SelectItem>
                                    {jails?.map((jail) => (
                                        <SelectItem key={jail.id} value={String(jail.id)}>
                                            {jail.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={dormitoryFilter} onValueChange={(value) => { setDormitoryFilter(value); setAnnexFilter('all'); handleSearch(); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by dormitory" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Dormitories</SelectItem>
                                    {dormitories?.filter(d => jailFilter === 'all' || String(d.jail_id) === jailFilter).map((dorm) => (
                                        <SelectItem key={dorm.id} value={String(dorm.id)}>
                                            {dorm.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={annexFilter} onValueChange={(value) => { setAnnexFilter(value); handleSearch(); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by annex" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Annexes</SelectItem>
                                    {annexes?.filter(a => dormitoryFilter === 'all' || String(a.dormitory_id) === dormitoryFilter).map((annex) => (
                                        <SelectItem key={annex.id} value={String(annex.id)}>
                                            {annex.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleSearch(); }}>
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
                            data={cells.data}
                            enableGlobalFilter={false}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Cell</DialogTitle>
                        <DialogDescription>
                            Create a new prison cell
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="create_jail">Jail</Label>
                                <Select
                                    value={createForm.data.jail_id || ''}
                                    onValueChange={(value) => {
                                        createForm.setData('jail_id', value);
                                        createForm.setData('dormitory_id', '');
                                        createForm.setData('annex_id', '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails?.map((jail) => (
                                            <SelectItem key={jail.id} value={String(jail.id)}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create_dormitory">Dormitory</Label>
                                <Select
                                    value={createForm.data.dormitory_id || ''}
                                    onValueChange={(value) => {
                                        createForm.setData('dormitory_id', value);
                                        createForm.setData('annex_id', '');
                                    }}
                                    disabled={!createForm.data.jail_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a dormitory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dormitories
                                            ?.filter(d => !createForm.data.jail_id || String(d.jail_id) === createForm.data.jail_id)
                                            .map((dorm) => (
                                                <SelectItem key={dorm.id} value={String(dorm.id)}>
                                                    {dorm.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create_annex">Annex/Building</Label>
                                <Select
                                    value={createForm.data.annex_id}
                                    onValueChange={(value) => createForm.setData('annex_id', value)}
                                    disabled={!createForm.data.dormitory_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an annex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {annexes
                                            ?.filter(a => !createForm.data.dormitory_id || String(a.dormitory_id) === createForm.data.dormitory_id)
                                            .map((annex) => (
                                                <SelectItem key={annex.id} value={String(annex.id)}>
                                                    {annex.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.annex_id && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.annex_id}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="cell_number">Cell Number</Label>
                                <Input
                                    id="cell_number"
                                    value={createForm.data.cell_number}
                                    onChange={(e) => createForm.setData('cell_number', e.target.value)}
                                    placeholder="e.g., Cell 1, A-101"
                                />
                                {createForm.errors.cell_number && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.cell_number}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="capacity">Capacity</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={createForm.data.capacity}
                                    onChange={(e) => createForm.setData('capacity', parseInt(e.target.value))}
                                />
                                {createForm.errors.capacity && (
                                    <p className="text-sm text-destructive mt-1">{createForm.errors.capacity}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={createForm.data.status}
                                    onValueChange={(value) => createForm.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                        <DialogDescription>
                            Update cell details
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="edit_jail">Jail</Label>
                                <Select
                                    value={editForm.data.jail_id || String(selectedCell?.annex?.dormitory?.jail_id || '')}
                                    onValueChange={(value) => {
                                        editForm.setData('jail_id', value);
                                        editForm.setData('dormitory_id', '');
                                        editForm.setData('annex_id', '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a jail" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jails?.map((jail) => (
                                            <SelectItem key={jail.id} value={String(jail.id)}>
                                                {jail.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit_dormitory">Dormitory</Label>
                                <Select
                                    value={editForm.data.dormitory_id || String(selectedCell?.annex?.dormitory_id || '')}
                                    onValueChange={(value) => {
                                        editForm.setData('dormitory_id', value);
                                        editForm.setData('annex_id', '');
                                    }}
                                    disabled={!editForm.data.jail_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a dormitory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dormitories
                                            .filter(d => !editForm.data.jail_id || String(d.jail_id) === editForm.data.jail_id)
                                            .map((dorm) => (
                                                <SelectItem key={dorm.id} value={String(dorm.id)}>
                                                    {dorm.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit_annex">Annex/Building</Label>
                                <Select
                                    value={editForm.data.annex_id}
                                    onValueChange={(value) => editForm.setData('annex_id', value)}
                                    disabled={!editForm.data.dormitory_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an annex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {annexes
                                            .filter(a => !editForm.data.dormitory_id || String(a.dormitory_id) === editForm.data.dormitory_id)
                                            .map((annex) => (
                                                <SelectItem key={annex.id} value={String(annex.id)}>
                                                    {annex.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {editForm.errors.annex_id && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.annex_id}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_cell_number">Cell Number</Label>
                                <Input
                                    id="edit_cell_number"
                                    value={editForm.data.cell_number}
                                    onChange={(e) => editForm.setData('cell_number', e.target.value)}
                                />
                                {editForm.errors.cell_number && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.cell_number}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_capacity">Capacity</Label>
                                <Input
                                    id="edit_capacity"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={editForm.data.capacity}
                                    onChange={(e) => editForm.setData('capacity', parseInt(e.target.value))}
                                />
                                {editForm.errors.capacity && (
                                    <p className="text-sm text-destructive mt-1">{editForm.errors.capacity}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="edit_status">Status</Label>
                                <Select
                                    value={editForm.data.status}
                                    onValueChange={(value) => editForm.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
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
                                Update Cell
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Cell</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedCell?.cell_number}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCell && selectedCell.inmates_count > 0 && (
                        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
                            This cell has {selectedCell.inmates_count} inmate(s). Please transfer all inmates before deleting.
                        </div>
                    )}
                    <form onSubmit={handleDeleteSubmit}>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={deleteForm.processing || (selectedCell?.inmates_count ?? 0) > 0}
                            >
                                Delete Cell
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
