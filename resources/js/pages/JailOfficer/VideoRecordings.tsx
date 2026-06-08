import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

import { DataTable } from '@/components/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Video Recordings', href: '/monitoring/video-recordings' },
];

type Recording = {
    id: number;
    visit_session_id: number;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string;
    duration_seconds: number | null;
    started_at: string | null;
    ended_at: string | null;
    end_reason: string | null;
    recording_url: string | null;
    file_path: string | null;
    storage_disk: string | null;
};

type Props = {
    recordings: Recording[];
    filters: { type?: string; date_from?: string; date_to?: string };
};

function formatDuration(seconds: number | null): string {
    if (seconds == null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoRecordings({ recordings, filters }: Props) {
    const columns: ColumnDef<Recording>[] = useMemo(() => [
        { accessorKey: 'visit_session_id', header: 'Session ID', cell: ({ row }) => `#${row.original.visit_session_id}` },
        { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
        { accessorKey: 'inmate_name', header: 'PDL' },
        { accessorKey: 'session_type', header: 'Type', cell: ({ row }) => row.original.session_type === 'visit' ? 'Visit' : 'E-Burol' },
        { accessorKey: 'duration_seconds', header: 'Duration', cell: ({ row }) => formatDuration(row.original.duration_seconds) },
        {
            accessorKey: 'ended_at',
            header: 'Date',
            cell: ({ row }) => row.original.ended_at ? new Date(row.original.ended_at).toLocaleString() : '—',
        },
        { accessorKey: 'end_reason', header: 'End reason', cell: ({ row }) => row.original.end_reason ?? '—' },
        {
            id: 'actions',
            header: 'View / Download',
            cell: ({ row }) => {
                const r = row.original;
                const hasUrl = !!r.recording_url;
                return (
                    <div className="flex items-center gap-2">
                        {hasUrl && (
                            <>
                                <a
                                    href={r.recording_url!}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View
                                </a>
                                <a
                                    href={r.recording_url!}
                                    download
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <Download className="h-4 w-4" />
                                    Download
                                </a>
                            </>
                        )}
                        {!hasUrl && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                );
            },
        },
    ], []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Video Recordings" />
            <div className="flex flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Video Recordings</h1>
                    <p className="text-muted-foreground">View and download recorded visit and e-burol sessions.</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Recordings</CardTitle>
                        <CardDescription>{recordings.length} recording(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={recordings}
                            searchKey="video_search"
                            searchPlaceholder="Search by session, visitor, PDL..."
                            initialSorting={[{ id: 'ended_at', desc: true }]}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
