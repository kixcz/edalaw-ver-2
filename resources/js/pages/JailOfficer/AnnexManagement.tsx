import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, Plus, Pencil, Trash2, MoreVertical, List, BarChart2, CheckCircle2, LayoutGrid } from 'lucide-react';

type Jail = { id: number; name: string; code: string };
type Annex = {
    id: number; jail_id: number; name: string; description: string | null;
    status: 'active' | 'inactive'; created_at: string; jail: Jail;
    dormitories_count?: number; cells_count?: number;
};

interface Props {
    annexes: { data: Annex[]; current_page: number; last_page: number; per_page: number; total: number };
    jails: Jail[];
    stats: { total_annexes: number; active_annexes: number; total_dormitories: number; total_cells: number; total_pdls: number };
    chartData: { annexes_by_jail: { name: string; annexes: number }[]; occupancy_by_annex: { name: string; capacity: number; occupied: number }[] };
    filters: { jail_id: number | null; status: string };
}

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

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        inactive: 'bg-muted text-muted-foreground border-border',
    };
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
            {status}
        </span>
    );
};

export default function AnnexManagement({ annexes, jails, stats, chartData, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [jailFilter, setJailFilter] = useState(filters.jail_id ? String(filters.jail_id) : 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Annex | null>(null);

    const createForm = useForm({ jail_id: '', name: '', description: '', status: 'active' });
    const editForm = useForm({ jail_id: '', name: '', description: '', status: 'active' });
    const deleteForm = useForm({});

    const applyFilters = () => {
        router.get('/jail-officer/annexes', {
            status: statusFilter !== 'all' ? statusFilter : '',
            jail_id: jailFilter !== 'all' ? jailFilter : '',
        }, { preserveState: true, preserveScroll: true });
    };

    const openCreate = () => { setSelected(null); createForm.reset(); setIsCreateOpen(true); };
    const openEdit = (a: Annex) => {
        setSelected(a);
        editForm.setData({ jail_id: String(a.jail_id), name: a.name, description: a.description ?? '', status: a.status });
        setIsEditOpen(true);
    };
    const openDelete = (a: Annex) => { setSelected(a); setIsDeleteOpen(true); };

    return (
        <AppLayout>
            <Head title="Building Management" />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><Building2 className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Building Management</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Manage facility buildings and annexes</p>
                            </div>
                        </div>
                        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5 text-sm">
                            <Plus className="w-4 h-4" />Add Building
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {flash?.success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{flash.success}</div>
                    )}
                    {flash?.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{flash.error}</div>
                    )}

                    {/* Stats */}
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Building2 className="w-5 h-5" />} value={stats.total_annexes} label="Total Buildings" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_annexes} label="Active Buildings" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<LayoutGrid className="w-5 h-5" />} value={stats.total_dormitories} label="Dormitories" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<Building2 className="w-5 h-5" />} value={stats.total_cells} label="Total Cells" accent="bg-sky-600" iconBg="bg-sky-50" iconColor="text-sky-600" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Buildings
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        {/* Records Tab */}
                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Building Records</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{annexes.total} buildings total</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={jailFilter} onValueChange={(v) => { setJailFilter(v); setTimeout(() => router.get('/jail-officer/annexes', { jail_id: v !== 'all' ? v : '', status: statusFilter !== 'all' ? statusFilter : '' }, { preserveState: true, preserveScroll: true }), 0); }}>
                                            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Jails" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Jails</SelectItem>{jails.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTimeout(() => router.get('/jail-officer/annexes', { jail_id: jailFilter !== 'all' ? jailFilter : '', status: v !== 'all' ? v : '' }, { preserveState: true, preserveScroll: true }), 0); }}>
                                            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-6">Name</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jail</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Dorms</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cells</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {annexes.data.map((a) => (
                                                <TableRow key={a.id} className="hover:bg-muted/50 transition-colors group">
                                                    <TableCell className="pl-6"><span className="font-semibold text-foreground text-sm">{a.name}</span></TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{a.jail?.name ?? '—'}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{a.dormitories_count ?? 0}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{a.cells_count ?? 0}</TableCell>
                                                    <TableCell>{statusBadge(a.status)}</TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem onClick={() => openEdit(a)} className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white">
                                                                        <Pencil className="h-4 w-4" /><span>Edit</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openDelete(a)} className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white">
                                                                        <Trash2 className="h-4 w-4" /><span>Delete</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {annexes.data.length === 0 && (
                                                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No buildings found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {annexes.last_page > 1 && (
                                    <div className="px-6 pb-4 flex items-center justify-between pt-4 border-t border-border">
                                        <p className="text-sm text-muted-foreground">Page {annexes.current_page} of {annexes.last_page} ({annexes.total} total)</p>
                                        <div className="flex gap-1">
                                            {annexes.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/annexes?page=${annexes.current_page - 1}`)}>Previous</Button>}
                                            {annexes.current_page < annexes.last_page && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/annexes?page=${annexes.current_page + 1}`)}>Next</Button>}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        {/* Analytics Tab */}
                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Buildings by Jail</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of buildings across jails</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.annexes_by_jail} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }} />
                                                <Bar dataKey="annexes" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Occupancy by Building</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Capacity vs occupied beds per building</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.occupancy_by_annex} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }} />
                                                <Bar dataKey="capacity" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Capacity" />
                                                <Bar dataKey="occupied" fill="#10b981" radius={[4, 4, 0, 0]} name="Occupied" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Building</DialogTitle>
                            <DialogDescription>Add a new building/annex to the facility.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/jail-officer/annexes', { onSuccess: () => setIsCreateOpen(false) }); }}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Jail</Label>
                                    <Select value={createForm.data.jail_id} onValueChange={(v) => createForm.setData('jail_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select jail" /></SelectTrigger>
                                        <SelectContent>{jails.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {createForm.errors.jail_id && <p className="text-xs text-destructive mt-1">{createForm.errors.jail_id}</p>}
                                </div>
                                <div className="space-y-2"><Label>Name</Label><Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} placeholder="Building name" required /></div>
                                <div className="space-y-2"><Label>Description</Label><Input value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} placeholder="Optional" /></div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing} className="bg-primary hover:bg-primary/90 text-white">{createForm.processing ? 'Saving...' : 'Create Building'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit Modal */}
            {isEditOpen && selected && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit Building</DialogTitle>
                            <DialogDescription>Update the building information and status.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); editForm.put(`/jail-officer/annexes/${selected.id}`, { onSuccess: () => setIsEditOpen(false) }); }}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Jail</Label>
                                    <Select value={editForm.data.jail_id} onValueChange={(v) => editForm.setData('jail_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select jail" /></SelectTrigger>
                                        <SelectContent>{jails.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Name</Label><Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Description</Label><Input value={editForm.data.description} onChange={(e) => editForm.setData('description', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Status</Label>
                                    <Select value={editForm.data.status} onValueChange={(v) => editForm.setData('status', v as 'active' | 'inactive')}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={editForm.processing} className="bg-primary hover:bg-primary/90 text-white">{editForm.processing ? 'Saving...' : 'Save Changes'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && selected && (
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Delete Building</DialogTitle>
                            <DialogDescription>This action cannot be undone. The building and its associations will be permanently removed.</DialogDescription>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{selected.name}</strong>?</p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button type="button" variant="destructive" disabled={deleteForm.processing} onClick={() => deleteForm.delete(`/jail-officer/annexes/${selected.id}`, { onSuccess: () => setIsDeleteOpen(false) })}>
                                {deleteForm.processing ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
