import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Head, useForm } from '@inertiajs/react';
import {
    Building2,
    GitBranch,
    BedDouble,
    Grid3X3,
    Users,
    ShieldCheck,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    X,
    Plus,
    Pencil,
    Trash2,
    LayoutGrid,
    List,
    BarChart2,
    MoreVertical,
} from 'lucide-react';

interface Props {
    overviewStats: any;
    branches: any[];
    branchDetails: any[];
}

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, totalItems, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsis = totalPages > 5;
        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
                Page <span className="font-medium text-slate-700">{currentPage}</span> of{' '}
                <span className="font-medium text-slate-700">{totalPages}</span>
                <span className="ml-2 text-slate-400">({totalItems} total)</span>
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs"
                >
                    Previous
                </Button>
                {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className={`h-8 w-8 p-0 text-xs ${page === currentPage ? 'bg-orange-600 hover:bg-orange-700 border-orange-600' : ''}`}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-1 text-slate-400 text-sm">…</span>
                    )
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs"
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

// Collapsible tree node for the detailed view
const DetailNode: React.FC<{ label: string; meta?: string; colorClass: string; children?: React.ReactNode }> = ({
    label, meta, colorClass, children,
}) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="mb-2">
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${colorClass}`}
            >
                {children ? (open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />) : <span className="w-3.5" />}
                <span>{label}</span>
                {meta && <span className="ml-auto text-xs font-normal opacity-60">{meta}</span>}
            </button>
            {open && children && (
                <div className="ml-5 mt-1 border-l-2 border-slate-200 pl-4 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number | string;
    label: string;
    accent: string;
    iconBg: string;
    iconColor: string;
}> = ({
    icon, value, label, accent, iconBg, iconColor,
}) => (
    <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
            <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${accent}`} />
                <div className="flex items-center gap-4 px-5 py-4 flex-1">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function RegionalSupervisorDashboard({ overviewStats, branches, branchDetails }: Props) {
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({ branches: 1 });
    const ITEMS_PER_PAGE = 10;

    const paginate = (data: any[], pageKey: string) => {
        const page = currentPage[pageKey] || 1;
        const start = (page - 1) * ITEMS_PER_PAGE;
        return {
            data: data.slice(start, start + ITEMS_PER_PAGE),
            totalPages: Math.ceil(data.length / ITEMS_PER_PAGE),
            totalItems: data.length,
        };
    };

    const handlePageChange = (key: string, page: number) =>
        setCurrentPage(prev => ({ ...prev, [key]: page }));

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
        form.setData({ code: '', name: '', type: 'provincial', location: '', description: '', status: 'active' });
        setIsBranchModalOpen(true);
    };

    const openEditModal = (branch: any) => {
        setSelectedBranch(branch);
        form.setData({
            code: branch.code, name: branch.name, type: branch.type,
            location: branch.location, description: branch.description || '', status: branch.status,
        });
        setIsBranchModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBranch) {
            form.put(route('dashboard.branches.update', selectedBranch.id), { onSuccess: () => setIsBranchModalOpen(false) });
        } else {
            form.post(route('dashboard.branches.store'), { onSuccess: () => setIsBranchModalOpen(false) });
        }
    };

    const handleDelete = (branch: any) => {
        if (confirm(`Delete branch "${branch.name}"? This action cannot be undone.`)) {
            form.delete(route('dashboard.branches.destroy', branch.id));
        }
    };

    const branchTypeBadgeClass = (type: string) => {
        const map: Record<string, string> = {
            provincial: 'bg-violet-50 text-violet-700 border-violet-200',
            district: 'bg-sky-50 text-sky-700 border-sky-200',
            'sub-provincial': 'bg-amber-50 text-amber-700 border-amber-200',
        };
        return map[type] ?? 'bg-slate-50 text-slate-600 border-slate-200';
    };

    const statusBadgeClass = (status: string) => {
        const map: Record<string, string> = {
            active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            inactive: 'bg-slate-100 text-slate-500 border-slate-200',
            maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
        };
        return map[status] ?? 'bg-slate-100 text-slate-500';
    };

    const paginatedBranches = paginate(branches, 'branches');

    return (
        <AppLayout user={{ first_name: '', last_name: '', middle_name: '', role: { name: 'Regional Supervisor' } }}>
            <Head title="Regional Supervisor Dashboard" />

            <div className="min-h-screen bg-slate-50">
                {/* Page Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-600 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 leading-none">Regional Supervisor</h1>
                                <p className="text-xs text-slate-500 mt-0.5">BJMP Branch Management & Oversight</p>
                            </div>
                        </div>
                        <Button
                            onClick={openCreateModal}
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-1.5 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Branch
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={<GitBranch className="w-5 h-5" />} value={overviewStats.total_branches} label="Total Branches" accent="bg-orange-600" iconBg="bg-orange-50" iconColor="text-orange-600" />
                        <StatCard icon={<Building2 className="w-5 h-5" />} value={overviewStats.total_annexes} label="Total Annexes" accent="bg-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" />
                        <StatCard icon={<BedDouble className="w-5 h-5" />} value={overviewStats.total_dormitories} label="Dormitories" accent="bg-yellow-500" iconBg="bg-yellow-50" iconColor="text-yellow-600" />
                        <StatCard icon={<Grid3X3 className="w-5 h-5" />} value={overviewStats.total_cells} label="Total Cells" accent="bg-orange-700" iconBg="bg-orange-100" iconColor="text-orange-700" />
                        <StatCard icon={<Users className="w-5 h-5" />} value={overviewStats.total_pdls} label="Total PDLs" accent="bg-red-600" iconBg="bg-red-50" iconColor="text-red-600" />
                        <StatCard icon={<ShieldCheck className="w-5 h-5" />} value={overviewStats.total_jail_wardens} label="Jail Wardens" accent="bg-orange-500" iconBg="bg-orange-50" iconColor="text-orange-500" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={overviewStats.active_branches} label="Active Branches" accent="bg-emerald-600" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                    </div>

                    {/* Main Tabs */}
                    <Tabs defaultValue="branches" className="space-y-4">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
                            <TabsTrigger
                                value="branches"
                                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all"
                            >
                                <List className="w-4 h-4" />
                                Branches
                            </TabsTrigger>
                            <TabsTrigger
                                value="detailed"
                                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Hierarchy
                            </TabsTrigger>
                            <TabsTrigger
                                value="analytics"
                                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 gap-2 transition-all"
                            >
                                <BarChart2 className="w-4 h-4" />
                                Analytics
                            </TabsTrigger>
                        </TabsList>

                        {/* BRANCHES TAB */}
                        <TabsContent value="branches">
                            <Card className="border-0 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Branch Management</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{branches.length} branches across the region</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-6">Code</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch Name</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Jail Warden</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Annexes</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Dorms</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Cells</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">PDLs</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-6">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedBranches.data.map((branch) => (
                                                <TableRow key={branch.id} className="hover:bg-slate-50 transition-colors group">
                                                    <TableCell className="pl-6">
                                                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{branch.code}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-slate-800 text-sm">{branch.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${branchTypeBadgeClass(branch.type)}`}>
                                                            {branch.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">{branch.location}</TableCell>
                                                    <TableCell>
                                                        {branch.warden ? (
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-700">{branch.warden.name}</div>
                                                                <div className="text-xs text-slate-400">{branch.warden.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-slate-700">{branch.total_annexes}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-slate-700">{branch.total_dormitories}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium text-slate-700">{branch.total_cells}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-sm font-bold text-slate-800">{branch.total_pdls}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${statusBadgeClass(branch.status)}`}>
                                                            {branch.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        <div className="flex items-center justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-700 transition-colors"
                                                                        aria-label={`Open actions for ${branch.name}`}
                                                                    >
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem
                                                                        onClick={() => openEditModal(branch)}
                                                                        className="gap-2 cursor-pointer text-green-700 focus:text-white focus:bg-green-600 [&_svg]:!text-green-600 focus:[&_svg]:!text-white"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                        <span>Edit</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(branch)}
                                                                        className="gap-2 cursor-pointer text-red-600 focus:text-white focus:bg-red-600 [&_svg]:!text-red-600 focus:[&_svg]:!text-white"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        <span>Delete</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {paginatedBranches.data.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={11} className="text-center py-12 text-slate-400 text-sm">
                                                        No branches found. Add your first branch to get started.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="px-6 pb-4">
                                    <PaginationControls
                                        currentPage={currentPage.branches}
                                        totalPages={paginatedBranches.totalPages}
                                        totalItems={paginatedBranches.totalItems}
                                        onPageChange={(page) => handlePageChange('branches', page)}
                                    />
                                </div>
                            </Card>
                        </TabsContent>

                        {/* HIERARCHY TAB */}
                        <TabsContent value="detailed">
                            <div className="space-y-4">
                                {branchDetails.map((branch) => (
                                    <Card key={branch.id} className="border-0 shadow-sm overflow-hidden">
                                        <div className="bg-orange-600 px-6 py-4 flex items-center gap-3">
                                            <div className="p-1.5 bg-white/20 rounded-lg">
                                                <GitBranch className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{branch.name}</h4>
                                                <span className="text-orange-100 text-xs font-mono">{branch.code}</span>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            {branch.jails.map((jail: any) => (
                                                <DetailNode
                                                    key={jail.code}
                                                    label={`${jail.name} (${jail.code})`}
                                                    colorClass="bg-slate-100 text-slate-700 hover:bg-slate-150"
                                                >
                                                    {jail.annexes.map((annex: any) => (
                                                        <DetailNode
                                                            key={annex.name}
                                                            label={annex.name}
                                                            colorClass="bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                                        >
                                                            {annex.dormitories.map((dorm: any) => (
                                                                <DetailNode
                                                                    key={dorm.name}
                                                                    label={dorm.name}
                                                                    meta={dorm.type}
                                                                    colorClass="bg-sky-50 text-sky-800 hover:bg-sky-100"
                                                                >
                                                                    {dorm.cells.map((cell: any) => (
                                                                        <DetailNode
                                                                            key={cell.cell_number}
                                                                            label={`Cell ${cell.cell_number} — Floor ${cell.floor_number}`}
                                                                            meta={`${cell.current_inmates}/${cell.capacity} inmates`}
                                                                            colorClass="bg-amber-50 text-amber-800 hover:bg-amber-100"
                                                                        >
                                                                            {cell.inmates.length > 0 ? (
                                                                                <div className="ml-2 mt-1 space-y-0.5">
                                                                                    {cell.inmates.map((inmate: any) => (
                                                                                        <div
                                                                                            key={inmate.id}
                                                                                            className="flex items-center gap-2 text-xs text-slate-600 py-1 px-2 bg-white rounded border border-slate-100"
                                                                                        >
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                                                                            <span className="font-medium">{inmate.full_name}</span>
                                                                                            <span className="text-slate-400">·</span>
                                                                                            <span className="text-slate-400">{inmate.age} yrs</span>
                                                                                            <span className="text-slate-400">·</span>
                                                                                            <span className="text-slate-400 capitalize">{inmate.gender}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : undefined}
                                                                        </DetailNode>
                                                                    ))}
                                                                </DetailNode>
                                                            ))}
                                                        </DetailNode>
                                                    ))}
                                                </DetailNode>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                                {branchDetails.length === 0 && (
                                    <Card className="border-0 shadow-sm">
                                        <CardContent className="py-16 text-center text-slate-400 text-sm">
                                            No branch hierarchy data available.
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </TabsContent>

                        {/* ANALYTICS TAB */}
                        <TabsContent value="analytics">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">Branches by Type</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Distribution across branch classifications</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart
                                                data={branches.reduce((acc, branch) => {
                                                    const existing = acc.find((item: any) => item.type === branch.type);
                                                    if (existing) existing.count++;
                                                    else acc.push({ type: branch.type, count: 1 });
                                                    return acc;
                                                }, [] as any[])}
                                                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }}
                                                />
                                                <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm">
                                    <div className="px-6 pt-5 pb-2 border-b border-slate-100">
                                        <h4 className="font-semibold text-slate-800 text-sm">PDL Count by Branch</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Population of persons deprived of liberty</p>
                                    </div>
                                    <CardContent className="p-4 pt-5">
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart
                                                data={branches.map(b => ({ name: b.name, pdls: b.total_pdls }))}
                                                margin={{ top: 5, right: 10, left: -20, bottom: 60 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={-40}
                                                    textAnchor="end"
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    interval={0}
                                                />
                                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', fontSize: 12 }}
                                                />
                                                <Bar dataKey="pdls" fill="#f97316" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Branch Modal */}
            {isBranchModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    {selectedBranch ? <Pencil className="w-4 h-4 text-orange-600" /> : <Plus className="w-4 h-4 text-orange-600" />}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">
                                        {selectedBranch ? 'Edit Branch' : 'New Branch'}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {selectedBranch ? `Editing ${selectedBranch.name}` : 'Add a new BJMP branch to the region'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBranchModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Code</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        placeholder="e.g. BJB-001"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Type</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white"
                                        value={form.data.type}
                                        onChange={(e) => form.setData('type', e.target.value)}
                                        required
                                    >
                                        <option value="provincial">Provincial</option>
                                        <option value="district">District</option>
                                        <option value="sub-provincial">Sub-Provincial</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Branch Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Full branch name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Location</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                                    value={form.data.location}
                                    onChange={(e) => form.setData('location', e.target.value)}
                                    placeholder="City / Municipality"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    rows={2}
                                    placeholder="Brief notes about this branch…"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
                                <div className="flex gap-2">
                                    {['active', 'inactive', 'maintenance'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => form.setData('status', s)}
                                            className={`flex-1 py-2 text-xs font-medium rounded-lg border capitalize transition-all ${
                                                form.data.status === s
                                                    ? statusBadgeClass(s) + ' border-current shadow-sm'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsBranchModalOpen(false)}
                                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                                >
                                    {form.processing ? 'Saving…' : selectedBranch ? 'Save Changes' : 'Create Branch'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
