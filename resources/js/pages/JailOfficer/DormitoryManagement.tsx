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
import { BedDouble, Plus, Pencil, Trash2, MoreVertical, List, BarChart2, CheckCircle2, Grid3X3, Users } from 'lucide-react';

type Jail = { id: number; name: string; code: string };
type Annex = { id: number; jail_id: number; name: string };
type Dormitory = {
    id: number; annex_id: number; name: string; type: string; description: string | null;
    status: 'active' | 'inactive'; created_at: string; annex: Annex;
    cells_count?: number; inmates_count?: number;
};

interface Props {
    dormitories: { data: Dormitory[]; current_page: number; last_page: number; per_page: number; total: number };
    jails: Jail[];
    annexes: Annex[];
    stats: { total_dormitories: number; active_dormitories: number; total_cells: number; total_pdls: number };
    chartData: { dormitories_by_type: { type: string; count: number }[]; occupancy_by_dormitory: { name: string; capacity: number; occupied: number }[] };
    filters: { annex_id: number | null; jail_id: number | null; type: string; status: string };
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
    const map: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', inactive: 'bg-muted text-muted-foreground border-border' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>;
};

export default function DormitoryManagement({ dormitories, jails, annexes, stats, chartData, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [annexFilter, setAnnexFilter] = useState(filters.annex_id ? String(filters.annex_id) : 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Dormitory | null>(null);

    const createForm = useForm({ annex_id: '', name: '', type: '', description: '', status: 'active' });
    const editForm = useForm({ annex_id: '', name: '', type: '', description: '', status: 'active' });
    const deleteForm = useForm({});

    const openCreate = () => { setSelected(null); createForm.reset(); setIsCreateOpen(true); };
    const openEdit = (d: Dormitory) => {
        setSelected(d);
        editForm.setData({ annex_id: String(d.annex_id), name: d.name, type: d.type, description: d.description ?? '', status: d.status });
        setIsEditOpen(true);
    };
    const openDelete = (d: Dormitory) => { setSelected(d); setIsDeleteOpen(true); };

    return (
        <AppLayout user={{ first_name: '', last_name: '', middle_name: '', role: { name: 'Jail Officer' } }}>
            <Head title="Dormitory Management" />
            <div className="min-h-screen bg-background">
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl"><BedDouble className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Dormitory Management</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Manage facility dormitories</p>
                            </div>
                        </div>
                        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5 text-sm">
                            <Plus className="w-4 h-4" />Add Dormitory
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{flash.success}</div>}
                    {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{flash.error}</div>}

                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<BedDouble className="w-5 h-5" />} value={stats.total_dormitories} label="Total Dormitories" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_dormitories} label="Active Dormitories" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<Grid3X3 className="w-5 h-5" />} value={stats.total_cells} label="Total Cells" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.total_pdls} label="Total PDLs" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <List className="w-4 h-4" />Dormitories
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Dormitory Records</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{dormitories.total} dormitories total</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={annexFilter} onValueChange={(v) => { setAnnexFilter(v); router.get('/jail-officer/dormitories', { annex_id: v !== 'all' ? v : '', type: typeFilter !== 'all' ? typeFilter : '', status: statusFilter !== 'all' ? statusFilter : '' }, { preserveState: true, preserveScroll: true }); }}>
                                            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Buildings" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Buildings</SelectItem>{annexes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); router.get('/jail-officer/dormitories', { annex_id: annexFilter !== 'all' ? annexFilter : '', type: typeFilter !== 'all' ? typeFilter : '', status: v !== 'all' ? v : '' }, { preserveState: true, preserveScroll: true }); }}>
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
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Building</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cells</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dormitories.data.map((d) => (
                                                <TableRow key={d.id} className="hover:bg-muted/50 transition-colors group">
                                                    <TableCell className="pl-6"><span className="font-semibold text-foreground text-sm">{d.name}</span></TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{d.annex?.name ?? '—'}</TableCell>
                                                    <TableCell><span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200 capitalize">{d.type}</span></TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-foreground">{d.cells_count ?? 0}</TableCell>
                                                    <TableCell>{statusBadge(d.status)}</TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem onClick={() => openEdit(d)} className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"><Pencil className="h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openDelete(d)} className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"><Trash2 className="h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {dormitories.data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No dormitories found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                                {dormitories.last_page > 1 && (
                                    <div className="px-6 pb-4 flex items-center justify-between pt-4 border-t border-border">
                                        <p className="text-sm text-muted-foreground">Page {dormitories.current_page} of {dormitories.last_page} ({dormitories.total} total)</p>
                                        <div className="flex gap-1">
                                            {dormitories.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/dormitories?page=${dormitories.current_page - 1}`)}>Previous</Button>}
                                            {dormitories.current_page < dormitories.last_page && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/dormitories?page=${dormitories.current_page + 1}`)}>Next</Button>}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Dormitories by Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Distribution across dormitory types</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.dormitories_by_type} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }} />
                                                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border">
                                        <h4 className="font-semibold text-foreground text-sm">Occupancy by Dormitory</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Capacity vs occupied beds</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.occupancy_by_dormitory} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
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
                            <DialogTitle>Add Dormitory</DialogTitle>
                            <DialogDescription>Add a new dormitory to the facility. Fill in the required fields below.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/jail-officer/dormitories', { onSuccess: () => setIsCreateOpen(false) }); }}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Building</Label>
                                    <Select value={createForm.data.annex_id} onValueChange={(v) => createForm.setData('annex_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                                        <SelectContent>{annexes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Name</Label><Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Type</Label><Input value={createForm.data.type} onChange={(e) => createForm.setData('type', e.target.value)} placeholder="e.g. Male, Female" required /></div>
                                <div className="space-y-2"><Label>Description</Label><Input value={createForm.data.description} onChange={(e) => createForm.setData('description', e.target.value)} /></div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing} className="bg-primary hover:bg-primary/90 text-white">{createForm.processing ? 'Saving...' : 'Create Dormitory'}</Button>
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
                            <DialogTitle>Edit Dormitory</DialogTitle>
                            <DialogDescription>Update the dormitory information and status.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); editForm.put(`/jail-officer/dormitories/${selected.id}`, { onSuccess: () => setIsEditOpen(false) }); }}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Building</Label>
                                    <Select value={editForm.data.annex_id} onValueChange={(v) => editForm.setData('annex_id', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{annexes.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Name</Label><Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} required /></div>
                                <div className="space-y-2"><Label>Type</Label><Input value={editForm.data.type} onChange={(e) => editForm.setData('type', e.target.value)} required /></div>
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
                            <DialogTitle>Delete Dormitory</DialogTitle>
                            <DialogDescription>This action cannot be undone. The dormitory and its associations will be permanently removed.</DialogDescription>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{selected.name}</strong>?</p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button type="button" variant="destructive" disabled={deleteForm.processing} onClick={() => deleteForm.delete(`/jail-officer/dormitories/${selected.id}`, { onSuccess: () => setIsDeleteOpen(false) })}>
                                {deleteForm.processing ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
