import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    Download,
    Filter,
    Grid3X3,
    Home,
    PieChart,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

declare const route: (name: string, params?: unknown) => string;

type Props = {
    overviewStats: Record<string, number>;
    branch: { id: number; name: string; code: string };
    dormitories: any[];
    jailOfficers: any[];
    facilities: any;
    filters?: Record<string, string | null>;
    stats?: Record<string, number>;
    recent_users?: any[];
    appeals_stats?: Record<string, any>;
    suggestions_stats?: Record<string, number>;
    eburol_stats?: Record<string, number>;
    visit_type_distribution?: Record<string, number>;
    incident_reports_summary?: Record<string, number>;
    flagged_messages_over_time?: Array<{ date: string; count: number }>;
};

function formatNumber(value: unknown) {
    return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

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
                        <div className="text-2xl font-bold text-foreground leading-none">{formatNumber(value)}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {message}
        </div>
    );
}

function MiniBars({ data }: { data: Array<{ label: string; value: number }> }) {
    const max = Math.max(...data.map((item) => item.value), 1);

    return (
        <div className="space-y-3">
            {data.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                            {formatNumber(item.value)}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-foreground"
                            style={{
                                width: `${Math.max((item.value / max) * 100, 4)}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function JailWardenDashboard({
    overviewStats,
    branch,
    dormitories,
    jailOfficers,
    facilities,
    filters = {},
    stats = {},
    recent_users = [],
    appeals_stats = {},
    suggestions_stats = {},
    eburol_stats = {},
    visit_type_distribution = {},
    incident_reports_summary = {},
    flagged_messages_over_time = [],
}: Props) {
    const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
    const [managementSearch, setManagementSearch] = useState('');

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

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.post(route('dashboard.jail-warden.officer-scopes.store'), {
            onSuccess: () => setIsScopeModalOpen(false),
        });
    };

    const filteredOfficers = useMemo(() => {
        const query = managementSearch.trim().toLowerCase();
        if (!query) return jailOfficers;

        return jailOfficers.filter((officer) =>
            JSON.stringify(officer).toLowerCase().includes(query),
        );
    }, [jailOfficers, managementSearch]);

    const dateWindow =
        filters.date_from && filters.date_to
            ? `${filters.date_from} - ${filters.date_to}`
            : 'Current analytics window';



    const visitTypeData = [
        {
            label: 'Physical visits',
            value: Number(visit_type_distribution.physical ?? 0),
        },
        {
            label: 'Virtual visits',
            value: Number(visit_type_distribution.virtual ?? 0),
        },
    ];
    const incidentData = [
        {
            label: 'Minor incidents',
            value: Number(incident_reports_summary.minor ?? 0),
        },
        {
            label: 'Major incidents',
            value: Number(incident_reports_summary.major ?? 0),
        },
        {
            label: 'Critical incidents',
            value: Number(incident_reports_summary.critical ?? 0),
        },
    ];

    return (
        <AppLayout>
            <Head title="Jail Warden Dashboard" />

            <div className="min-h-screen bg-background">
                {/* Page Header */}
                <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-xl">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-foreground leading-none">Jail Warden</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Branch Command & Oversight</p>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => openScopeModal()} className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-1.5 text-sm">
                            <UserCheck className="h-4 w-4" />
                            Assign Scope
                        </Button>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border bg-card p-1 sm:w-fit">
                            <TabsTrigger
                                value="overview"
                                className="rounded-xl"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="rounded-xl">
                                Reports
                            </TabsTrigger>
                            <TabsTrigger
                                value="management"
                                className="rounded-xl"
                            >
                                Management
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard icon={<Home className="w-5 h-5" />} value={overviewStats.total_dormitories} label="Dormitories" accent="bg-primary" iconBg="bg-primary/10" iconColor="text-primary" />
                                <StatCard icon={<Building2 className="w-5 h-5" />} value={overviewStats.total_annexes} label="Annexes" accent="bg-emerald-500" iconBg="bg-emerald-50 dark:bg-emerald-950/30" iconColor="text-emerald-600 dark:text-emerald-400" />
                                <StatCard icon={<Grid3X3 className="w-5 h-5" />} value={overviewStats.total_cells} label="Cells" accent="bg-sky-500" iconBg="bg-sky-50 dark:bg-sky-950/30" iconColor="text-sky-600 dark:text-sky-400" />
                                <StatCard icon={<Users className="w-5 h-5" />} value={overviewStats.total_pdls} label="PDLs" accent="bg-amber-500" iconBg="bg-amber-50 dark:bg-amber-950/30" iconColor="text-amber-600 dark:text-amber-400" />
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle>
                                            Branch activity overview
                                        </CardTitle>
                                        <CardDescription>
                                            Account activity, approvals,
                                            appeals, and feedback within the
                                            selected date window.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {[
                                            {
                                                label: 'Users',
                                                value: stats.total_users ?? 0,
                                                detail: `${stats.pending_users ?? 0} pending`,
                                            },
                                            {
                                                label: 'Appeals',
                                                value: appeals_stats.total ?? 0,
                                                detail: `${appeals_stats.pending ?? 0} pending`,
                                            },
                                            {
                                                label: 'Suggestions',
                                                value:
                                                    suggestions_stats.total ??
                                                    0,
                                                detail: `${suggestions_stats.resolved ?? 0} resolved`,
                                            },
                                            {
                                                label: 'E-Burol',
                                                value: eburol_stats.total ?? 0,
                                                detail: `${eburol_stats.pending ?? 0} pending`,
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-2xl border bg-background p-4"
                                            >
                                                <p className="text-sm text-muted-foreground">
                                                    {item.label}
                                                </p>
                                                <p className="mt-2 text-3xl font-semibold">
                                                    {formatNumber(item.value)}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {item.detail}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle>Recent users</CardTitle>
                                        <CardDescription>
                                            Latest branch account activity.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {recent_users.length > 0 ? (
                                            <div className="space-y-3">
                                                {recent_users
                                                    .slice(0, 6)
                                                    .map((user) => (
                                                        <div
                                                            key={user.id}
                                                            className="rounded-2xl border bg-background p-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {[
                                                                            user.first_name,
                                                                            user.middle_name,
                                                                            user.last_name,
                                                                        ]
                                                                            .filter(
                                                                                Boolean,
                                                                            )
                                                                            .join(
                                                                                ' ',
                                                                            )}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {
                                                                            user.email
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <Badge variant="outline">
                                                                    {String(
                                                                        user.approval_status ??
                                                                            'new',
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <EmptyState message="No recent users in this period" />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="reports" className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <PieChart className="h-4 w-4" />
                                            Visit type distribution
                                        </CardTitle>
                                        <CardDescription>
                                            Filtered by the active branch
                                            analytics window.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <MiniBars data={visitTypeData} />
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Incident reports
                                        </CardTitle>
                                        <CardDescription>
                                            Minor, major, and critical
                                            classifications.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <MiniBars data={incidentData} />
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="shadow-none">
                                <CardHeader>
                                    <CardTitle>
                                        Flagged messages over time
                                    </CardTitle>
                                    <CardDescription>
                                        Daily flagged chat message volume for
                                        the selected window.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {flagged_messages_over_time.length > 0 ? (
                                        <div className="flex h-72 items-end gap-2 rounded-2xl border bg-background p-5">
                                            {flagged_messages_over_time.map(
                                                (item) => {
                                                    const max = Math.max(
                                                        ...flagged_messages_over_time.map(
                                                            (row) => row.count,
                                                        ),
                                                        1,
                                                    );
                                                    return (
                                                        <div
                                                            key={item.date}
                                                            className="flex flex-1 flex-col items-center gap-2"
                                                        >
                                                            <div
                                                                className="w-full rounded-t-xl bg-foreground"
                                                                style={{
                                                                    height: `${Math.max((item.count / max) * 100, 4)}%`,
                                                                }}
                                                            />
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {item.date}
                                                            </span>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    ) : (
                                        <EmptyState message="No flagged message data available" />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="management" className="space-y-6">
                            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="font-semibold">
                                        Facility management
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Search officers and review facility
                                        assignments.
                                    </p>
                                </div>
                                <div className="relative w-full sm:max-w-sm">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={managementSearch}
                                        onChange={(event) =>
                                            setManagementSearch(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Search officers..."
                                        className="h-10 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus:border-foreground/40"
                                    />
                                </div>
                            </div>

                            <Tabs defaultValue="officers" className="space-y-4">
                                <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl border bg-card p-1">
                                    <TabsTrigger
                                        value="officers"
                                        className="rounded-xl"
                                    >
                                        Officers & Scopes
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="dormitories"
                                        className="rounded-xl"
                                    >
                                        Dormitories & Annexes
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="cells"
                                        className="rounded-xl"
                                    >
                                        Cells & PDLs
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="officers">
                                    <Card className="shadow-none">
                                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <CardTitle>
                                                    Jail Officers Management
                                                </CardTitle>
                                                <CardDescription>
                                                    Assign and monitor active
                                                    facility scopes.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={() => openScopeModal()}
                                            >
                                                + Assign Scope
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            Officer
                                                        </TableHead>
                                                        <TableHead>
                                                            Email
                                                        </TableHead>
                                                        <TableHead>
                                                            Assigned Scopes
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            Actions
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredOfficers.map(
                                                        (officer) => (
                                                            <TableRow
                                                                key={officer.id}
                                                            >
                                                                <TableCell className="font-medium">
                                                                    {
                                                                        officer.name
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    {
                                                                        officer.email
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    {officer
                                                                        .scopes
                                                                        ?.length >
                                                                    0 ? (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {officer.scopes.map(
                                                                                (
                                                                                    scope: any,
                                                                                    index: number,
                                                                                ) => (
                                                                                    <Badge
                                                                                        key={
                                                                                            index
                                                                                        }
                                                                                        variant="outline"
                                                                                    >
                                                                                        {
                                                                                            scope.scope_type
                                                                                        }

                                                                                        :{' '}
                                                                                        {scope.description ||
                                                                                            'Scope'}
                                                                                    </Badge>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            No
                                                                            scopes
                                                                            assigned
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            openScopeModal(
                                                                                officer,
                                                                            )
                                                                        }
                                                                    >
                                                                        Assign
                                                                        Scope
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="dormitories">
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {dormitories.map((dorm) => (
                                            <Card
                                                key={dorm.id}
                                                className="shadow-none"
                                            >
                                                <CardHeader>
                                                    <CardTitle>
                                                        {dorm.name}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Type: {dorm.type} ·
                                                        Capacity:{' '}
                                                        {formatNumber(
                                                            dorm.capacity,
                                                        )}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="rounded-2xl border bg-background p-4">
                                                        <p className="text-sm font-medium">
                                                            {dorm.annex?.name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {dorm.annex?.cells
                                                                ?.length ??
                                                                0}{' '}
                                                            cells assigned
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="cells">
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {dormitories.map((dorm) => (
                                            <Card
                                                key={dorm.id}
                                                className="shadow-none"
                                            >
                                                <CardHeader>
                                                    <CardTitle>
                                                        {dorm.name}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {dorm.annex?.name}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {dorm.annex?.cells?.map(
                                                        (cell: any) => (
                                                            <div
                                                                key={cell.id}
                                                                className="rounded-2xl border bg-background p-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="font-medium">
                                                                        Cell{' '}
                                                                        {
                                                                            cell.cell_number
                                                                        }
                                                                    </p>
                                                                    <Badge variant="outline">
                                                                        {
                                                                            cell.current_inmates
                                                                        }
                                                                        /
                                                                        {
                                                                            cell.capacity
                                                                        }
                                                                    </Badge>
                                                                </div>
                                                                {cell.inmates
                                                                    ?.length >
                                                                    0 && (
                                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                                        {cell.inmates
                                                                            .map(
                                                                                (
                                                                                    inmate: any,
                                                                                ) =>
                                                                                    inmate.full_name,
                                                                            )
                                                                            .join(
                                                                                ', ',
                                                                            )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ),
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    </Tabs>

                    <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedOfficer
                                        ? `Assign Scope to ${selectedOfficer.name}`
                                        : 'Assign Scope to Officer'}
                                </DialogTitle>
                                <DialogDescription>
                                    Select the facility scope level and specific facility for this officer.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {!selectedOfficer && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">
                                            Jail Officer
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                            value={
                                                form.data.jail_officer_id
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'jail_officer_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select Officer
                                            </option>
                                            {jailOfficers.map((officer) => (
                                                <option
                                                    key={officer.id}
                                                    value={officer.id}
                                                >
                                                    {officer.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Scope Level
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        value={form.data.scope_type}
                                        onChange={(event) => {
                                            form.setData(
                                                'scope_type',
                                                event.target.value,
                                            );
                                            form.setData('annex_id', '');
                                            form.setData(
                                                'dormitory_id',
                                                '',
                                            );
                                            form.setData('cell_id', '');
                                        }}
                                        required
                                    >
                                        <option value="annex">
                                            Annex Level
                                        </option>
                                        <option value="dormitory">
                                            Dormitory Level
                                        </option>
                                        <option value="cell">
                                            Cell Level
                                        </option>
                                    </select>
                                </div>

                                {form.data.scope_type === 'annex' && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">
                                            Select Annex
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                            value={form.data.annex_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'annex_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select Annex
                                            </option>
                                            {facilities.annexes?.map(
                                                (annex: any) => (
                                                    <option
                                                        key={annex.id}
                                                        value={annex.id}
                                                    >
                                                        {annex.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                )}

                                {form.data.scope_type === 'dormitory' && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">
                                            Select Dormitory
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                            value={form.data.dormitory_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'dormitory_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select Dormitory
                                            </option>
                                            {facilities.dormitories?.map(
                                                (dorm: any) => (
                                                    <option
                                                        key={dorm.id}
                                                        value={dorm.id}
                                                    >
                                                        {dorm.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                )}

                                {form.data.scope_type === 'cell' && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">
                                            Select Cell
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                            value={form.data.cell_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'cell_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select Cell
                                            </option>
                                            {facilities.cells?.map(
                                                (cell: any) => (
                                                    <option
                                                        key={cell.id}
                                                        value={cell.id}
                                                    >
                                                        Cell{' '}
                                                        {cell.cell_number} -{' '}
                                                        {cell.annex?.name} (
                                                        {
                                                            cell.dormitory
                                                                ?.name
                                                        }
                                                        )
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsScopeModalOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="bg-primary hover:bg-primary/90 text-white"
                                    >
                                        Assign Scope
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}

interface LegacyProps {
    overviewStats: any;
    branch: any;
    dormitories: any[];
    jailOfficers: any[];
    facilities: any;
}

function LegacyJailWardenDashboard({
    overviewStats,
    branch,
    dormitories,
    jailOfficers,
    facilities,
}: LegacyProps) {
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

    const handleSubmit = (e: FormEvent) => {
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
        <AppLayout>
            <Head title="Jail Warden Dashboard" />

            <div className="container mx-auto space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Jail Warden Dashboard
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            {branch.name} ({branch.code})
                        </p>
                    </div>
                </div>

                {/* Overview Statistics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.total_dormitories}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Dormitories
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.total_annexes}
                            </div>
                            <div className="text-sm text-muted-foreground">Annexes</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.total_cells}
                            </div>
                            <div className="text-sm text-muted-foreground">Cells</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.total_pdls}
                            </div>
                            <div className="text-sm text-muted-foreground">PDLs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.total_jail_officers}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Jail Officers
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">
                                {overviewStats.active_scopes}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Active Scopes
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="officers" className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="officers">
                            Jail Officers & Scope Assignment
                        </TabsTrigger>
                        <TabsTrigger value="dormitories">
                            Dormitories & Annexes
                        </TabsTrigger>
                        <TabsTrigger value="cells">Cells & PDLs</TabsTrigger>
                    </TabsList>

                    {/* JAIL OFFICERS & SCOPE ASSIGNMENT */}
                    <TabsContent value="officers" className="space-y-4">
                        <Card>
                            <div className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">
                                        Jail Officers Management
                                    </h3>
                                    <Button onClick={() => openScopeModal()}>
                                        + Assign Scope to Officer
                                    </Button>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Officer Name
                                                </TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>
                                                    Assigned Scopes
                                                </TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {jailOfficers.map((officer) => (
                                                <TableRow key={officer.id}>
                                                    <TableCell className="font-medium">
                                                        {officer.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {officer.email}
                                                    </TableCell>
                                                    <TableCell>
                                                        {officer.scopes.length >
                                                        0 ? (
                                                            <div className="space-y-1">
                                                                {officer.scopes.map(
                                                                    (
                                                                        scope: any,
                                                                        idx: number,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                idx
                                                                            }
                                                                            className="flex items-center gap-2"
                                                                        >
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs"
                                                                            >
                                                                                {scope.scope_type ===
                                                                                    'annex' &&
                                                                                    '🏢 Annex'}
                                                                                {scope.scope_type ===
                                                                                    'dormitory' &&
                                                                                    '🛏️ Dormitory'}
                                                                                {scope.scope_type ===
                                                                                    'cell' &&
                                                                                    '📍 Cell'}
                                                                            </Badge>
                                                                            <span className="text-sm">
                                                                                {
                                                                                    scope.description
                                                                                }
                                                                            </span>
                                                                            {scope.is_active && (
                                                                                <Badge
                                                                                    variant="default"
                                                                                    className="text-xs"
                                                                                >
                                                                                    Active
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                No scopes
                                                                assigned
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openScopeModal(
                                                                        officer,
                                                                    )
                                                                }
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
                                <h3 className="mb-4 text-lg font-semibold">
                                    Dormitories & Annexes Overview
                                </h3>
                                <div className="space-y-6">
                                    {dormitories.map((dorm) => (
                                        <div
                                            key={dorm.id}
                                            className="rounded-lg border p-4"
                                        >
                                            <div className="mb-3">
                                                <h4 className="text-xl font-bold">
                                                    {dorm.name}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Type: {dorm.type} |
                                                    Capacity: {dorm.capacity}
                                                </p>
                                            </div>

                                            <div className="ml-4 space-y-2">
                                                <strong className="text-sm">
                                                    Annex:
                                                </strong>
                                                <div className="ml-4 rounded bg-muted p-3">
                                                    <div className="font-medium">
                                                        {dorm.annex.name}
                                                    </div>
                                                    <div className="mt-1 text-sm text-muted-foreground">
                                                        {
                                                            dorm.annex.cells
                                                                .length
                                                        }{' '}
                                                        cells
                                                    </div>
                                                </div>
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
                                <h3 className="mb-4 text-lg font-semibold">
                                    Cells & PDLs Detailed View
                                </h3>
                                <div className="space-y-6">
                                    {dormitories.map((dorm) => (
                                        <div
                                            key={dorm.id}
                                            className="rounded-lg border p-4"
                                        >
                                            <h4 className="mb-2 text-lg font-bold">
                                                {dorm.name}
                                            </h4>
                                            <div className="mt-3 ml-4">
                                                <h5 className="mb-2 font-medium">
                                                    {dorm.annex.name}
                                                </h5>
                                                <div className="ml-4 space-y-2">
                                                    {dorm.annex.cells.map(
                                                        (cell: any) => (
                                                            <div
                                                                key={cell.id}
                                                                className="rounded bg-amber-50 p-3"
                                                            >
                                                                <div className="font-medium">
                                                                    Cell{' '}
                                                                    {
                                                                        cell.cell_number
                                                                    }{' '}
                                                                    (Floor{' '}
                                                                    {
                                                                        cell.floor_number
                                                                    }
                                                                    )
                                                                </div>
                                                                <div className="mt-1 text-sm text-muted-foreground">
                                                                    Capacity:{' '}
                                                                    {
                                                                        cell.current_inmates
                                                                    }
                                                                    /
                                                                    {
                                                                        cell.capacity
                                                                    }{' '}
                                                                    inmates
                                                                </div>
                                                                {cell.inmates
                                                                    .length >
                                                                    0 && (
                                                                    <div className="mt-2 ml-4 text-sm">
                                                                        <strong>
                                                                            Inmates:
                                                                        </strong>
                                                                        <ul className="mt-1 ml-4 list-disc">
                                                                            {cell.inmates.map(
                                                                                (
                                                                                    inmate: any,
                                                                                ) => (
                                                                                    <li
                                                                                        key={
                                                                                            inmate.id
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            inmate.full_name
                                                                                        }

                                                                                        ,{' '}
                                                                                        {
                                                                                            inmate.age
                                                                                        }

                                                                                        ,{' '}
                                                                                        {
                                                                                            inmate.gender
                                                                                        }
                                                                                    </li>
                                                                                ),
                                                                            )}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Scope Assignment Modal */}
                <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedOfficer
                                    ? `Assign Scope to ${selectedOfficer.name}`
                                    : 'Assign Scope to Officer'}
                            </DialogTitle>
                            <DialogDescription>
                                Select the facility scope level and specific facility for this officer.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!selectedOfficer && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Jail Officer
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-border px-3 py-2"
                                        value={form.data.jail_officer_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'jail_officer_id',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Officer
                                        </option>
                                        {jailOfficers.map(
                                            (officer: any) => (
                                                <option
                                                    key={officer.id}
                                                    value={officer.id}
                                                >
                                                    {officer.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Scope Level
                                </label>
                                <select
                                    className="w-full rounded-md border border-border px-3 py-2"
                                    value={form.data.scope_type}
                                    onChange={(e) => {
                                        form.setData(
                                            'scope_type',
                                            e.target.value,
                                        );
                                        form.setData('annex_id', '');
                                        form.setData('dormitory_id', '');
                                        form.setData('cell_id', '');
                                    }}
                                    required
                                >
                                    <option value="annex">
                                        Annex Level
                                    </option>
                                    <option value="dormitory">
                                        Dormitory Level
                                    </option>
                                    <option value="cell">
                                        Cell Level
                                    </option>
                                </select>
                            </div>

                            {form.data.scope_type === 'annex' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Select Annex
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-border px-3 py-2"
                                        value={form.data.annex_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'annex_id',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Annex
                                        </option>
                                        {facilities.annexes.map(
                                            (annex: any) => (
                                                <option
                                                    key={annex.id}
                                                    value={annex.id}
                                                >
                                                    {annex.name} (
                                                    {annex.dormitory.name})
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}

                            {form.data.scope_type === 'dormitory' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Select Dormitory
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-border px-3 py-2"
                                        value={form.data.dormitory_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'dormitory_id',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Dormitory
                                        </option>
                                        {facilities.dormitories.map(
                                            (dorm: any) => (
                                                <option
                                                    key={dorm.id}
                                                    value={dorm.id}
                                                >
                                                    {dorm.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}

                            {form.data.scope_type === 'cell' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Select Cell
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-border px-3 py-2"
                                        value={form.data.cell_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'cell_id',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select Cell
                                        </option>
                                        {facilities.cells.map(
                                            (cell: any) => (
                                                <option
                                                    key={cell.id}
                                                    value={cell.id}
                                                >
                                                    Cell {cell.cell_number}{' '}
                                                    - {cell.annex.name} (
                                                    {cell.dormitory.name})
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setIsScopeModalOpen(false)
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="bg-primary hover:bg-primary/90 text-white"
                                >
                                    Assign Scope
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
