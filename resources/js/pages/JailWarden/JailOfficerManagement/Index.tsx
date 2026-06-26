import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, MoreVertical, UserCheck, Shield, Trash2 } from 'lucide-react';
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
        title: 'Jail Officer Management',
        href: '/jail-warden/officers',
    },
];

export default function JailOfficerManagement({ auth, officers, facilities }: any) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState<any>(null);

    const createForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const assignForm = useForm({
        jail_officer_id: '',
        scope_type: 'annex',
        annex_id: '',
        dormitory_id: '',
        cell_id: '',
    });

    const openCreateModal = () => {
        createForm.setData({
            first_name: '',
            middle_name: '',
            last_name: '',
            email: '',
            password: '',
            password_confirmation: '',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Creating jail officer:', createForm.data);
        router.post('/jail-warden/officers', createForm.data, {
            onSuccess: () => {
                console.log('Jail officer created successfully');
                createForm.reset();
                setIsCreateModalOpen(false);
            },
            onError: (error) => {
                console.error('Error creating jail officer:', error);
            },
        });
    };

    const openAssignModal = (officer: any) => {
        setSelectedOfficer(officer);
        assignForm.setData({
            jail_officer_id: officer.id,
            scope_type: 'annex',
            annex_id: '',
            dormitory_id: '',
            cell_id: '',
        });
        setIsAssignModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        router.post('/dashboard/jail-warden/officer-scopes', assignForm.data, {
            onSuccess: () => setIsAssignModalOpen(false),
        });
    };

    const handleDeactivate = (scopeId: number) => {
        if (confirm('Deactivate this scope assignment?')) {
            router.put(`/dashboard/jail-warden/officer-scopes/${scopeId}`, {
                is_active: false,
            }, {
                preserveScroll: true,
            });
        }
    };

    const handleDelete = (scopeId: number) => {
        if (confirm('Delete this scope assignment permanently?')) {
            router.delete(`/dashboard/jail-warden/officer-scopes/${scopeId}`, {
                preserveScroll: true,
            });
        }
    };

    const columns: ColumnDef<any>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Officer',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium">{row.original.name}</div>
                            <div className="text-xs text-muted-foreground">{row.original.email}</div>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'scopes',
                header: 'Assigned Scopes',
                cell: ({ row }) => {
                    const scopes = row.original.scopes || [];
                    if (scopes.length === 0) {
                        return <span className="text-muted-foreground">No scopes assigned</span>;
                    }
                    return (
                        <div className="space-y-1">
                            {scopes.map((scope: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {scope.scope_type === 'annex' && '🏢 Annex'}
                                        {scope.scope_type === 'dormitory' && '🛏️ Dormitory'}
                                        {scope.scope_type === 'cell' && '📍 Cell'}
                                    </Badge>
                                    <span className="text-sm">{scope.description}</span>
                                    {scope.is_active ? (
                                        <Badge variant="default" className="text-xs">Active</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                },
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
                            <DropdownMenuItem onClick={() => openAssignModal(row.original)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Assign Scope
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(row.original.scopes || []).map((scope: any) => (
                                <DropdownMenuItem
                                    key={scope.id}
                                    onClick={() => scope.is_active ? handleDeactivate(scope.id) : handleDelete(scope.id)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {scope.is_active ? `Deactivate ${scope.description}` : `Delete ${scope.description}`}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        []
    );

    return (
        <AppLayout user={auth.user} breadcrumbs={breadcrumbs}>
            <Head title="Jail Officer Management" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-6 w-6" />
                                        Jail Officer Management
                                    </CardTitle>
                                    <CardDescription>
                                        Manage jail officers under your branch
                                    </CardDescription>
                                </div>
                                <Button onClick={openCreateModal}>
                                    Create Jail Officer Account
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={columns}
                                data={officers || []}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Jail Officer Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Jail Officer Account</DialogTitle>
                        <DialogDescription>
                            Create a new jail officer account for your branch. The account will be automatically approved.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit}>
                        <div className="space-y-4 py-4">
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
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={createForm.data.email}
                                    onChange={(e) => createForm.setData('email', e.target.value)}
                                    placeholder="Enter email address"
                                />
                                {createForm.errors.email && (
                                    <p className="text-sm text-red-600">{createForm.errors.email}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={createForm.data.password}
                                    onChange={(e) => createForm.setData('password', e.target.value)}
                                    placeholder="Enter password (min 8 characters)"
                                />
                                {createForm.errors.password && (
                                    <p className="text-sm text-red-600">{createForm.errors.password}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={createForm.data.password_confirmation}
                                    onChange={(e) => createForm.setData('password_confirmation', e.target.value)}
                                    placeholder="Confirm password"
                                />
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
                                Create Account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Scope Modal */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Facility Scope</DialogTitle>
                        <DialogDescription>
                            {selectedOfficer?.name && `Assign a facility scope to ${selectedOfficer.name}`}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Warning if officer already has an active scope */}
                    {selectedOfficer?.scopes?.some((s: any) => s.is_active) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-amber-900 mb-1">Active Scope Detected</h4>
                                    <p className="text-sm text-amber-800">
                                        This officer already has an active scope. Assigning a new scope will automatically replace the existing one.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <input type="hidden" name="jail_officer_id" value={assignForm.data.jail_officer_id} />
                            
                            <div className="space-y-2">
                                <Label htmlFor="scope_type">Scope Type</Label>
                                <Select
                                    value={assignForm.data.scope_type}
                                    onValueChange={(value) => {
                                        assignForm.setData('scope_type', value);
                                        assignForm.setData('annex_id', '');
                                        assignForm.setData('dormitory_id', '');
                                        assignForm.setData('cell_id', '');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select scope type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="annex">Annex</SelectItem>
                                        <SelectItem value="dormitory">Dormitory</SelectItem>
                                        <SelectItem value="cell">Cell</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {assignForm.data.scope_type === 'annex' && (
                                <div className="space-y-2">
                                    <Label htmlFor="annex_id">Select Annex</Label>
                                    <Select
                                        value={assignForm.data.annex_id}
                                        onValueChange={(value) => assignForm.setData('annex_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose annex" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {facilities.annexes.map((annex: any) => (
                                                <SelectItem key={annex.id} value={annex.id.toString()}>
                                                    {annex.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {assignForm.data.scope_type === 'dormitory' && (
                                <div className="space-y-2">
                                    <Label htmlFor="dormitory_id">Select Dormitory</Label>
                                    <Select
                                        value={assignForm.data.dormitory_id}
                                        onValueChange={(value) => assignForm.setData('dormitory_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose dormitory" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {facilities.dormitories.map((dorm: any) => (
                                                <SelectItem key={dorm.id} value={dorm.id.toString()}>
                                                    {dorm.name} ({dorm.annex_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {assignForm.data.scope_type === 'cell' && (
                                <div className="space-y-2">
                                    <Label htmlFor="cell_id">Select Cell</Label>
                                    <Select
                                        value={assignForm.data.cell_id}
                                        onValueChange={(value) => assignForm.setData('cell_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose cell" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {facilities.cells.map((cell: any) => (
                                                <SelectItem key={cell.id} value={cell.id.toString()}>
                                                    {cell.cell_number} - {cell.dormitory_name} ({cell.annex_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAssignModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={assignForm.processing}>
                                Assign Scope
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
