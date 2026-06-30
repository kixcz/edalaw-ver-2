import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';
import { Users, Plus, Pencil, Trash2, MoreVertical, List, BarChart2, CheckCircle2, AlertCircle, ArrowRightLeft } from 'lucide-react';

type Cell = { id: number; cell_number: string; capacity: number };
type Inmate = {
    id: number; cell_id: number; first_name: string; middle_name: string | null;
    last_name: string; inmate_number: string; date_of_birth: string | null;
    status: 'active' | 'inactive' | 'released'; cell: Cell; created_at: string;
};

interface Props {
    inmates: { data: Inmate[]; current_page: number; last_page: number; per_page: number; total: number };
    cells: Cell[];
    stats: { total_pdls: number; active_pdls: number; inactive_pdls: number; released_pdls: number };
    chartData: { pdls_by_status: { status: string; count: number }[]; pdls_by_cell: { cell: string; count: number }[] };
    filters: { search: string; cell_id: number | null; status: string };
}

const COLORS = ['#10b981', '#94a3b8', '#f59e0b'];

const StatCard = ({ icon, value, label, accent, iconBg, iconColor }: { icon: React.ReactNode; value: number | string; label: string; accent: string; iconBg: string; iconColor: string }) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', inactive: 'bg-slate-100 text-slate-500 border-slate-200', released: 'bg-amber-50 text-amber-700 border-amber-200' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>{status}</span>;
};

