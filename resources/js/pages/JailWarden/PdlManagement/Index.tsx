import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, MoreVertical, Plus, List, BarChart2, CheckCircle, XCircle, Hash, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#10b981', '#ef4444', '#3b82f6'];

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

type Props = {
    auth: { user: any };
    inmates: { data: any[]; current_page: number; last_page: number; per_page: number; total: number };
    cells: any[];
    stats: { total_pdls: number; active_pdls: number; inactive_pdls: number; assigned_cells: number };
    chartData: { pdls_by_status: { status: string; count: number }[]; pdls_by_annex: { annex: string; count: number }[] };
};

export default function PdlManagement({ auth, inmates, cells, stats, chartData }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const form = useForm({ inmate_number: '', first_name: '', middle_name: '', last_name: '', date_of_birth: '', cell_id: '' });

    const openCreateModal = () => { form.setData({ inmate_number: '', first_name: '', middle_name: '', last_name: '', date_of_birth: '', cell_id: '' }); setIsCreateModalOpen(true); };
    const submitCreate = (e: React.FormEvent) => { e.preventDefault(); router.post('/jail-warden/pdl', form.data, { onSuccess: () => { form.reset(); setIsCreateModalOpen(false); } }); };

    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'inmate_number', header: 'PDL Number' },
        { accessorKey: 'full_name', header: 'Full Name' },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${row.original.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{row.original.status}</span> },
        { accessorKey: 'cell.cell_number', header: 'Cell', cell: ({ row }) => row.original.cell?.cell_number || '-' },
        { accessorKey: 'cell.annex.name', header: 'Annex', cell: ({ row }) => row.original.cell?.annex?.name || '-' },
        { id: 'actions', cell: ({ row }) => (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => router.get(`/jail-warden/pdl/${row.original.id}`)}><span className="mr-2 h-4 w-4">👁</span>View</DropdownMenuItem></DropdownMenuContent></DropdownMenu>), },
    ], []);

    return (
        <AppLayout>
            <Head title="PDL Management" />
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-600 rounded-xl"><Users className="w-5 h-5 text-white" /></div>
                            <div><h1 className="text-lg font-bold text-slate-900 leading-none">PDL Management</h1><p className="text-xs text-slate-500 mt-0.5">Manage Persons Deprived of Liberty</p></div>
                        </div>
                        <Button onClick={openCreateModal} className="h-9"><Plus className="h-4 w-4 mr-2" />Add PDL</Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.total_pdls} label="Total PDLs" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.active_pdls} label="Active" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<XCircle className="w-5 h-5" />} value={stats.inactive_pdls} label="Inactive" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<Hash className="w-5 h-5" />} value={stats.assigned_cells} label="Assigned Cells" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                    </div>

                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all"><List className="w-4 h-4" />PDLs</TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all"><BarChart2 className="w-4 h-4" />Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">PDL Records</h3><p className="text-xs text-slate-500 mt-0.5">{inmates.total} total PDLs</p></div>
                                <div className="p-6"><DataTable columns={columns} data={inmates.data || []} /></div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100"><h4 className="font-semibold text-slate-800 text-sm">PDLs by Status</h4><p className="text-xs text-slate-500 mt-0.5">Active vs Inactive distribution</p></div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={chartData.pdls_by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}>{chartData.pdls_by_status.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100"><h4 className="font-semibold text-slate-800 text-sm">PDLs by Annex</h4><p className="text-xs text-slate-500 mt-0.5">Distribution across annexes</p></div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}><BarChart data={chartData.pdls_by_annex} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="annex" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="PDLs" /></BarChart></ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent><DialogHeader><DialogTitle>Add New PDL</DialogTitle><DialogDescription>Register a new Person Deprived of Liberty</DialogDescription></DialogHeader>
                    <form onSubmit={submitCreate}><div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="first_name">First Name</Label><Input id="first_name" value={form.data.first_name} onChange={(e) => form.setData('first_name', e.target.value)} />{form.errors.first_name && <p className="text-sm text-red-600">{form.errors.first_name}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="last_name">Last Name</Label><Input id="last_name" value={form.data.last_name} onChange={(e) => form.setData('last_name', e.target.value)} />{form.errors.last_name && <p className="text-sm text-red-600">{form.errors.last_name}</p>}</div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="middle_name">Middle Name</Label><Input id="middle_name" value={form.data.middle_name} onChange={(e) => form.setData('middle_name', e.target.value)} />{form.errors.middle_name && <p className="text-sm text-red-600">{form.errors.middle_name}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="inmate_number">PDL Number</Label><Input id="inmate_number" value={form.data.inmate_number} onChange={(e) => form.setData('inmate_number', e.target.value)} />{form.errors.inmate_number && <p className="text-sm text-red-600">{form.errors.inmate_number}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="date_of_birth">Date of Birth</Label><Input id="date_of_birth" type="date" value={form.data.date_of_birth} onChange={(e) => form.setData('date_of_birth', e.target.value)} />{form.errors.date_of_birth && <p className="text-sm text-red-600">{form.errors.date_of_birth}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="cell_id">Cell Assignment</Label><Select value={form.data.cell_id} onValueChange={(value) => form.setData('cell_id', value)}><SelectTrigger><SelectValue placeholder="Select cell" /></SelectTrigger><SelectContent>{cells?.map((cell: any) => (<SelectItem key={cell.value} value={cell.value}>{cell.label}</SelectItem>))}</SelectContent></Select>{form.errors.cell_id && <p className="text-sm text-red-600">{form.errors.cell_id}</p>}</div>
                    </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button><Button type="submit" disabled={form.processing}>Add PDL</Button></DialogFooter></form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
