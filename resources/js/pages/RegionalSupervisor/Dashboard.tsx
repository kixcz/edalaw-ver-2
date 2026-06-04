import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    overviewStats: any;
    branches: any[];
    branchDetails: any[];
}

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsis = totalPages > 5;

        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }

            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            if (!pages.includes(totalPages)) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
                Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                
                {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-2 py-1">...</span>
                    )
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

export default function RegionalSupervisorDashboard({ 
    overviewStats, 
    branches,
    branchDetails
}: Props) {
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({
        branches: 1,
    });

    const ITEMS_PER_PAGE = 10;

    const paginate = (data: any[], pageKey: string) => {
        const currentPageNum = currentPage[pageKey] || 1;
        const startIndex = (currentPageNum - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return {
            data: data.slice(startIndex, endIndex),
            totalPages: Math.ceil(data.length / ITEMS_PER_PAGE),
            totalItems: data.length,
        };
    };

    const handlePageChange = (pageKey: string, newPage: number) => {
        setCurrentPage(prev => ({ ...prev, [pageKey]: newPage }));
    };

    // Branch Management Modal State
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);

    const form = useForm({
        code: '',
        name: '',
        type: 'provincial',
        location: '',
        description: '',
        status: 'active',
    });

    const openCreateModal = () => {
        setSelectedBranch(null);
        form.setData({
            code: '',
            name: '',
            type: 'provincial',
            location: '',
            description: '',
            status: 'active',
        });
        setIsBranchModalOpen(true);
    };

    const openEditModal = (branch: any) => {
        setSelectedBranch(branch);
        form.setData({
            code: branch.code,
            name: branch.name,
            type: branch.type,
            location: branch.location,
            description: branch.description || '',
            status: branch.status,
        });
        setIsBranchModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedBranch) {
            form.put(route('dashboard.branches.update', selectedBranch.id), {
                onSuccess: () => setIsBranchModalOpen(false),
            });
        } else {
            form.post(route('dashboard.branches.store'), {
                onSuccess: () => setIsBranchModalOpen(false),
            });
        }
    };

    const handleDelete = (branch: any) => {
        if (confirm(`Are you sure you want to delete branch "${branch.name}"?`)) {
            form.delete(route('dashboard.branches.destroy', branch.id));
        }
    };

    return (
        <AppLayout user={{
            first_name: '',
            last_name: '',
            middle_name: '',
            role: { name: 'Regional Supervisor' },
        }}>
            <Head title="Regional Supervisor Dashboard" />
            
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Regional Supervisor Dashboard</h1>
                        <p className="text-gray-500 mt-1">Monitor and manage all BJMP branches in your region</p>
                    </div>
                    <Button onClick={openCreateModal}>
                        + Add New Branch
                    </Button>
                </div>

                {/* Overview Statistics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_branches}</div>
                            <div className="text-sm text-gray-500">Total Branches</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_annexes}</div>
                            <div className="text-sm text-gray-500">Total Annexes</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_dormitories}</div>
                            <div className="text-sm text-gray-500">Total Dormitories</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_cells}</div>
                            <div className="text-sm text-gray-500">Total Cells</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_pdls}</div>
                            <div className="text-sm text-gray-500">Total PDLs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.total_jail_wardens}</div>
                            <div className="text-sm text-gray-500">Jail Wardens</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{overviewStats.active_branches}</div>
                            <div className="text-sm text-gray-500">Active Branches</div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="branches" className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="branches">BJMP Branches</TabsTrigger>
                        <TabsTrigger value="detailed">Detailed Breakdown</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    {/* BRANCHES MODULE */}
                    <TabsContent value="branches" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Branch Management</h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Branch Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Jail Warden</TableHead>
                                                <TableHead className="text-right">Annexes</TableHead>
                                                <TableHead className="text-right">Dorms</TableHead>
                                                <TableHead className="text-right">Cells</TableHead>
                                                <TableHead className="text-right">PDLs</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginate(branches, 'branches').data.map((branch) => (
                                                <TableRow key={branch.id}>
                                                    <TableCell className="font-medium">{branch.code}</TableCell>
                                                    <TableCell>{branch.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{branch.type}</Badge>
                                                    </TableCell>
                                                    <TableCell>{branch.location}</TableCell>
                                                    <TableCell>
                                                        {branch.warden ? (
                                                            <div>
                                                                <div className="font-medium">{branch.warden.name}</div>
                                                                <div className="text-xs text-gray-500">{branch.warden.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">No Warden Assigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">{branch.total_annexes}</TableCell>
                                                    <TableCell className="text-right">{branch.total_dormitories}</TableCell>
                                                    <TableCell className="text-right">{branch.total_cells}</TableCell>
                                                    <TableCell className="text-right">{branch.total_pdls}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                                                            {branch.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEditModal(branch)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(branch)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <PaginationControls 
                                    currentPage={currentPage.branches}
                                    totalPages={paginate(branches, 'branches').totalPages}
                                    onPageChange={(page) => handlePageChange('branches', page)}
                                />
                            </div>
                        </Card>
                    </TabsContent>

                    {/* DETAILED BREAKDOWN MODULE */}
                    <TabsContent value="detailed" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Detailed Hierarchical View</h3>
                                <div className="space-y-6">
                                    {branchDetails.map((branch) => (
                                        <div key={branch.id} className="border rounded-lg p-4">
                                            <div className="mb-3">
                                                <h4 className="text-xl font-bold">{branch.name} ({branch.code})</h4>
                                            </div>
                                            
                                            {branch.jails.map((jail: any) => (
                                                <div key={jail.code} className="ml-4 mb-3">
                                                    <div className="bg-gray-50 p-2 rounded mb-2">
                                                        <strong>Jail:</strong> {jail.name} ({jail.code})
                                                    </div>
                                                    
                                                    {jail.dormitories.map((dorm: any) => (
                                                        <div key={dorm.name} className="ml-4 mb-2">
                                                            <div className="bg-blue-50 p-2 rounded mb-2">
                                                                <strong>Dormitory:</strong> {dorm.name} ({dorm.type})
                                                            </div>
                                                            
                                                            {dorm.annexes.map((annex: any) => (
                                                                <div key={annex.name} className="ml-4 mb-2">
                                                                    <div className="bg-green-50 p-2 rounded mb-2">
                                                                        <strong>Annex:</strong> {annex.name}
                                                                    </div>
                                                                    
                                                                    <div className="ml-4">
                                                                        <strong>Cells:</strong>
                                                                        <div className="mt-2 space-y-1">
                                                                            {annex.cells.map((cell: any) => (
                                                                                <div key={cell.cell_number} className="ml-4 bg-yellow-50 p-2 rounded">
                                                                                    <div>
                                                                                        <strong>Cell {cell.cell_number}</strong> (Floor {cell.floor_number}) - 
                                                                                        {cell.current_inmates}/{cell.capacity} inmates
                                                                                    </div>
                                                                                    {cell.inmates.length > 0 && (
                                                                                        <div className="mt-1 ml-4 text-sm text-gray-600">
                                                                                            {cell.inmates.map((inmate: any) => (
                                                                                                <div key={inmate.id}>
                                                                                                    • {inmate.full_name}, {inmate.age}, {inmate.gender}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* ANALYTICS MODULE */}
                    <TabsContent value="analytics" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Analytics</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Card>
                                        <CardContent className="p-4">
                                            <h4 className="text-md font-semibold mb-4">Branches by Type</h4>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={branches.reduce((acc, branch) => {
                                                    const existing = acc.find(item => item.type === branch.type);
                                                    if (existing) {
                                                        existing.count++;
                                                    } else {
                                                        acc.push({ type: branch.type, count: 1 });
                                                    }
                                                    return acc;
                                                }, [] as any[])}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="type" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="count" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="p-4">
                                            <h4 className="text-md font-semibold mb-4">PDL Count per Branch</h4>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={branches.map(b => ({
                                                    name: b.name,
                                                    pdls: b.total_pdls
                                                }))}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="pdls" fill="#82ca9d" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Branch Management Modal */}
                {isBranchModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">
                                {selectedBranch ? 'Edit Branch' : 'Create New Branch'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Code</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.type}
                                        onChange={(e) => form.setData('type', e.target.value)}
                                        required
                                    >
                                        <option value="provincial">Provincial</option>
                                        <option value="district">District</option>
                                        <option value="sub-provincial">Sub-Provincial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.location}
                                        onChange={(e) => form.setData('location', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        className="w-full border rounded-md px-3 py-2"
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value)}
                                        required
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsBranchModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={form.processing}>
                                        {selectedBranch ? 'Update' : 'Create'}
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
