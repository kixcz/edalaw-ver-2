import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';


import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Inmate Tunnels', href: '#' },
];

type TunnelRow = {
    id: number;
    visit_session_id: number;
    tunnel_token: string;
    short_code: string | null;
    tunnel_link: string;
    expires_at: string;
    expires_at_human: string;
    is_used: boolean;
    status: string;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string | null;
    created_at: string;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type Props = {
    tunnels: { data: TunnelRow[]; links: PaginationLink[]; current_page: number; last_page: number; total: number };
    filters: { search?: string; date_from?: string; date_to?: string; status: string };
};

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        valid: 'default',
        used: 'secondary',
        expired: 'destructive',
    };
    return <Badge variant={map[status] ?? 'outline'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export default function MonitoringOfficerInmateTunnels({ tunnels, filters: initialFilters }: Props) {
    const [, copy] = useClipboard();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search ?? '');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from ?? '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to ?? '');
    const [statusFilter, setStatusFilter] = useState(initialFilters.status ?? 'all');

    const columns: ColumnDef<TunnelRow>[] = useMemo(
        () => [
            { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => {
                const d = new Date(row.original.created_at);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            } },
            { accessorKey: 'visit_session_id', header: 'Session ID', cell: ({ row }) => <span className="font-mono text-sm">{row.original.visit_session_id}</span> },
            { accessorKey: 'session_type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.session_type}</span> },
            {
                accessorKey: 'short_code',
                header: 'PDL tunnel code',
                cell: ({ row }) => {
                    const code = row.original.short_code;
                    const link = row.original.tunnel_link ?? '';
                    if (!code && !link) return <span className="text-muted-foreground">—</span>;
                    const display = code ?? (link.length > 45 ? `${link.slice(0, 42)}…` : link);
                    const toCopy = code ?? link;
                    return (
                        <div className="flex items-center gap-2">
                            <code className="font-mono text-sm tracking-wider rounded bg-muted px-1.5 py-0.5" title={link || undefined}>
                                {display}
                            </code>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => copy(toCopy)}
                                title={code ? 'Copy code' : 'Copy link'}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
            { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
            { accessorKey: 'inmate_name', header: 'Inmate', cell: ({ row }) => row.original.inmate_name ?? '—' },
            { accessorKey: 'expires_at', header: 'Expires', cell: ({ row }) => {
                const d = new Date(row.original.expires_at);
                const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                return <div><div className="text-sm">{formatted}</div><div className="text-xs text-muted-foreground">{row.original.expires_at_human}</div></div>;
            } },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        ],
        [copy]
    );

    const handleFilter = () => {
        router.get('/monitoring-officer/inmate-tunnels', {
            search: searchQuery || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, { preserveScroll: true });
    };

    const prevLink = tunnels.links?.find((l) => l.label === '&laquo; Previous');
    const nextLink = tunnels.links?.find((l) => l.label === 'Next &raquo;');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inmate Tunnels" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div>
                    <h1 className="text-2xl font-semibold">Inmate Tunnels</h1>
                    <p className="text-muted-foreground">Inmate join links you have generated for your assigned sessions</p>
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search by token or session ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFilter()} className="pl-9" />
                            </div>
                            <div className="flex flex-col gap-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
                            <div className="flex flex-col gap-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="valid">Valid</SelectItem>
                                    <SelectItem value="used">Used</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleFilter} variant="outline" className="gap-2"><Filter className="h-4 w-4" />Apply</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable columns={columns} data={tunnels.data} enableGlobalFilter={false} />
                        {tunnels.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Page {tunnels.current_page} of {tunnels.last_page} ({tunnels.total} total)</p>
                                <div className="flex gap-2">
                                    {prevLink?.url ? <Button variant="outline" size="sm" asChild><Link href={prevLink.url} preserveScroll>Previous</Link></Button> : <Button variant="outline" size="sm" disabled>Previous</Button>}
                                    {nextLink?.url ? <Button variant="outline" size="sm" asChild><Link href={nextLink.url} preserveScroll>Next</Link></Button> : <Button variant="outline" size="sm" disabled>Next</Button>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
