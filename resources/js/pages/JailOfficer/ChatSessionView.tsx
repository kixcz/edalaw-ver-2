import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, Flag, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface ChatLog {
    id: number;
    sender: string;
    sender_name: string;
    message: string;
    sent_at: string;
    flagged: boolean;
    flag_reason: string | null;
}

interface Session {
    id: number;
    room_id: string;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    status: string;
}

interface Props {
    session: Session;
    chatLogs: ChatLog[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Chat Recordings', href: '/jail-officer/chat-recordings' },
    { title: 'Session Chat', href: '#' },
];

function getSenderBadgeColor(sender: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (sender) {
        case 'visitor':
            return 'default';
        case 'inmate':
            return 'secondary';
        case 'monitor':
            return 'outline';
        default:
            return 'default';
    }
}

function getSenderLabel(sender: string): string {
    switch (sender) {
        case 'visitor':
            return 'Visitor';
        case 'inmate':
        case 'pdl':
            return 'PDL';
        case 'monitor':
            return 'Officer';
        default:
            return sender;
    }
}

export default function ChatSessionView({ session, chatLogs }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Chat Session #${session.id}`} />
            <div className="flex flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/jail-officer/chat-recordings">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Recordings
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold">Chat Session #{session.id}</h1>
                            <p className="text-muted-foreground text-sm">
                                {session.session_type === 'visit' ? 'Visit' : 'E-Burol'} • {session.visitor_name} ↔ {session.inmate_name}
                            </p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={`/jail-officer/chat-recordings/session/${session.room_id}/export`}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Link>
                    </Button>
                </div>

                {/* Session Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Session Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Visitor</p>
                                <p className="font-medium">{session.visitor_name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">PDL</p>
                                <p className="font-medium">{session.inmate_name}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Started</p>
                                <p className="font-medium">{new Date(session.started_at).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Status</p>
                                <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                                    {session.status}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Messages */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="h-4 w-4" />
                            Chat Messages
                            <Badge variant="secondary" className="ml-2">{chatLogs.length}</Badge>
                        </CardTitle>
                        <CardDescription>
                            All messages exchanged during this video session
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {chatLogs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No chat messages recorded for this session.</p>
                            </div>
                        ) : (
                            <div className="h-[500px] pr-4 overflow-y-auto">
                                <div className="space-y-4">
                                    {chatLogs.map((log, index) => (
                                        <div key={log.id}>
                                            {index > 0 && <Separator className="my-4" />}
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant={getSenderBadgeColor(log.sender)} className="text-xs">
                                                            {getSenderLabel(log.sender)}
                                                        </Badge>
                                                        <span className="font-medium text-sm">{log.sender_name}</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            {new Date(log.sent_at).toLocaleString()}
                                                        </span>
                                                        {log.flagged && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                <Flag className="h-3 w-3 mr-1" />
                                                                Flagged
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm pl-0">{log.message}</p>
                                                    {log.flag_reason && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            Reason: {log.flag_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
