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
import { Grid3X3, Plus, Pencil, Trash2, MoreVertical, List, BarChart2, CheckCircle2, Users, TrendingUp } from 'lucide-react';

type Cell = {
    id: number; dormitory_id: number; cell_number: string; capacity: number; status: 'active' | 'inactive';
    inmates_count: number; created_at: string;
};

interface Props {
    cells: { data: Cell[]; current_page: number; last_page: number; per_page: number; total: number };
    dormitories: { id: number; name: string }[];
    stats: { total_cells: number; active_cells: number; total_capacity: number; occupied_beds: number; occupancy_rate: number };
    chartData: { cells_by_status: { status: string; count: number }[]; occupancy_by_dormitory: { name: string; capacity: number; occupied: number }[] };
    filters: { search: string; annex_id: number | null; dormitory_id: number | null; jail_id: number | null; status: string };
}

const COLORS = ['#10b981', '#94a3b8'];

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

function OccupancyBar({ current, capacity }: { current: number; capacity: number }) {
    const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
    const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs tabular-nums text-slate-500 shrink-0">{current}/{capacity}</span>
        </div>
    );
}

const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', inactive: 'bg-slate-100 text-slate-500 border-slate-200' };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>{status}</span>;
};

export default function CellManagement({ cells, dormitories, stats, chartData, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Cell | null>(null);

    const createForm = useForm({ dormitory_id: '', cell_number: '', capacity: '4', status: 'active' });
    const editForm = useForm({ dormitory_id: '', cell_number: '', capacity: '4', status: 'active' });
    const deleteForm = useForm({});

    const handleSearch = () => router.get('/bjmp-officer/cells', { search: searchQuery, status: statusFilter !== 'all' ? statusFilter : '' }, { preserveState: true, preserveScroll: true });
    const openCreate = () => { setSelected(null); createForm.reset(); setIsCreateOpen(true); };
    const openEdit = (c: Cell) => { setSelected(c); editForm.setData({ dormitory_id: String(c.dormitory_id), cell_number: c.cell_number, capacity: String(c.capacity), status: c.status }); setIsEditOpen(true); };
    const openDelete = (c: Cell) => { setSelected(c); setIsDeleteOpen(true); };

    return (
        <AppLayout user={{ first_name: '', last_name: '', middle_name: '', role: { name: 'Jail Officer' } }}>
            <Head title="Cell Management" />
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-600 rounded-xl"><Grid3X3 className="w-5 h-5 text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Cell Management</h1>
                                <p className="text-xs text-slate-500 mt-0.5">Manage facility cells and occupancy</p>
                            </div>
                        </div>
                        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 text-sm">
                            <Plus className="w-4 h-4" />Add Cell
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {flash?.success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{flash.success}</div>}
                    {flash?.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{flash.error}</div>}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard icon={<Grid3X3 className="w-5 h-5" />} value={stats.total_cells} label="Total Cells" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={stats.active_cells} label="Active Cells" accent="bg-green-600" iconBg="bg-green-50" iconColor="text-green-600" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.total_capacity} label="Total Capacity" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.occupied_beds} label="Occupied Beds" accent="bg-sky-600" iconBg="bg-sky-50" iconColor="text-sky-600" />
                        <StatCard icon={<TrendingUp className="w-5 h-5" />} value={`${stats.occupancy_rate}%`} label="Occupancy Rate" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                    </div>

                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <List className="w-4 h-4" />Cells
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all">
                                <BarChart2 className="w-4 h-4" />Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Cell Records</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{cells.total} cells total</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Input placeholder="Search cells..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-[200px] h-9 pl-3" />
                                        </div>
                                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); router.get('/bjmp-officer/cells', { search: searchQuery, status: v !== 'all' ? v : '' }, { preserveState: true, preserveScroll: true }); }}>
                                            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                                            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-6">Cell Number</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Capacity</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Occupancy</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-6 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cells.data.map((c) => (
                                                <TableRow key={c.id} className="hover:bg-slate-50 transition-colors group">
                                                    <TableCell className="pl-6"><span className="font-semibold text-slate-800 text-sm">{c.cell_number}</span></TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-slate-700">{c.capacity}</TableCell>
                                                    <TableCell><OccupancyBar current={c.inmates_count} capacity={c.capacity} /></TableCell>
                                                    <TableCell>{statusBadge(c.status)}</TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"><Pencil className="h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openDelete(c)} className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"><Trash2 className="h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {cells.data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">No cells found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                                {cells.last_page > 1 && (
                                    <div className="px-6 pb-4 flex items-center justify-between pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-500">Page {cells.current_page} of {cells.last_page} ({cells.total} total)</p>
                                        <div className="flex gap-1">
                                            {cells.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get(`/bjmp-officer/cells?page=${cells.current_page - 1}`)}>Previous</Button>}
                                            {cells.current_page < cells.last_page && <Button variant="outline" size="sm" onClick={() => router.get(`/bjmp-officer/cells?page=${cells.current_page + 1}`)}>Next</Button>}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Cells by Status</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Active vs inactive cells</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie data={chartData.cells_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status}: ${count}`}>
                                                    {chartData.cells_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Occupancy by Dormitory</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Capacity vs occupied beds per dormitory</p>
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
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Grid3X3 className="w-5 h-5 text-emerald-600" />Add Cell</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createForm.post('/bjmp-officer/cells', { onSuccess: () => setIsCreateOpen(false) }); }} className="space-y-4">
                            <div><Label className="text-xs font-semibold uppercase">Dormitory</Label>
                                <Select value={createForm.data.dormitory_id} onValueChange={(v) => createForm.setData('dormitory_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select dormitory" /></SelectTrigger>
                                    <SelectContent>{dormitories.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Cell Number</Label><Input value={createForm.data.cell_number} onChange={(e) => createForm.setData('cell_number', e.target.value)} required /></div>
                            <div><Label className="text-xs font-semibold uppercase">Capacity</Label><Input type="number" min="1" max="50" value={createForm.data.capacity} onChange={(e) => createForm.setData('capacity', e.target.value)} required /></div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createForm.processing} className="bg-emerald-600 hover:bg-emerald-700">{createForm.processing ? 'Saving...' : 'Create Cell'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Edit Modal */}
            {isEditOpen && selected && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-green-600" />Edit Cell</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); editForm.put(`/bjmp-officer/cells/${selected.id}`, { onSuccess: () => setIsEditOpen(false) }); }} className="space-y-4">
                            <div><Label className="text-xs font-semibold uppercase">Dormitory</Label>
                                <Select value={editForm.data.dormitory_id} onValueChange={(v) => editForm.setData('dormitory_id', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{dormitories.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label className="text-xs font-semibold uppercase">Cell Number</Label><Input value={editForm.data.cell_number} onChange={(e) => editForm.setData('cell_number', e.target.value)} required /></div>
                            <div><Label className="text-xs font-semibold uppercase">Capacity</Label><Input type="number" min="1" max="50" value={editForm.data.capacity} onChange={(e) => editForm.setData('capacity', e.target.value)} required /></div>
                            <div><Label className="text-xs font-semibold uppercase">Status</Label>
                                <Select value={editForm.data.status} onValueChange={(v) => editForm.setData('status', v as 'active' | 'inactive')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
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

            {/* Delete Modal */}
            {isDeleteOpen && selected && (
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-600" />Delete Cell</DialogTitle></DialogHeader>
                        <p className="text-sm text-slate-600">Are you sure you want to delete <strong>{selected.cell_number}</strong>? This cannot be undone.</p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button type="button" variant="destructive" disabled={deleteForm.processing} onClick={() => deleteForm.delete(`/bjmp-officer/cells/${selected.id}`, { onSuccess: () => setIsDeleteOpen(false) })}>
                                {deleteForm.processing ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
