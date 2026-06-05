import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, Plus, Search } from 'lucide-react';
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
        title: 'PDL Management',
        href: '/jail-warden/pdls',
    },
];

export default function PdlManagement({ auth, inmates, cells }: any) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const createForm = useForm({
        inmate_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        cell_id: '',
    });

    const openCreateModal = () => {
        createForm.setData({
            inmate_number: '',
            first_name: '',
            middle_name: '',
            last_name: '',
            date_of_birth: '',
            cell_id: '',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Creating PDL:', createForm.data);
        router.post('/jail-warden/pdls', createForm.data, {
            onSuccess: () => {
                console.log('PDL created successfully');
                createForm.reset();
                setIsCreateModalOpen(false);
            },
            onError: (error) => {
                console.error('Error creating PDL:', error);
            },
        });
    };

    const columns: ColumnDef<any>[] = useMemo(
        () => [
            {
                accessorKey: 'inmate_number',
                header: 'PDL Number',
                cell: ({ row }) => (
                    <div className="font-mono text-sm">{row.original.inmate_number}</div>
                ),
            },
            {
                accessorKey: 'full_name',
                header: 'Full Name',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">
                            {row.original.last_name}, {row.original.first_name}
                        </div>
                        {row.original.middle_name && (
                            <div className="text-xs text-muted-foreground">
                                {row.original.middle_name}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'date_of_birth',
                header: 'Date of Birth',
                cell: ({ row }) => {
                    const dob = row.original.date_of_birth;
                    if (!dob) return <span className="text-muted-foreground">N/A</span>;
                    
                    const age = new Date().getFullYear() - new Date(dob).getFullYear();
                    return (
                        <div>
                            <div>{new Date(dob).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                                {age} years old
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge 
                        variant={row.original.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                    >
                        {row.original.status}
                    </Badge>
                ),
            },
            {
                accessorKey: 'location',
                header: 'Location',
                cell: ({ row }) => {
                    const location = row.original.cell;
                    if (!location) {
                        return <span className="text-muted-foreground">Not assigned</span>;
                    }
                    
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">📍 Cell:</span>
                                <span className="text-xs">{location.cell_number}</span>
                            </div>
                            {location.annex && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">🏛️ Annex:</span>
                                    <span className="text-xs">{location.annex.name}</span>
                                </div>
                            )}
                            {location.annex?.dormitory && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">🏢 Dorm:</span>
                                    <span className="text-xs">{location.annex.dormitory.name}</span>
                                </div>
                            )}
                            {location.annex?.dormitory?.jail && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">🏪 Jail:</span>
                                    <span className="text-xs">{location.annex.dormitory.jail.name}</span>
                                </div>
                            )}
                        </div>
                    );
                },
            },
        ],
        []
    );

    return (
        <AppLayout user={auth.user} breadcrumbs={breadcrumbs}>
            <Head title="PDL Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-6 w-6" />
                                        PDL Management
                                    </CardTitle>
                                    <CardDescription>
                                        Manage Persons Deprived of Liberty in your branch
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button onClick={openCreateModal}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add PDL
                                    </Button>
                                    <div className="w-64">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by name or number..."
                                                value={globalFilter}
                                                onChange={(e) => setGlobalFilter(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={columns}
                                data={inmates.data || []}
                                pagination={{
                                    currentPage: inmates.current_page,
                                    totalPages: inmates.last_page,
                                    perPage: inmates.per_page,
                                    total: inmates.total,
                                }}
                                globalFilter={globalFilter}
                                onGlobalFilterChange={setGlobalFilter}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create PDL Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New PDL</DialogTitle>
                        <DialogDescription>
                            Add a new Person Deprived of Liberty to your branch and assign them to a cell.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="inmate_number">PDL Number</Label>
                                    <Input
                                        id="inmate_number"
                                        value={createForm.data.inmate_number}
                                        onChange={(e) => createForm.setData('inmate_number', e.target.value)}
                                        placeholder="Enter PDL number"
                                    />
                                    {createForm.errors.inmate_number && (
                                        <p className="text-sm text-red-600">{createForm.errors.inmate_number}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        value={createForm.data.date_of_birth}
                                        onChange={(e) => createForm.setData('date_of_birth', e.target.value)}
                                    />
                                    {createForm.errors.date_of_birth && (
                                        <p className="text-sm text-red-600">{createForm.errors.date_of_birth}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={createForm.data.first_name}
                                        onChange={(e) => createForm.setData('first_name', e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                    {createForm.errors.first_name && (
                                        <p className="text-sm text-red-600">{createForm.errors.first_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={createForm.data.last_name}
                                        onChange={(e) => createForm.setData('last_name', e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                    {createForm.errors.last_name && (
                                        <p className="text-sm text-red-600">{createForm.errors.last_name}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="middle_name">Middle Name</Label>
                                <Input
                                    id="middle_name"
                                    value={createForm.data.middle_name}
                                    onChange={(e) => createForm.setData('middle_name', e.target.value)}
                                    placeholder="Enter middle name (optional)"
                                />
                                {createForm.errors.middle_name && (
                                    <p className="text-sm text-red-600">{createForm.errors.middle_name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cell_id">Assign to Cell</Label>
                                <Select
                                    value={createForm.data.cell_id}
                                    onValueChange={(value) => createForm.setData('cell_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a cell" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(cells || []).map((cell: any) => (
                                            <SelectItem key={cell.id} value={cell.value}>
                                                {cell.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.cell_id && (
                                    <p className="text-sm text-red-600">{createForm.errors.cell_id}</p>
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
                            <Button type="submit" disabled={createForm.processing}>
                                Add PDL
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
