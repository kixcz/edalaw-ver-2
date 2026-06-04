import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as PieCell } from 'recharts';
import { Head } from '@inertiajs/react';

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

interface Region {
    id: number;
    code: string;
    name: string;
    status: string;
    total_branches: number;
    total_jails: number;
    total_dormitories: number;
    total_cells: number;
    total_pdls: number;
}

interface Branch {
    id: number;
    code: string;
    name: string;
    type: string;
    status: string;
    region: { code: string; name: string };
    jail_warden: { id: number; name: string; email: string } | null;
    total_jails: number;
    total_dormitories: number;
    total_annexes: number;
    total_cells: number;
    total_pdls: number;
}

interface JailOfficer {
    id: number;
    name: string;
    email: string;
    branch: { code: string; name: string; region: string };
    scopes: Array<{ scope_type: string; description: string }>;
}

interface Annex {
    id: number;
    name: string;
    dormitory: { name: string; type: string };
    jail: { name: string; code: string };
    branch: { name: string; code: string };
    region: { name: string; code: string };
    total_cells: number;
    assigned_officers: number;
}

interface Dormitory {
    id: number;
    name: string;
    type: string;
    capacity: number;
    jail: { name: string; code: string };
    branch: { name: string; code: string };
    region: { name: string; code: string };
    total_annexes: number;
    total_cells: number;
    total_pdls: number;
}

interface CellData {
    id: number;
    cell_number: string;
    floor_number: number;
    capacity: number;
    annex: { name: string };
    dormitory: { name: string; type: string };
    jail: { name: string; code: string };
    branch: { name: string; code: string };
    region: { name: string; code: string };
    total_pdls: number;
    assigned_officers: number;
}

interface PDL {
    id: number;
    full_name: string;
    age: number;
    gender: string;
    cell: { cell_number: string | null };
    annex: { name: string | null };
    dormitory: { name: string | null; type: string | null };
    jail: { name: string | null; code: string | null };
    branch: { name: string | null; code: string | null };
    region: { name: string | null; code: string | null };
}

interface AnalyticsData {
    pdl_per_branch: Array<{ name: string; count: number }>;
    branch_per_region: Array<{ name: string; count: number }>;
    cell_per_branch: Array<{ name: string; count: number }>;
    visits_per_region: Array<{ name: string; count: number }>;
    visits_per_branch: Array<{ name: string; count: number }>;
    visits_per_dormitory: Array<{ name: string; count: number }>;
    visits_per_cell: Array<{ name: string; count: number }>;
}

