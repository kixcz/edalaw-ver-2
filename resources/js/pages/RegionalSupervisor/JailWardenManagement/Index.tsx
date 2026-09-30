import React, { useState, useMemo } from 'react';
import { Shield, Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ActiveStatusBadge, StatusBadge } from '../../NationalOffice/Components/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsCards } from '../../NationalOffice/Components/AnalyticsCards';

export default function JailWardenIndex(props: any) {
    const { records, branches, jails, annexes, dormitories, analytics } = props;
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedWarden, setSelectedWarden] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState(props.filters?.search || '');

    const form = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        contact_number: '',
        branch_id: '',
        approval_status: 'pending',
        password: '',
        scope_type: 'none',
        scope_id: '',
    });

    const openCreateModal = () => {
        form.reset();
        form.setData({
            first_name: '', middle_name: '', last_name: '', email: '', contact_number: '', branch_id: '', approval_status: 'pending', password: '', scope_type: 'none', scope_id: ''
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (warden: any) => {
        setSelectedWarden(warden);
        form.setData({
            first_name: warden.first_name,
            middle_name: warden.middle_name || '',
            last_name: warden.last_name,
            email: warden.email,
            contact_number: warden.contact_number || '',
            branch_id: warden.branch_id?.toString() || '',
            approval_status: warden.approval_status || 'pending',
            password: '',
            scope_type: warden.scope_type || 'none',
            scope_id: warden.scope_id?.toString() || '',
        });
        setIsEditModalOpen(true);
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/regional-supervisor/wardens', {
            onSuccess: () => {
                form.reset();
                setIsCreateModalOpen(false);
            },
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/regional-supervisor/wardens/${selectedWarden.id}`, {
            onSuccess: () => {
                form.reset();
                setIsEditModalOpen(false);
            },
        });
    };

    const submitDelete = () => {
        if (!selectedWarden) return;
        router.delete(`/regional-supervisor/wardens/${selectedWarden.id}`, {
            onSuccess: () => setIsDeleteModalOpen(false),
        });
    };

    const columns = [
        {
            accessorKey: 'name',
            header: 'Warden',
            cell: ({ row }: any) => <div className="font-medium">{row.original.name}</div>
        },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'contact_number', header: 'Contact' },
        {
            accessorKey: 'branch.name',
            header: 'Branch',
            cell: ({ row }: any) => <div>{row.original.branch?.name}</div>
        },
        {
            accessorKey: 'active_status',
            header: 'Status',
            cell: ({ row }: any) => <ActiveStatusBadge value={row.original.active_status} />
        },
        {
            accessorKey: 'approval_status',
            header: 'Approval',
            cell: ({ row }: any) => <StatusBadge value={row.original.approval_status} />
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: any) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(row.original)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelectedWarden(row.original); setIsDeleteModalOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    const applySearch = () => {
        router.get('/regional-supervisor/wardens', { search: searchQuery }, { preserveState: true });
    };

    const handleScopeTypeChange = (type: string) => {
        form.setData(data => ({ ...data, scope_type: type, scope_id: '' }));
    };

    const scopeOptions = useMemo(() => {
        if (!form.data.branch_id) return [];
        if (form.data.scope_type === 'jail') return jails.filter((j: any) => j.branch_id.toString() === form.data.branch_id);
        if (form.data.scope_type === 'annex') return annexes.filter((a: any) => jails.find((j: any) => j.id === a.jail_id && j.branch_id.toString() === form.data.branch_id));
        if (form.data.scope_type === 'dormitory') return dormitories.filter((d: any) => {
            const annex = annexes.find((a: any) => a.id === d.annex_id);
            if (!annex) return false;
            return jails.find((j: any) => j.id === annex.jail_id && j.branch_id.toString() === form.data.branch_id);
        });
        return [];
    }, [form.data.branch_id, form.data.scope_type, jails, annexes, dormitories]);

    return (
        <AppLayout>
            <Head title="Jail Warden Management" />
            <div className="min-h-screen bg-muted">
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><Shield className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Jail Warden Management</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Manage wardens and assign scopes</p>
                            </div>
                        </div>
                        <Button onClick={openCreateModal} className="h-9">
                            <Plus className="h-4 w-4 mr-2" /> Create Warden
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {analytics && <AnalyticsCards analytics={analytics} />}

                    <Card className="border-0 shadow-sm">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-foreground">Warden Records</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{records.total} total wardens</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applySearch()} className="pl-9 w-64" />
                                </div>
                                <Button variant="outline" onClick={applySearch}>Search</Button>
                            </div>
                        </div>
                        <div className="p-6">
                            <DataTable columns={columns} data={records.data || []} pagination={{ currentPage: records.current_page, totalPages: records.last_page, perPage: records.per_page, total: records.total }} />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(v) => { if(!v){ setIsCreateModalOpen(false); setIsEditModalOpen(false); } }}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditModalOpen ? 'Edit Jail Warden' : 'Create Jail Warden'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={isEditModalOpen ? submitEdit : submitCreate}>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input value={form.data.first_name} onChange={e => form.setData('first_name', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input value={form.data.last_name} onChange={e => form.setData('last_name', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Number</Label>
                                <Input value={form.data.contact_number} onChange={e => form.setData('contact_number', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select value={form.data.branch_id} onValueChange={(val) => { form.setData(d => ({...d, branch_id: val, scope_type: 'none', scope_id: ''})); }}>
                                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                    <SelectContent>
                                        {branches?.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Approval Status</Label>
                                <Select value={form.data.approval_status} onValueChange={val => form.setData('approval_status', val)}>
                                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Password {isEditModalOpen && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}</Label>
                                <Input type="password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} required={!isEditModalOpen} />
                            </div>
                            <div className="space-y-2">
                                <Label>Scope Type</Label>
                                <Select disabled={!form.data.branch_id} value={form.data.scope_type} onValueChange={handleScopeTypeChange}>
                                    <SelectTrigger><SelectValue placeholder="No Specific Scope" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Branch-wide (No Scope)</SelectItem>
                                        <SelectItem value="jail">Specific Jail</SelectItem>
                                        <SelectItem value="annex">Specific Annex</SelectItem>
                                        <SelectItem value="dormitory">Specific Dormitory</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {form.data.scope_type !== 'none' && (
                                <div className="space-y-2">
                                    <Label>Select {form.data.scope_type}</Label>
                                    <Select value={form.data.scope_id} onValueChange={val => form.setData('scope_id', val)} required>
                                        <SelectTrigger><SelectValue placeholder={`Select ${form.data.scope_type}`} /></SelectTrigger>
                                        <SelectContent>
                                            {scopeOptions.map((opt: any) => (
                                                <SelectItem key={opt.id} value={opt.id.toString()}>{opt.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
                            <Button type="submit" disabled={form.processing}>{form.processing ? 'Saving...' : 'Save'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Warden</DialogTitle>
                        <DialogDescription>Are you sure you want to delete {selectedWarden?.name}? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={submitDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}