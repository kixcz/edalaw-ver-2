import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Monitor, Video } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Session Monitoring',
        href: '/jail-officer/sessions',
    },
];

type Session = {
    id: number;
    session_token: string;
    session_type: 'visit' | 'eburol';
    visitor_name: string;
    visitor_id: number;
    started_at: string;
    duration_seconds: number | null;
    connection_health: Record<string, unknown> | null;
    session_details: {
        type: string;
        inmate_name?: string;
        deceased_name?: string;
        scheduled_date?: string;
        scheduled_time?: string | null;
        wake_start_date?: string;
    } | null;
    monitored_by: number | null;
    monitor_name: string | null;
};

type Props = {
    sessions: Session[];
};

export default function SessionMonitoring({ sessions }: Props) {
    const handleJoinSession = (session: Session) => {
        router.post(`/jail-officer/sessions/${session.id}/join`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Successfully joined session as silent supervisor');
                // Redirect to video supervision page
                router.visit(`/jail-officer/video-supervision/${session.id}`);
            },
            onError: () => {
                toast.error('Failed to join session');
            },
        });
    };

    const columns: ColumnDef<Session>[] = useMemo(() => [
        {
            accessorKey: 'visitor_name',
            header: 'Visitor',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.visitor_name}</div>
            ),
        },
        {
            accessorKey: 'session_type',
            header: 'Session Type',
            cell: ({ row }) => {
                const type = row.original.session_type;
                return (
                    <Badge variant={type === 'visit' ? 'default' : 'secondary'}>
                        {type === 'visit' ? 'Visit' : 'E-Burol'}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'session_details',
            header: 'Details',
            cell: ({ row }) => {
                const details = row.original.session_details;
                if (!details) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                if (details.type === 'visit') {
                    return (
                        <div className="text-sm">
                            <div className="font-medium">PDL: {details.inmate_name}</div>
                            <div className="text-muted-foreground">
                                {details.scheduled_date} {details.scheduled_time && `at ${details.scheduled_time}`}
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="text-sm">
                        <div className="font-medium">Deceased: {details.deceased_name}</div>
                        <div className="text-muted-foreground">PDL: {details.inmate_name}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'started_at',
            header: 'Start Time',
            cell: ({ row }) => (
                <div className="text-sm">{new Date(row.original.started_at).toLocaleString()}</div>
            ),
        },
        {
            accessorKey: 'duration_seconds',
            header: 'Duration',
            cell: ({ row }) => {
                const seconds = row.original.duration_seconds;
                if (!seconds) {
                    return <span className="text-sm text-muted-foreground">-</span>;
                }
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return (
                    <div className="text-sm">
                        {hours > 0 ? `${hours}h ` : ''}
                        {minutes > 0 ? `${minutes}m ` : ''}
                        {secs}s
                    </div>
                );
            },
        },
        {
            accessorKey: 'monitor_name',
            header: 'Monitored By',
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.monitor_name || (
                        <span className="text-muted-foreground">Not assigned</span>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const session = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJoinSession(session)}
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            Join Session
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => router.visit(`/jail-officer/video-supervision/${session.id}`)}
                        >
                            <Video className="mr-2 h-4 w-4" />
                            View
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Session Monitoring" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Session Monitoring</h1>
                        <p className="text-muted-foreground">
                            View and join active virtual visitation and e-burol sessions
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Sessions</CardTitle>
                        <CardDescription>
                            All currently active sessions that can be monitored
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No active sessions found.</p>
                                <p className="text-sm mt-2">Active sessions will appear here.</p>
                            </div>
                        ) : (
                            <DataTable columns={columns} data={sessions} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

