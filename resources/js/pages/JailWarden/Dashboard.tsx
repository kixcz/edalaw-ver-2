import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    overviewStats: any;
    branch: any;
    dormitories: any[];
    jailOfficers: any[];
    facilities: any;
}

export default function JailWardenDashboard({ 
    overviewStats, 
    branch,
    dormitories,
    jailOfficers,
    facilities
}: Props) {
    const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState<any>(null);

    const form = useForm({
        jail_officer_id: '',
        scope_type: 'annex',
        annex_id: '',
        dormitory_id: '',
        cell_id: '',
    });

    const openScopeModal = (officer?: any) => {
        setSelectedOfficer(officer || null);
        form.setData({
            jail_officer_id: officer?.id || '',
            scope_type: 'annex',
            annex_id: '',
            dormitory_id: '',
            cell_id: '',
        });
        setIsScopeModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        form.post(route('dashboard.jail-warden.officer-scopes.store'), {
            onSuccess: () => setIsScopeModalOpen(false),
            onError: () => {},
        });
    };

    const handleDeactivateScope = (scopeId: number) => {
        if (confirm('Deactivate this scope assignment?')) {
            // Would need to implement PUT route
        }
    };

    const handleDeleteScope = (scopeId: number) => {
        if (confirm('Delete this scope assignment permanently?')) {
            // Would need to implement DELETE route
        }
    };

    return (
        <AppLayout user={{
            first_name: '',
            last_name: '',
            middle_name: '',
            role: { name: 'Jail Warden' },
        }}>
            <Head title="Jail Warden Dashboard" />
            
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Jail Warden Dashboard</h1>
                        <p className="text-gray-500 mt-1">{branch.name} ({branch.code})</p>
                    </div>
                </div>

                {/* Overview Statistics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_dormitories}</div>
                            <div className="text-sm text-gray-500">Dormitories</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_annexes}</div>
                            <div className="text-sm text-gray-500">Annexes</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_cells}</div>
                            <div className="text-sm text-gray-500">Cells</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_pdls}</div>
                            <div className="text-sm text-gray-500">PDLs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_jail_officers}</div>
                            <div className="text-sm text-gray-500">Jail Officers</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.active_scopes}</div>
                            <div className="text-sm text-gray-500">Active Scopes</div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="officers" className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="officers">Jail Officers & Scope Assignment</TabsTrigger>
                        <TabsTrigger value="dormitories">Dormitories & Annexes</TabsTrigger>
                        <TabsTrigger value="cells">Cells & PDLs</TabsTrigger>
                    </TabsList>

                    {/* JAIL OFFICERS & SCOPE ASSIGNMENT */}
                    <TabsContent value="officers" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Jail Officers Management</h3>
                                    <Button onClick={() => openScopeModal()}>
                                        + Assign Scope to Officer
                                    </Button>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Officer Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Assigned Scopes</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {jailOfficers.map((officer) => (
                                                <TableRow key={officer.id}>
                                                    <TableCell className="font-medium">{officer.name}</TableCell>
                                                    <TableCell>{officer.email}</TableCell>
                                                    <TableCell>
                                                        {officer.scopes.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {officer.scopes.map((scope: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {scope.scope_type === 'annex' && '🏢 Annex'}
                                                                            {scope.scope_type === 'dormitory' && '🛏️ Dormitory'}
                                                                            {scope.scope_type === 'cell' && '📍 Cell'}
                                                                        </Badge>
                                                                        <span className="text-sm">{scope.description}</span>
                                                                        {scope.is_active && (
                                                                            <Badge variant="default" className="text-xs">Active</Badge>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">No scopes assigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openScopeModal(officer)}
                                                            >
                                                                Assign Scope
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* DORMITORIES & ANNEXES */}
                    <TabsContent value="dormitories" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Dormitories & Annexes Overview</h3>
                                <div className="space-y-6">
                                    {dormitories.map((dorm) => (
                                        <div key={dorm.id} className="border rounded-lg p-4">
                                            <div className="mb-3">
                                                <h4 className="text-xl font-bold">{dorm.name}</h4>
                                                <p className="text-sm text-gray-500">Type: {dorm.type} | Capacity: {dorm.capacity}</p>
                                            </div>
                                            
                                            <div className="ml-4 space-y-2">
                                                <strong className="text-sm">Annexes:</strong>
                                                {dorm.annexes.map((annex: any) => (
                                                    <div key={annex.id} className="bg-gray-50 p-3 rounded ml-4">
                                                        <div className="font-medium">{annex.name}</div>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {annex.cells.length} cells
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* CELLS & PDLS */}
                    <TabsContent value="cells" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Cells & PDLs Detailed View</h3>
                                <div className="space-y-6">
                                    {dormitories.map((dorm) => (
                                        <div key={dorm.id} className="border rounded-lg p-4">
                                            <h4 className="text-lg font-bold mb-2">{dorm.name}</h4>
                                            {dorm.annexes.map((annex: any) => (
                                                <div key={annex.id} className="ml-4 mt-3">
                                                    <h5 className="font-medium mb-2">{annex.name}</h5>
                                                    <div className="ml-4 space-y-2">
                                                        {annex.cells.map((cell: any) => (
                                                            <div key={cell.id} className="bg-yellow-50 p-3 rounded">
                                                                <div className="font-medium">
                                                                    Cell {cell.cell_number} (Floor {cell.floor_number})
                                                                </div>
                                                                <div className="text-sm text-gray-600 mt-1">
                                                                    Capacity: {cell.current_inmates}/{cell.capacity} inmates
                                                                </div>
                                                                {cell.inmates.length > 0 && (
                                                                    <div className="mt-2 ml-4 text-sm">
                                                                        <strong>Inmates:</strong>
                                                                        <ul className="list-disc ml-4 mt-1">
                                                                            {cell.inmates.map((inmate: any) => (
                                                                                <li key={inmate.id}>
                                                                                    {inmate.full_name}, {inmate.age}, {inmate.gender}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Scope Assignment Modal */}
                {isScopeModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">
                                {selectedOfficer ? `Assign Scope to ${selectedOfficer.name}` : 'Assign Scope to Officer'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!selectedOfficer && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Jail Officer</label>
                                        <select
                                            className="w-full border rounded-md px-3 py-2"
                                            value={form.data.jail_officer_id}
                                            onChange={(e) => form.setData('jail_officer_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Officer</option>
                                            {jailOfficers.map((officer: any) => (
                                                <option key={officer.id} value={officer.id}>
                                                    {officer.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Scope Level</label>
                                    <select
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.scope_type}
                                        onChange={(e) => {
                                            form.setData('scope_type', e.target.value);
                                            form.setData('annex_id', '');
                                            form.setData('dormitory_id', '');
                                            form.setData('cell_id', '');
                                        }}
                                        required
                                    >
                                        <option value="annex">🏢 Annex Level (Broadest)</option>
                                        <option value="dormitory">🛏️ Dormitory Level (Specific dorm in annex)</option>
                                        <option value="cell">📍 Cell Level (Most specific)</option>
                                    </select>
                                </div>

                                {form.data.scope_type === 'annex' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Annex</label>
                                        <select
                                            className="w-full border rounded-md px-3 py-2"
                                            value={form.data.annex_id}
                                            onChange={(e) => form.setData('annex_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Annex</option>
                                            {facilities.annexes.map((annex: any) => (
                                                <option key={annex.id} value={annex.id}>
                                                    {annex.name} ({annex.dormitory.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {form.data.scope_type === 'dormitory' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Dormitory</label>
                                        <select
                                            className="w-full border rounded-md px-3 py-2"
                                            value={form.data.dormitory_id}
                                            onChange={(e) => form.setData('dormitory_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Dormitory</option>
                                            {facilities.dormitories.map((dorm: any) => (
                                                <option key={dorm.id} value={dorm.id}>
                                                    {dorm.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {form.data.scope_type === 'cell' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Cell</label>
                                        <select
                                            className="w-full border rounded-md px-3 py-2"
                                            value={form.data.cell_id}
                                            onChange={(e) => form.setData('cell_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Cell</option>
                                            {facilities.cells.map((cell: any) => (
                                                <option key={cell.id} value={cell.id}>
                                                    Cell {cell.cell_number} - {cell.annex.name} ({cell.dormitory.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsScopeModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={form.processing}>
                                        Assign Scope
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
