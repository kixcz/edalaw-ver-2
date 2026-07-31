import { Head, useForm, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, MoreVertical, Plus, List, BarChart2, CheckCircle, UserCheck, Shield, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b'];

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

type Props = {
    auth: { user: any };
    officers: any[];
    facilities: { annexes: any[]; dormitories: any[]; cells: any[] };
    stats: { total_officers: number; active_assignments: number; annex_scopes: number; dormitory_scopes: number };
    chartData: { officers_by_scope_type: { type: string; count: number }[]; assignment_status: { status: string; count: number }[] };
};

export default function JailOfficerManagement({ auth, officers, facilities, stats, chartData }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const form = useForm({ first_name: '', middle_name: '', last_name: '', email: '', password: '', password_confirmation: '' });

    const openCreateModal = () => { form.setData({ first_name: '', middle_name: '', last_name: '', email: '', password: '', password_confirmation: '' }); setIsCreateModalOpen(true); };
    const submitCreate = (e: React.FormEvent) => { e.preventDefault(); router.post('/jail-warden/officers', form.data, { onSuccess: () => { form.reset(); setIsCreateModalOpen(false); } }); };

    const columns: ColumnDef<any>[] = useMemo(() => [
        { accessorKey: 'name', header: 'Officer Name' },
        { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-sm text-muted-foreground"><Mail className="w-3 h-3 inline mr-1" />{row.original.email}</span> },
        { accessorKey: 'scopes', header: 'Assigned Scopes', cell: ({ row }) => <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{row.original.scopes.length} scope(s)</span> },
        { id: 'actions', cell: ({ row }) => (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => router.get(`/jail-warden/officers/${row.original.id}`)}><UserCheck className="mr-2 h-4 w-4" />View Details</DropdownMenuItem></DropdownMenuContent></DropdownMenu>), },
    ], []);

    return (
        <AppLayout>
            <Head title="Jail Officer Management" />
            <div className="min-h-screen bg-muted">
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-violet-600 rounded-xl"><Users className="w-5 h-5 text-white" /></div>
                            <div><h1 className="text-lg font-bold text-foreground leading-none">Jail Officer Management</h1><p className="text-xs text-muted-foreground mt-0.5">Manage officers and their facility assignments</p></div>
                        </div>
                        <Button onClick={openCreateModal} className="h-9"><Plus className="h-4 w-4 mr-2" />Create Officer</Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<Users className="w-5 h-5" />} value={stats.total_officers} label="Total Officers" accent="bg-violet-600" iconBg="bg-violet-50" iconColor="text-violet-600" />
                        <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.active_assignments} label="Active Assignments" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                        <StatCard icon={<Shield className="w-5 h-5" />} value={stats.annex_scopes} label="Annex Scopes" accent="bg-blue-600" iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <StatCard icon={<UserCheck className="w-5 h-5" />} value={stats.dormitory_scopes} label="Dormitory Scopes" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                    </div>

                    <Tabs defaultValue="records" className="space-y-4">
                        <TabsList className="bg-card border border-border p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger value="records" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"><List className="w-4 h-4" />Officers</TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:text-primary rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground gap-2 transition-all"><BarChart2 className="w-4 h-4" />Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="records">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold text-foreground">Officer Records</h3><p className="text-xs text-muted-foreground mt-0.5">{officers.length} total officers</p></div>
                                <div className="p-6"><DataTable columns={columns} data={officers || []} /></div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border"><h4 className="font-semibold text-foreground text-sm">Assignments by Scope Type</h4><p className="text-xs text-muted-foreground mt-0.5">Distribution across facility levels</p></div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={chartData.officers_by_scope_type} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100}>{chartData.officers_by_scope_type.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-border"><h4 className="font-semibold text-foreground text-sm">Assignment Status</h4><p className="text-xs text-muted-foreground mt-0.5">Active vs Inactive assignments</p></div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}><BarChart data={chartData.assignment_status} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Assignments" /></BarChart></ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Create Jail Officer Account</DialogTitle><DialogDescription>Add a new jail officer to your branch.</DialogDescription></DialogHeader>
                    <form onSubmit={submitCreate}><div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="first_name">First Name</Label><Input id="first_name" value={form.data.first_name} onChange={(e) => form.setData('first_name', e.target.value)} />{form.errors.first_name && <p className="text-sm text-destructive">{form.errors.first_name}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="last_name">Last Name</Label><Input id="last_name" value={form.data.last_name} onChange={(e) => form.setData('last_name', e.target.value)} />{form.errors.last_name && <p className="text-sm text-destructive">{form.errors.last_name}</p>}</div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="middle_name">Middle Name</Label><Input id="middle_name" value={form.data.middle_name} onChange={(e) => form.setData('middle_name', e.target.value)} />{form.errors.middle_name && <p className="text-sm text-destructive">{form.errors.middle_name}</p>}</div>
                        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />{form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />{form.errors.password && <p className="text-sm text-destructive">{form.errors.password}</p>}</div>
                            <div className="space-y-2"><Label htmlFor="password_confirmation">Confirm Password</Label><Input id="password_confirmation" type="password" value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} />{form.errors.password_confirmation && <p className="text-sm text-destructive">{form.errors.password_confirmation}</p>}</div>
                        </div>
                    </div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button><Button type="submit" disabled={form.processing} className="bg-primary hover:bg-primary/90 text-white">Create Officer</Button></DialogFooter></form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