interface Props {
    overviewStats: Record<string, number>;
    regions: Region[];
    branches: Branch[];
    jailOfficers: JailOfficer[];
    annexes: Annex[];
    dormitories: Dormitory[];
    cells: CellData[];
    pdls: PDL[];
    analytics: AnalyticsData;
    filters: { date_from: string; date_to: string };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function NationalOfficeDashboard({ 
    overviewStats, 
    regions, 
    branches, 
    jailOfficers, 
    annexes, 
    dormitories, 
    cells, 
    pdls,
    analytics 
}: Props) {
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({
        regions: 1,
        branches: 1,
        officers: 1,
        annexes: 1,
        dormitories: 1,
        cells: 1,
        pdls: 1,
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
    
    const regionColumns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Region Name' },
        { key: 'status', label: 'Status', render: (value: string) => (
            <Badge variant={value === 'active' ? 'success' : 'secondary'}>{value}</Badge>
        )},
        { key: 'total_branches', label: 'Branches' },
        { key: 'total_jails', label: 'Jails' },
        { key: 'total_dormitories', label: 'Dorms' },
        { key: 'total_cells', label: 'Cells' },
        { key: 'total_pdls', label: 'PDLs' },
    ];

    const branchColumns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Branch Name' },
        { key: 'region.name', label: 'Region' },
        { 
            key: 'jail_warden', 
            label: 'Jail Warden',
            render: (value: { name: string; email: string } | null) => value ? (
                <div>
                    <div className="font-medium">{value.name}</div>
                    <div className="text-xs text-muted-foreground">{value.email}</div>
                </div>
            ) : <span className="text-muted-foreground">Not Assigned</span>
        },
        { key: 'total_jails', label: 'Jails' },
        { key: 'total_dormitories', label: 'Dorms' },
        { key: 'total_annexes', label: 'Annexes' },
        { key: 'total_cells', label: 'Cells' },
        { key: 'total_pdls', label: 'PDLs' },
    ];

    const officerColumns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'branch.name', label: 'Branch' },
        { key: 'branch.region', label: 'Region' },
        { 
            key: 'scopes', 
            label: 'Scope Assignments',
            render: (value: Array<{ scope_type: string; description: string }>) => (
                <div className="space-y-1">
                    {value.map((scope, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                            {scope.description}
                        </Badge>
                    ))}
                </div>
            )
        },
    ];

    const annexColumns = [
        { key: 'name', label: 'Annex Name' },
        { key: 'dormitory.name', label: 'Dormitory' },
        { key: 'dormitory.type', label: 'Type' },
        { key: 'jail.name', label: 'Jail' },
        { key: 'branch.name', label: 'Branch' },
        { key: 'region.name', label: 'Region' },
        { key: 'total_cells', label: 'Cells' },
        { key: 'assigned_officers', label: 'Assigned JOs' },
    ];

    const dormitoryColumns = [
        { key: 'name', label: 'Dormitory Name' },
        { key: 'type', label: 'Type' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'jail.name', label: 'Jail' },
        { key: 'branch.name', label: 'Branch' },
        { key: 'region.name', label: 'Region' },
        { key: 'total_annexes', label: 'Annexes' },
        { key: 'total_cells', label: 'Cells' },
        { key: 'total_pdls', label: 'PDLs' },
    ];

    const cellColumns = [
        { key: 'cell_number', label: 'Cell #' },
        { key: 'floor_number', label: 'Floor' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'annex.name', label: 'Annex' },
        { key: 'dormitory.name', label: 'Dormitory' },
        { key: 'jail.name', label: 'Jail' },
        { key: 'branch.name', label: 'Branch' },
        { key: 'region.name', label: 'Region' },
        { key: 'total_pdls', label: 'PDLs' },
        { key: 'assigned_officers', label: 'Assigned JOs' },
    ];

    const pdlColumns = [
        { key: 'full_name', label: 'Full Name' },
        { key: 'age', label: 'Age' },
        { key: 'gender', label: 'Gender' },
        { key: 'cell.cell_number', label: 'Cell' },
        { key: 'annex.name', label: 'Annex' },
        { key: 'dormitory.name', label: 'Dormitory' },
        { key: 'jail.name', label: 'Jail' },
        { key: 'branch.name', label: 'Branch' },
        { key: 'region.name', label: 'Region' },
    ];

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title="National Office Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    {/* Overview Statistics */}
                    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Regions</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_regions}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Branches</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_branches}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jails</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_jails}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total PDLs</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_pdls}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Dormitories</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_dormitories}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Annexes</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_annexes}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cells</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.total_cells}
                                </p>
                            </div>
                        </Card>
                        <Card>
                            <div className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Sessions</h3>
                                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                    {overviewStats.active_visit_sessions}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Main Modules Tabs */}
                    <Tabs defaultValue="regions" className="space-y-4">
                        <TabsList className="w-full justify-start overflow-x-auto">
                            <TabsTrigger value="regions">Regional Offices</TabsTrigger>
                            <TabsTrigger value="branches">BJMP Branches</TabsTrigger>
                            <TabsTrigger value="officers">Jail Officers</TabsTrigger>
                            <TabsTrigger value="annexes">Annexes</TabsTrigger>
                            <TabsTrigger value="dormitories">Dormitories</TabsTrigger>
                            <TabsTrigger value="cells">Cells</TabsTrigger>
                            <TabsTrigger value="pdls">PDLs</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="regions" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Regional Offices</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Region Name</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Branches</TableHead>
                                                    <TableHead className="text-right">Jails</TableHead>
                                                    <TableHead className="text-right">Dorms</TableHead>
                                                    <TableHead className="text-right">Cells</TableHead>
                                                    <TableHead className="text-right">PDLs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(regions, 'regions').data.map((region) => (
                                                    <TableRow key={region.id}>
                                                        <TableCell className="font-medium">{region.code}</TableCell>
                                                        <TableCell>{region.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={region.status === 'active' ? 'default' : 'secondary'}>
                                                                {region.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">{region.total_branches}</TableCell>
                                                        <TableCell className="text-right">{region.total_jails}</TableCell>
                                                        <TableCell className="text-right">{region.total_dormitories}</TableCell>
                                                        <TableCell className="text-right">{region.total_cells}</TableCell>
                                                        <TableCell className="text-right">{region.total_pdls}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.regions}
                                        totalPages={paginate(regions, 'regions').totalPages}
                                        onPageChange={(page) => handlePageChange('regions', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="branches" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">BJMP Branches</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Branch Name</TableHead>
                                                    <TableHead>Region</TableHead>
                                                    <TableHead>Jail Warden</TableHead>
                                                    <TableHead className="text-right">Jails</TableHead>
                                                    <TableHead className="text-right">Dorms</TableHead>
                                                    <TableHead className="text-right">Annexes</TableHead>
                                                    <TableHead className="text-right">Cells</TableHead>
                                                    <TableHead className="text-right">PDLs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(branches, 'branches').data.map((branch) => (
                                                    <TableRow key={branch.id}>
                                                        <TableCell className="font-medium">{branch.code}</TableCell>
                                                        <TableCell>{branch.name}</TableCell>
                                                        <TableCell>{branch.region.name}</TableCell>
                                                        <TableCell>
                                                            {branch.jail_warden ? (
                                                                <div>
                                                                    <div className="font-medium">{branch.jail_warden.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{branch.jail_warden.email}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">Not Assigned</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">{branch.total_jails}</TableCell>
                                                        <TableCell className="text-right">{branch.total_dormitories}</TableCell>
                                                        <TableCell className="text-right">{branch.total_annexes}</TableCell>
                                                        <TableCell className="text-right">{branch.total_cells}</TableCell>
                                                        <TableCell className="text-right">{branch.total_pdls}</TableCell>
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

                        <TabsContent value="officers" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Jail Officers</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Region</TableHead>
                                                    <TableHead>Scope Assignments</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(jailOfficers, 'officers').data.map((officer) => (
                                                    <TableRow key={officer.id}>
                                                        <TableCell className="font-medium">{officer.name}</TableCell>
                                                        <TableCell>{officer.email}</TableCell>
                                                        <TableCell>{officer.branch?.name || 'Unassigned'}</TableCell>
                                                        <TableCell>{officer.branch?.region || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {officer.scopes.map((scope, idx) => (
                                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                                        {scope.description}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.officers}
                                        totalPages={paginate(jailOfficers, 'officers').totalPages}
                                        onPageChange={(page) => handlePageChange('officers', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="annexes" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Annexes / Buildings</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Annex Name</TableHead>
                                                    <TableHead>Dormitory</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Jail</TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Region</TableHead>
                                                    <TableHead className="text-right">Cells</TableHead>
                                                    <TableHead className="text-right">Assigned JOs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(annexes, 'annexes').data.map((annex) => (
                                                    <TableRow key={annex.id}>
                                                        <TableCell className="font-medium">{annex.name}</TableCell>
                                                        <TableCell>{annex.dormitory.name}</TableCell>
                                                        <TableCell>{annex.dormitory.type}</TableCell>
                                                        <TableCell>{annex.jail.name}</TableCell>
                                                        <TableCell>{annex.branch.name}</TableCell>
                                                        <TableCell>{annex.region.name}</TableCell>
                                                        <TableCell className="text-right">{annex.total_cells}</TableCell>
                                                        <TableCell className="text-right">{annex.assigned_officers}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.annexes}
                                        totalPages={paginate(annexes, 'annexes').totalPages}
                                        onPageChange={(page) => handlePageChange('annexes', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="dormitories" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Dormitories</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Dormitory Name</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Capacity</TableHead>
                                                    <TableHead>Jail</TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Region</TableHead>
                                                    <TableHead className="text-right">Annexes</TableHead>
                                                    <TableHead className="text-right">Cells</TableHead>
                                                    <TableHead className="text-right">PDLs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(dormitories, 'dormitories').data.map((dorm) => (
                                                    <TableRow key={dorm.id}>
                                                        <TableCell className="font-medium">{dorm.name}</TableCell>
                                                        <TableCell>{dorm.type}</TableCell>
                                                        <TableCell className="text-right">{dorm.capacity}</TableCell>
                                                        <TableCell>{dorm.jail.name}</TableCell>
                                                        <TableCell>{dorm.branch.name}</TableCell>
                                                        <TableCell>{dorm.region.name}</TableCell>
                                                        <TableCell className="text-right">{dorm.total_annexes}</TableCell>
                                                        <TableCell className="text-right">{dorm.total_cells}</TableCell>
                                                        <TableCell className="text-right">{dorm.total_pdls}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.dormitories}
                                        totalPages={paginate(dormitories, 'dormitories').totalPages}
                                        onPageChange={(page) => handlePageChange('dormitories', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="cells" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Cells</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cell #</TableHead>
                                                    <TableHead>Floor</TableHead>
                                                    <TableHead>Capacity</TableHead>
                                                    <TableHead>Annex</TableHead>
                                                    <TableHead>Dormitory</TableHead>
                                                    <TableHead>Jail</TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Region</TableHead>
                                                    <TableHead className="text-right">PDLs</TableHead>
                                                    <TableHead className="text-right">Assigned JOs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(cells, 'cells').data.map((cell) => (
                                                    <TableRow key={cell.id}>
                                                        <TableCell className="font-medium">{cell.cell_number}</TableCell>
                                                        <TableCell>{cell.floor_number}</TableCell>
                                                        <TableCell className="text-right">{cell.capacity}</TableCell>
                                                        <TableCell>{cell.annex.name}</TableCell>
                                                        <TableCell>{cell.dormitory.name}</TableCell>
                                                        <TableCell>{cell.jail.name}</TableCell>
                                                        <TableCell>{cell.branch.name}</TableCell>
                                                        <TableCell>{cell.region.name}</TableCell>
                                                        <TableCell className="text-right">{cell.total_pdls}</TableCell>
                                                        <TableCell className="text-right">{cell.assigned_officers}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.cells}
                                        totalPages={paginate(cells, 'cells').totalPages}
                                        onPageChange={(page) => handlePageChange('cells', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="pdls" className="space-y-4">
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Persons Deprived of Liberty</h3>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Full Name</TableHead>
                                                    <TableHead>Age</TableHead>
                                                    <TableHead>Gender</TableHead>
                                                    <TableHead>Cell</TableHead>
                                                    <TableHead>Annex</TableHead>
                                                    <TableHead>Dormitory</TableHead>
                                                    <TableHead>Jail</TableHead>
                                                    <TableHead>Branch</TableHead>
                                                    <TableHead>Region</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginate(pdls, 'pdls').data.map((pdl) => (
                                                    <TableRow key={pdl.id}>
                                                        <TableCell className="font-medium">{pdl.full_name}</TableCell>
                                                        <TableCell>{pdl.age}</TableCell>
                                                        <TableCell>{pdl.gender}</TableCell>
                                                        <TableCell>{pdl.cell.cell_number || 'N/A'}</TableCell>
                                                        <TableCell>{pdl.annex.name || 'N/A'}</TableCell>
                                                        <TableCell>{pdl.dormitory.name || 'N/A'}</TableCell>
                                                        <TableCell>{pdl.jail.name || 'N/A'}</TableCell>
                                                        <TableCell>{pdl.branch.name || 'N/A'}</TableCell>
                                                        <TableCell>{pdl.region.name || 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <PaginationControls 
                                        currentPage={currentPage.pdls}
                                        totalPages={paginate(pdls, 'pdls').totalPages}
                                        onPageChange={(page) => handlePageChange('pdls', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="analytics" className="space-y-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">PDL Count per Branch</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.pdl_per_branch}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#0088FE" name="PDL Count" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Branches per Region</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.branch_per_region}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#00C49F" name="Branches" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Cells per Branch</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.cell_per_branch}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#FFBB28" name="Cells" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Visits per Region</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.visits_per_region}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#8884D8" name="Visits" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Visits per Branch</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={analytics.visits_per_branch}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#82CA9D" name="Visits" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Top 20 Cells by Visits</h3>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={analytics.visits_per_cell} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="name" type="category" width={200} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="count" fill="#FF6B9D" name="Visits" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