export default function InmateManagement({ inmates, cells, stats, chartData, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const [cellFilter, setCellFilter] = useState(filters.cell_id ? String(filters.cell_id) : 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [selected, setSelected] = useState<Inmate | null>(null);

    const createForm = useForm({ cell_id: '', first_name: '', middle_name: '', last_name: '', inmate_number: '', date_of_birth: '', status: 'active' });
    const editForm = useForm({ cell_id: '', first_name: '', middle_name: '', last_name: '', inmate_number: '', date_of_birth: '', status: 'active' });
    const deleteForm = useForm({});
    const transferForm = useForm({ cell_id: '' });

    const handleSearch = () => router.get('/jail-officer/inmates', { search: searchQuery, cell_id: cellFilter !== 'all' ? cellFilter : '', status: statusFilter !== 'all' ? statusFilter : '' }, { preserveState: true, preserveScroll: true });
    const openCreate = () => { setSelected(null); createForm.reset(); setIsCreateOpen(true); };
    const openEdit = (i: Inmate) => {
        setSelected(i);
        editForm.setData({ cell_id: String(i.cell_id), first_name: i.first_name, middle_name: i.middle_name ?? '', last_name: i.last_name, inmate_number: i.inmate_number, date_of_birth: i.date_of_birth ?? '', status: i.status });
        setIsEditOpen(true);
    };
    const openDelete = (i: Inmate) => { setSelected(i); setIsDeleteOpen(true); };
    const openTransfer = (i: Inmate) => { setSelected(i); transferForm.setData({ cell_id: '' }); setIsTransferOpen(true); };

    return (
        <AppLayout user={{ first_name: '', last_name: '', middle_name: '', role: { name: 'Jail Officer' } }}>
            <Head title="PDL Management" />
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-600 rounded-xl"><Users className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">PDL Management</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Manage persons deprived of liberty</p>
                            </div>
                        </div>
                        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white shadow-sm gap-1.5 text-sm">
                            <Plus className="w-4 h-4" />Add PDL
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{flash.success}</div>}
                    {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{flash.error}</div>}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.total_pdls} label="Total PDLs" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_pdls} label="Active PDLs" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<AlertCircle className="w-5 h-5" />} value={stats.inactive_pdls} label="Inactive PDLs" accent="bg-slate-500" iconBg="bg-slate-50" iconColor="text-slate-500" />
                        <StatCard icon={<ArrowRightLeft className="w-5 h-5" />} value={stats.released_pdls} label="Released PDLs" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                    </div>

                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />PDL Records
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">PDL Records</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{inmates.total} inmates total</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Input placeholder="Search PDLs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-[200px] h-9 pl-3" />
                                        </div>
                                        <Select value={cellFilter} onValueChange={(v) => { setCellFilter(v); router.get('/jail-officer/inmates', { search: searchQuery, cell_id: v !== 'all' ? v : '', status: statusFilter !== 'all' ? statusFilter : '' }, { preserveState: true, preserveScroll: true }); }}>
                                            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Cells" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Cells</SelectItem>{cells.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.cell_number}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); router.get('/jail-officer/inmates', { search: searchQuery, cell_id: cellFilter !== 'all' ? cellFilter : '', status: v !== 'all' ? v : '' }, { preserveState: true, preserveScroll: true }); }}>
                                            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="released">Released</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-6">Inmate Number</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cell</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-6 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {inmates.data.map((i) => (
                                                <TableRow key={i.id} className="hover:bg-slate-50 transition-colors group">
                                                    <TableCell className="pl-6"><span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{i.inmate_number}</span></TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <span className="font-semibold text-slate-800 text-sm">{i.last_name}, {i.first_name}</span>
                                                            {i.middle_name && <span className="text-slate-500 text-xs ml-1">{i.middle_name}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">{i.cell?.cell_number ?? '—'}</TableCell>
                                                    <TableCell>{statusBadge(i.status)}</TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem onClick={() => openEdit(i)} className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"><Pencil className="h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openTransfer(i)} className="gap-2 cursor-pointer text-blue-700 focus:text-white focus:bg-blue-600 [&_svg]:!text-blue-600 focus:[&_svg]:!text-white"><ArrowRightLeft className="h-4 w-4" /><span>Transfer</span></DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openDelete(i)} className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"><Trash2 className="h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {inmates.data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">No inmates found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                                {inmates.last_page > 1 && (
                                    <div className="px-6 pb-4 flex items-center justify-between pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-500">Page {inmates.current_page} of {inmates.last_page} ({inmates.total} total)</p>
                                        <div className="flex gap-1">
                                            {inmates.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/inmates?page=${inmates.current_page - 1}`)}>Previous</Button>}
                                            {inmates.current_page < inmates.last_page && <Button variant="outline" size="sm" onClick={() => router.get(`/jail-officer/inmates?page=${inmates.current_page + 1}`)}>Next</Button>}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">PDLs by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution of inmate statuses</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.pdls_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status}: ${count}`}>
                                                    {chartData.pdls_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">PDLs by Cell</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Top 10 cells by inmate count</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={chartData.pdls_by_cell} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="cell" angle={-40} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }} />
                                                <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} name="PDLs" />
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
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-red-600" />Add PDL</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/jail-officer/inmates', { onSuccess: () => setIsCreateOpen(false) }); }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs font-semibold uppercase">First Name</Label><Input value={createForm.data.first_name} onChange={(e) => createForm.setData('first_name', e.target.value)} required /></div>
                                <div><Label className="text-xs font-semibold uppercase">Last Name</Label><Input value={createForm.data.last_name} onChange={(e) => createForm.setData('last_name', e.target.value)} required /></div>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Middle Name</Label><Input value={createForm.data.middle_name} onChange={(e) => createForm.setData('middle_name', e.target.value)} /></div>
                            <div><Label className="text-xs font-semibold uppercase">Inmate Number</Label><Input value={createForm.data.inmate_number} onChange={(e) => createForm.setData('inmate_number', e.target.value)} required /></div>
                            <div><Label className="text-xs font-semibold uppercase">Cell</Label>
                                <Select value={createForm.data.cell_id} onValueChange={(v) => createForm.setData('cell_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select cell" /></SelectTrigger>
                                    <SelectContent>{cells.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.cell_number}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Date of Birth</Label><Input type="date" value={createForm.data.date_of_birth} onChange={(e) => createForm.setData('date_of_birth', e.target.value)} /></div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing} className="bg-red-600 hover:bg-red-700">{createForm.processing ? 'Saving...' : 'Add PDL'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit Modal */}
            {isEditOpen && selected && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-green-600" />Edit PDL</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); editForm.put(`/jail-officer/inmates/${selected.id}`, { onSuccess: () => setIsEditOpen(false) }); }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs font-semibold uppercase">First Name</Label><Input value={editForm.data.first_name} onChange={(e) => editForm.setData('first_name', e.target.value)} required /></div>
                                <div><Label className="text-xs font-semibold uppercase">Last Name</Label><Input value={editForm.data.last_name} onChange={(e) => editForm.setData('last_name', e.target.value)} required /></div>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Middle Name</Label><Input value={editForm.data.middle_name} onChange={(e) => editForm.setData('middle_name', e.target.value)} /></div>
                            <div><Label className="text-xs font-semibold uppercase">Inmate Number</Label><Input value={editForm.data.inmate_number} onChange={(e) => editForm.setData('inmate_number', e.target.value)} required /></div>
                            <div><Label className="text-xs font-semibold uppercase">Cell</Label>
                                <Select value={editForm.data.cell_id} onValueChange={(v) => editForm.setData('cell_id', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{cells.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.cell_number}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Status</Label>
                                <Select value={editForm.data.status} onValueChange={(v) => editForm.setData('status', v as 'active' | 'inactive' | 'released')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="released">Released</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={editForm.processing} className="bg-green-600 hover:bg-green-700">{editForm.processing ? 'Saving...' : 'Save Changes'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Transfer Modal */}
            {isTransferOpen && selected && (
                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-600" />Transfer PDL</DialogTitle></DialogHeader>
                        <p className="text-sm text-slate-600">Transfer <strong>{selected.first_name} {selected.last_name}</strong> from <strong>{selected.cell?.cell_number}</strong> to:</p>
                        <form onSubmit={(e) => { e.preventDefault(); transferForm.post(`/jail-officer/inmates/${selected.id}/transfer`, { onSuccess: () => setIsTransferOpen(false) }); }} className="space-y-4">
                            <div><Label className="text-xs font-semibold uppercase">New Cell</Label>
                                <Select value={transferForm.data.cell_id} onValueChange={(v) => transferForm.setData('cell_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select new cell" /></SelectTrigger>
                                    <SelectContent>{cells.filter(c => c.id !== selected.cell_id).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.cell_number}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={transferForm.processing} className="bg-blue-600 hover:bg-blue-700">{transferForm.processing ? 'Transferring...' : 'Transfer'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && selected && (
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-600" />Delete PDL</DialogTitle></DialogHeader>
                        <p className="text-sm text-slate-600">Are you sure you want to delete <strong>{selected.first_name} {selected.last_name}</strong>? This cannot be undone.</p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button type="button" variant="destructive" disabled={deleteForm.processing} onClick={() => deleteForm.delete(`/jail-officer/inmates/${selected.id}`, { onSuccess: () => setIsDeleteOpen(false) })}>
                                {deleteForm.processing ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
