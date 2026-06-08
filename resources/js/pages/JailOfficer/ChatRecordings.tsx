import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, Flag, MessageSquare, MoreVertical, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Chat Recordings', href: '/jail-officer/chat-recordings' },
];

type ExportRow = {
    id: number;
    format: string;
    generated_at: string;
    generated_by_name: string | null;
    download_url: string;
};

type Session = {
    id: number;
    room_id: string;
    session_type: string;
    visitor_name: string | null;
    inmate_name: string;
    scheduled_start: string;
    scheduled_end: string;
    duration_seconds: number;
    status: string;
    total_messages: number;
    flagged_count: number;
    csv_download_url: string;
};

type ChatLog = {
    id: number;
    sender: string;
    sender_label: string;
    sender_name: string;
    message: string;
    sent_at: string;
    flagged: boolean;
    flag_reason: string | null;
};

type ChatSessionData = {
    session: {
        id: number;
        room_id: string;
        session_type: string;
        visitor_name: string | null;
        inmate_name: string;
        started_at: string;
        ended_at: string;
        duration_seconds: number;
        status: string;
    };
    chatLogs: ChatLog[];
};

type Props = {
    sessions: Session[];
    filters: { type?: string; has_flagged?: boolean };
};

export default function ChatRecordings({ sessions, filters }: Props) {
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatData, setChatData] = useState<ChatSessionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleViewDetails = async (session: Session) => {
        setSelectedSession(session);
        setIsLoading(true);
        setIsModalOpen(true);
        
        try {
            // Fetch chat logs from API
            const url = `/api/chat-recordings/session/${session.room_id}`;
            console.log('Fetching from:', url);
            const response = await fetch(url);
            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('API Result:', result);
            if (result.success) {
                setChatData(result.data);
                console.log('Chat data set:', result.data.chatLogs.length, 'messages');
            } else {
                console.error('API returned success=false:', result);
            }
        } catch (error) {
            console.error('Failed to load chat logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSession(null);
        setChatData(null);
    };

    const columns: ColumnDef<Session>[] = useMemo(() => [
        { 
            accessorKey: 'room_id', 
            header: 'Room ID', 
            cell: ({ row }) => <code className="text-xs">{row.original.room_id}</code> 
        },
        { accessorKey: 'visitor_name', header: 'Visitor', cell: ({ row }) => row.original.visitor_name ?? '—' },
        { accessorKey: 'inmate_name', header: 'PDL' },
        { 
            accessorKey: 'session_type', 
            header: 'Type', 
            cell: ({ row }) => row.original.session_type === 'visit' ? 'Visit' : 'E-Burol' 
        },
        {
            accessorKey: 'scheduled_start',
            header: 'Started',
            cell: ({ row }) => (
                <span className="text-sm">
                    {new Date(row.original.scheduled_start).toLocaleString()}
                </span>
            ),
        },
        {
            accessorKey: 'duration_seconds',
            header: 'Duration',
            cell: ({ row }) => {
                const seconds = row.original.duration_seconds;
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                
                if (hours > 0) {
                    return `${hours}h ${minutes}m ${secs}s`;
                } else if (minutes > 0) {
                    return `${minutes}m ${secs}s`;
                }
                return `${secs}s`;
            }
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge> },
        { accessorKey: 'total_messages', header: 'Messages', cell: ({ row }) => row.original.total_messages },
        {
            accessorKey: 'flagged_count',
            header: 'Flagged',
            cell: ({ row }) => (
                row.original.flagged_count > 0
                    ? <Badge variant="destructive">{row.original.flagged_count}</Badge>
                    : <span className="text-muted-foreground">0</span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(row.original)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={row.original.csv_download_url}>
                                <Download className="mr-2 h-4 w-4" />
                                Download CSV
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ], []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Recordings" />
            <div className="flex flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Chat Recordings</h1>
                    <p className="text-muted-foreground">Session chat logs, flagged messages, and export files.</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Sessions with chat</CardTitle>
                        <CardDescription>{sessions.length} session(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={sessions}
                            searchKey="chat_search"
                            searchPlaceholder="Search by room ID, visitor, PDL..."
                            initialSorting={[{ id: 'scheduled_start', desc: true }]}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Floating Modal for Chat Details */}
            {isModalOpen && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div 
                        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4 animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                            <div>
                                <h2 className="text-xl font-semibold">Chat Session</h2>
                                <p className="text-sm text-muted-foreground">
                                    Room: <code className="text-xs">{selectedSession.room_id}</code>
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={closeModal} className="h-8 w-8 p-0">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Modal Content - Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 bg-background">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                </div>
                            ) : chatData?.chatLogs && chatData.chatLogs.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                                <TableHead className="w-[150px]">Sender</TableHead>
                                                <TableHead>Message</TableHead>
                                                <TableHead className="w-[100px] text-center">Flagged</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {chatData.chatLogs.map((log) => (
                                                <TableRow key={log.id} className="hover:bg-muted/50">
                                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                                        {log.sent_at ? new Date(log.sent_at).toLocaleString([], { 
                                                            dateStyle: 'short',
                                                            timeStyle: 'short'
                                                        }) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge 
                                                                variant={
                                                                    ['visitor', 'guest'].includes(log.sender.toLowerCase()) ? 'default' :
                                                                    log.sender.toLowerCase() === 'inmate' || log.sender.toLowerCase() === 'pdl' ? 'secondary' :
                                                                    'outline'
                                                                }
                                                                className="text-xs"
                                                            >
                                                                {log.sender_label}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {log.sender_name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-[400px] break-words">
                                                        {log.message}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {log.flagged ? (
                                                            <Badge variant="destructive" className="text-xs">
                                                                <Flag className="h-3 w-3 mr-1" />
                                                                Yes
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="mx-auto h-16 w-16 mb-4 opacity-20" />
                                    <p>No chat messages in this session</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-muted/30 flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                {chatData?.chatLogs?.length || 0} message(s)
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={closeModal}>Close</Button>
                                <Button onClick={() => window.open(selectedSession.csv_download_url, '_blank')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download CSV
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
